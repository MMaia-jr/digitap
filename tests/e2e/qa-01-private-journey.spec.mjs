import { test, expect, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const origin = 'http://127.0.0.1:3215';
const supabaseOrigin = 'http://127.0.0.1:56151';
const mockCapability = 'G4-03B-PRIVATE-SYNTHETIC-20261123-01';
test.use({ ...devices['iPhone 13'], defaultBrowserType: 'chromium', actionTimeout: 15000, launchOptions: { chromiumSandbox: true } });

test('QA-01 mobile: declaração, ideia assistida e continuidade privada', async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const id = process.env.AI_BETA_AUTH_USER_ID;
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1' || process.env.DIGITAP_G4_03B_GATEWAY_MOCK !== '1' ||
    process.env.AI_GATEWAY_API_KEY !== 'g4-03b-synthetic-only' ||
    !/^[0-9a-f-]{36}$/.test(id ?? '')) throw new Error('QA-01 exige fixture Auth local e Gateway simulado.');
  const env = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const dbUrl = new URL(env.DB_URL);
  if (env.API_URL !== supabaseOrigin || dbUrl.hostname !== '127.0.0.1' || dbUrl.port !== '56152' || dbUrl.pathname !== '/postgres') {
    throw new Error('QA-01 exige Supabase exclusivamente local.');
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
    const email = 'qa-01-' + randomUUID() + '@example.invalid';
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
    await page.goto('/dashboard/pessoa-fisica');
    const tabs = page.getByRole('navigation', { name: 'Taps para participar' });
    await expect(tabs.getByRole('link')).toHaveCount(7);
    const renderedTaps = await tabs.getByRole('link').evaluateAll(links => links.map(link => [
      document.getElementById(link.getAttribute('aria-labelledby'))?.textContent ?? link.textContent,
      link.getAttribute('href'),
    ]));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await tabs.getByRole('link').first().focus();
    await page.keyboard.press('Tab');
    const capTap = tabs.getByRole('link', { name: 'Apresentar minhas capacidades' });
    await expect(capTap).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Minhas capacidades' })).toBeVisible();
    await expect(page.getByText('Nenhuma capacidade registrada.')).toBeVisible();
    observations.push({ checkpoint: 'mobile-pf-taps', renderedTaps, keyboardActivation: true, horizontalOverflow: false });
    const description = page.getByLabel('Descrição', { exact: true });
    const conditions = page.getByLabel('Condições de colaboração');
    await description.fill('Produção inválida <teste>');
    await page.getByRole('button', { name: 'Salvar capacidade privada' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(description).toHaveValue('Produção inválida <teste>');
    await description.fill(mockCapability);
    await conditions.fill('Mediação em português.\nTerça-feira, conforme a inscrição.');
    await page.getByRole('button', { name: 'Salvar capacidade privada' }).click();
    await expect(page.getByRole('status')).toContainText('Capacidade salva');
    const capacity = page.getByRole('article').filter({ hasText: mockCapability });
    await expect(capacity).toContainText('Privada');
    await page.reload();
    await expect(capacity).toContainText('Terça-feira');
    await capacity.getByRole('button', { name: 'Editar' }).click();
    await conditions.fill('Circulação de ações.\nCondições da edição em português.');
    await page.getByRole('button', { name: 'Salvar capacidade', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Capacidade salva');
    await page.reload();
    await expect(capacity).toContainText('Condições da edição em português.');
    other = await browser.newContext({ ...devices['iPhone 13'] });
    await isolate(other);
    const otherPage = await other.newPage();
    await signIn(otherPage, unrelated);
    await otherPage.goto('/meu-espaco/capacidades');
    await expect(otherPage.getByText('Nenhuma capacidade registrada.')).toBeVisible();
    const denied = await otherPage.request.get(origin + '/api/e4?action=capabilities&subject_id=' + own.subject, { maxRedirects: 0 });
    expect(denied.status()).toBe(403);
    const stored = await db.query('select condicoes,visibilidade from public.capacidades where sujeito_id=$1', [own.subject]);
    expect(stored.rows).toEqual([{ condicoes: 'Circulação de ações.\nCondições da edição em português.', visibilidade: 'privada' }]);
    observations.push({ checkpoint: 'cap-create-edit-reload', invalidStayed: true, foreignStatus: denied.status(), private: true });
    await capture('capacidade-privada', capacity);
    await page.goto('/dashboard/pessoa-fisica');
    await tabs.getByRole('link', { name: 'Organizar uma ideia' }).click();
    await expect(page).toHaveURL(origin + '/meu-espaco/ideia');
    await page.getByLabel('Título do rascunho').fill('Roda de leitura QA');
    const proposal = page.getByLabel('Sua proposta');
    const ideaText = 'Organizar uma oficina gratuita de leitura para a vizinhança.';
    await proposal.fill(ideaText);
    await page.getByLabel('Usar contexto autorizado').check();
    await expect(page.getByText(/provedor externo de IA/i)).toBeVisible();
    await page.getByLabel('Sujeito do contexto').selectOption(own.subject);
    const consent = page.getByLabel('Autorizo o envio do contexto selecionado ao provedor de IA');
    await consent.check();
    const interpret = page.getByRole('button', { name: 'Interpretar proposta', exact: true });
    let ingress;
    const entered = new Promise(resolve => { ingress = resolve; });
    // Hold a mock HTTP request until the cancel affordance is exercised. Never send it.
    let release;
    const released = new Promise(resolve => { release = resolve; });
    const held = async route => { ingress(); await released; await route.abort().catch(() => {}); };
    await page.route('**/api/propostas/interpretar', held);
    try {
      await interpret.click();
      await entered;
      await expect(page.getByRole('status').filter({ hasText: 'Aguarde a interpretação.' })).toBeVisible();
      await page.getByRole('button', { name: /cancelar/i }).click();
      await expect(proposal).toHaveValue(ideaText);
      await expect(page.getByRole('heading', { name: 'Prévia para revisão humana' })).toHaveCount(0);
    } finally {
      release();
      await page.unroute('**/api/propostas/interpretar', held);
    }
    const failure = ideaText + ' G4-03B-GATEWAY-FAIL';
    await proposal.fill(failure);
    await consent.check();
    const failed = page.waitForResponse(r => r.url() === origin + '/api/propostas/interpretar' && r.status() === 503);
    await interpret.click();
    await failed;
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível interpretar agora' })).toBeVisible();
    await expect(proposal).toHaveValue(failure);
    await proposal.fill(ideaText);
    await consent.check();
    await interpret.click();
    await expect(page.getByRole('heading', { name: 'Prévia para revisão humana' })).toBeVisible();
    await page.getByLabel('Descrição — Atividades propostas 1').fill('Roda de leitura revisada pela titular.');
    await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Rascunho privado salvo' })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Roda de leitura QA', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Retomar', exact: true }).click();
    await page.getByRole('button', { name: 'Consultar decisões' }).click();
    const editor = page.getByRole('region', { name: 'Decisões da ideia' });
    await editor.getByLabel('Chave da decisão').fill('formato');
    await editor.getByLabel('Estado da decisão').selectOption('DEFINIDO');
    await editor.getByLabel('Descrição da decisão').fill('Presencial, decidido pela titular.');
    await editor.getByRole('button', { name: 'Confirmar decisão', exact: true }).click();
    await expect(editor.getByRole('status')).toContainText('Decisão privada confirmada.');
    await page.reload();
    await page.getByRole('button', { name: 'Retomar', exact: true }).click();
    await page.getByRole('button', { name: 'Consultar decisões' }).click();
    await expect(editor).toContainText('Presencial, decidido pela titular.');
    observations.push({ checkpoint: 'idea-mock', processing: true, cancel: true, errorPreservedText: true, humanDecisionReload: true });
    await capture('decisao-privada', editor);
    await page.getByRole('link', { name: 'Usar esta ideia para criar uma atividade' }).click();
    await page.getByLabel('Título', { exact: true }).fill('Atividade privada QA');
    await page.getByLabel('Descrição', { exact: true }).fill('Rascunho sintético.');
    const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }).format(new Date(Date.now() + 3 * 86400000)).replace(' ', 'T');
    await page.getByLabel('Data e horário (America/Sao_Paulo)', { exact: true }).fill(date);
    await page.getByLabel('Orientação de acesso', { exact: true }).fill('Acesso a combinar.');
    await page.getByRole('button', { name: 'Criar rascunho privado a partir desta ideia' }).click();
    await expect(page.getByRole('heading', { name: 'Atividade privada QA', exact: true })).toBeVisible();
    await expect(tabs.getByRole('link')).toHaveCount(8);
    await tabs.getByRole('link', { name: 'Acompanhar compromissos e evidências' }).click();
    await page.getByRole('link', { name: 'Acompanhar Atividade privada QA', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Decisões na origem da atividade' })).toContainText('Presencial, decidido pela titular.');
    const activity = await db.query('select estado_editorial,versao_publicada from public.atividades where sujeito_id=$1', [own.subject]);
    expect(activity.rows).toEqual([{ estado_editorial: 'rascunho', versao_publicada: null }]);
    observations.push({ checkpoint: 'idea-conversion', visibility: 'private', decisionSnapshot: true });
    await page.goto('/meu-espaco/capacidades');
    await capacity.getByRole('button', { name: 'Arquivar' }).click();
    await expect(page.getByRole('status')).toContainText('Capacidade arquivada');
    await page.reload();
    await expect(capacity).toContainText('Arquivada');
    expect((await db.query('select estado,visibilidade from public.capacidades where sujeito_id=$1', [own.subject])).rows).toEqual([{ estado: 'arquivada', visibilidade: 'privada' }]);
    observations.push({ checkpoint: 'cap-archive-reload', state: 'arquivada', private: true });
    const shortcuts = [];
    for (const [label, href] of renderedTaps.filter(([label]) =>
      !['Apresentar minhas capacidades', 'Organizar uma ideia', 'Acompanhar compromissos e evidências'].includes(label))) {
      await page.goto('/dashboard/pessoa-fisica');
      await tabs.getByRole('link', { name: label, exact: true }).click();
      await page.waitForURL(url => url.href !== origin + '/dashboard/pessoa-fisica');
      const location = new URL(page.url());
      const target = location.hash ? page.locator(location.hash) : page.getByRole('heading', { level: 1 }).first();
      await expect(target).toBeVisible();
      shortcuts.push({ label, href, destination: location.pathname + location.hash, heading: await target.getByRole('heading').first().textContent({ timeout: 500 }).catch(() => target.textContent()) });
    }
    observations.push({ checkpoint: 'mobile-tap-destinations', shortcuts });
    expect(pageErrors).toEqual([]);
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
