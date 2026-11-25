import { test, expect, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const origin = 'http://127.0.0.1:3215';
const supabaseOrigin = 'http://127.0.0.1:56151';
test.use({ ...devices['iPhone 13'], defaultBrowserType: 'chromium', actionTimeout: 15000, launchOptions: { chromiumSandbox: true } });

test('QA-02 mobile: acesso beta e continuidade da revisão privada', async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const id = process.env.AI_BETA_AUTH_USER_ID;
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1' || process.env.DIGITAP_G4_03B_GATEWAY_MOCK !== '1' ||
    process.env.AI_GATEWAY_API_KEY !== 'g4-03b-synthetic-only' ||
    !/^[0-9a-f-]{36}$/.test(id ?? '')) throw new Error('QA-02 exige fixture Auth local e Gateway simulado.');
  const env = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const dbUrl = new URL(env.DB_URL);
  if (env.API_URL !== supabaseOrigin || dbUrl.hostname !== '127.0.0.1' || dbUrl.port !== '56152' || dbUrl.pathname !== '/postgres') {
    throw new Error('QA-02 exige Supabase exclusivamente local.');
  }
  const db = new Client(env.DB_URL);
  const admin = createClient(supabaseOrigin, env.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const fixtures = [];
  const observations = [];
  const network = [];
  const pageErrors = [];
  const consoleDiagnostics = [];
  const capture = async (name, locator) => {
    const image = await locator.screenshot({ path: testInfo.outputPath(name + '.png') });
    await testInfo.attach(name, { body: image, contentType: 'image/png' });
  };
  const privateSession = async (label, fixtureId) => {
    const email = 'qa-02-' + randomUUID() + '@example.invalid';
    const password = randomUUID() + 'aA1!';
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, ...(fixtureId ? { id: fixtureId } : {}) });
    expect(created.error).toBeNull();
    const actor = { id: created.data.user.id, subject: null, email, password };
    fixtures.push(actor);
    const profile = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: actor.id, p_nome_publico: 'PF QA sintética ' + label });
    expect(profile.error).toBeNull();
    actor.subject = profile.data;
    return actor;
  };
  const isolate = async context => context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const signIn = async (p, fixture) => {
    await p.goto('/login');
    await p.getByLabel('E-mail', { exact: true }).fill(fixture.email);
    await p.getByLabel('Senha', { exact: true }).fill(fixture.password);
    await p.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(p).toHaveURL(origin + '/');
  };
  await db.connect();
  let other;
  try {
    const own = await privateSession('titular', id);
    const unrelated = await privateSession('terceira');
    await isolate(page.context());
    page.on('pageerror', e => pageErrors.push(e.name));
    page.on('console', e => {
      if (e.type() === 'error' && e.text().includes('Encountered two children with the same key')) consoleDiagnostics.push('duplicate-react-key');
    });
    page.on('response', res => {
      const path = new URL(res.url()).pathname;
      if (['/api/e4','/api/propostas/interpretar','/api/ideias'].includes(path)) network.push({ path, method: res.request().method(), status: res.status() });
    });
    await signIn(page, own);
    await page.goto('/meu-espaco/ideia');
    const proposal = page.getByLabel('Sua proposta');
    const ideaText = 'Organizar uma oficina gratuita de leitura para a vizinhança.';
    await page.getByLabel('Título do rascunho').fill('Roda de leitura QA');
    await proposal.fill(ideaText);
    await page.getByLabel('Usar contexto autorizado').check();
    await page.getByLabel('Sujeito do contexto').selectOption(own.subject);
    await page.getByLabel('Autorizo o envio do contexto selecionado ao provedor de IA').check();
    await page.getByRole('button', { name: 'Interpretar proposta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Prévia para revisão humana' })).toBeVisible();
    await page.getByLabel('Descrição — Atividades propostas 1').fill('Roda de leitura revisada pela titular.');
    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Rascunho privado salvo' })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Retomar', exact: true }).click();
    await expect(proposal).toHaveValue(ideaText);
    await page.getByRole('button', { name: 'Consultar decisões' }).click();
    const editor = page.getByRole('region', { name: 'Decisões da ideia' });
    await editor.getByLabel('Chave da decisão').fill('formato');
    await editor.getByLabel('Estado da decisão').selectOption('DEFINIDO');
    await editor.getByLabel('Descrição da decisão').fill('Presencial, decidido pela titular.');
    await editor.getByRole('button', { name: 'Confirmar decisão', exact: true }).click();
    await expect(editor.getByRole('status')).toContainText('Decisão privada confirmada.');
    const revised = 'Organizar uma oficina de leitura em dois encontros, após revisão humana.';
    await proposal.fill(revised);
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Rascunho privado salvo' })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Retomar', exact: true }).click();
    await expect(proposal).toHaveValue(revised);
    await page.getByRole('button', { name: 'Consultar decisões' }).click();
    await expect(editor).toContainText('Presencial, decidido pela titular.');
    await capture('decisao-preservada', editor);
    observations.push({ checkpoint: 'authorized-preview-save-revise-reload', humanDecisionPreserved: true });
    other = await browser.newContext({ ...devices['iPhone 13'] });
    await isolate(other);
    const otherPage = await other.newPage();
    await signIn(otherPage, unrelated);
    await otherPage.goto('/meu-espaco/ideia');
    await expect(otherPage.getByText('A interpretação com IA é reservada às contas autorizadas no beta.', { exact: false })).toBeVisible();
    await expect(otherPage.getByRole('button', { name: 'Interpretar proposta', exact: true })).toHaveCount(0);
    await expect(otherPage.getByLabel('Usar contexto autorizado')).toHaveCount(0);
    await expect(otherPage.getByLabel('Sua proposta')).toHaveCount(0);
    await expect(otherPage.getByText('Roda de leitura QA', { exact: true })).toHaveCount(0);
    const response = await otherPage.request.post(origin + '/api/propostas/interpretar', {
      data: { texto: 'Teste sintético da sessão PF comum.' }, headers: { origin }, maxRedirects: 0,
    });
    expect(response.status()).toBe(403);
    expect((await response.json()).fields).toEqual({ interpretationAccess: 'beta' });
    const manual = otherPage.getByRole('link', { name: 'Preparar uma atividade manualmente' });
    await capture('percurso-manual', manual.locator('../..'));
    await manual.click();
    await expect(otherPage).toHaveURL(origin + '/dashboard/pessoa-fisica/nova');
    await otherPage.getByLabel('Título', { exact: true }).fill('Atividade privada sem assistência QA');
    await otherPage.getByLabel('Descrição', { exact: true }).fill('Rascunho sintético manual.');
    const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }).format(new Date(Date.now() + 3 * 86400000)).replace(' ', 'T');
    await otherPage.getByLabel('Data e horário (America/Sao_Paulo)', { exact: true }).fill(date);
    await otherPage.getByLabel('Orientação de acesso', { exact: true }).fill('Acesso a combinar.');
    await otherPage.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    const savedTitle = otherPage.getByRole('heading', { name: 'Atividade privada sem assistência QA', exact: true });
    await expect(savedTitle).toBeVisible();
    await otherPage.reload();
    await expect(savedTitle).toBeVisible();
    expect((await db.query('select estado_editorial,versao_publicada from public.atividades where sujeito_id=$1', [unrelated.subject])).rows).toEqual([{ estado_editorial: 'rascunho', versao_publicada: null }]);
    observations.push({ checkpoint: 'off-beta-manual-activity', interpretationHidden: true, contextHidden: true, authorizationStatus: response.status(), reloadPrivateDraft: true });
    expect(pageErrors).toEqual([]);
    expect(consoleDiagnostics).toEqual([]);
  } finally {
    try {
      await other?.close();
      for (const f of fixtures) {
        await db.query('begin');
        try {
          await db.query("delete from public.eventos_editoriais where objeto_id=$1 or (objeto_tipo='atividade' and objeto_id in (select id from public.atividades where sujeito_id=$1))", [f.subject]);
          await db.query('delete from public.atividades where sujeito_id=$1', [f.subject]);
          await db.query('delete from public.ideias_privadas where owner_id=$1', [f.id]);
          await db.query('delete from public.capacidades where sujeito_id=$1', [f.subject]);
          await db.query('delete from public.vinculos_publicadores where sujeito_id=$1', [f.subject]);
          await db.query('delete from public.pessoas_fisicas where sujeito_id=$1', [f.subject]);
          await db.query('delete from public.sujeitos_publicadores where id=$1', [f.subject]);
          await db.query('delete from public.contas_acesso where auth_user_id=$1', [f.id]);
          await db.query('commit');
        } catch (error) { await db.query('rollback'); throw error; }
        expect((await admin.auth.admin.deleteUser(f.id)).error).toBeNull();
        expect((await db.query('select exists(select 1 from auth.users where id=$1) as residual', [f.id])).rows[0].residual).toBe(false);
      }
      observations.push({ checkpoint: 'cleanup', fixtures: fixtures.length });
    } finally {
      await db.end();
      await testInfo.attach('observacoes-sanitizadas', { body: JSON.stringify({ observations, network, pageErrors, consoleDiagnostics }, null, 2), contentType: 'application/json' });
    }
  }
});
