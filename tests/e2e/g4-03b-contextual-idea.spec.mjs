import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const root = '/Users/alexandrechagasleaocryptoboy/projects/digitap-ia-core-recuperacao-20261124';
const origin = 'http://127.0.0.1:3215';
const supabaseOrigin = 'http://127.0.0.1:56151';
const allowedLocal = new Set([origin, supabaseOrigin, 'http://127.0.0.1:56154']);
const out = process.env.A_PRACA_EVIDENCE_DIR;
const ownMarker = 'G4-03B-PRIVATE-SYNTHETIC-20261123-01';
const foreignMarker = 'G4-03B-FOREIGN-PRIVATE-SYNTHETIC-20261123-01';
const live = process.env.DIGITAP_G4_03B_GATEWAY_REAL === '1';
const callsFile = `${out}/g4-03b-gateway-${live ? "real" : "mock"}.jsonl`;
const fixtures = { users: [], subjects: [], capabilities: [] };
const contexts = [];
const ids = { idea: '', activity: '' };
const proposal = 'Organizar uma oficina gratuita de leitura para o bairro.';
let db;
let admin;
let local;

test.describe.configure({ mode: 'serial' });
test.use({ launchOptions: { chromiumSandbox: true } });

function gatewayCalls() {
  if (!existsSync(callsFile)) return [];
  return readFileSync(callsFile, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}

async function newUser(label, withProfile) {
  const email = `g4-03b-${label}-${randomUUID()}@example.invalid`;
  const password = `${randomUUID()}aA1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('Auth local não criou identidade sintética.');
  const fixture = { id: created.data.user.id, email, password, subjectId: '' };
  fixtures.users.push(fixture);
  if (withProfile) {
    const result = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: fixture.id, p_nome_publico: `Pessoa G4-03B ${label} sintética` });
    if (result.error || typeof result.data !== 'string') throw new Error('RPC local não criou sujeito sintético.');
    fixture.subjectId = result.data;
    fixtures.subjects.push(result.data);
  }
  return fixture;
}

async function localPage(browser) {
  const context = await browser.newContext({ baseURL: origin, serviceWorkers: 'block' });
  contexts.push(context);
  const outside = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.username || url.password) { outside.push('credentialed-url'); return route.abort(); }
    if (allowedLocal.has(url.origin)) return route.continue();
    outside.push('blocked-http');
    return route.abort();
  });
  await context.routeWebSocket('**/*', route => {
    const url = new URL(route.url());
    if (url.origin === 'ws://127.0.0.1:3215' && !url.username && !url.password) return route.connectToServer();
    outside.push('blocked-websocket');
    return route.close();
  });
  const page = await context.newPage();
  page.externalAttempts = outside;
  page.localRequests = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname.startsWith('/api/')) page.localRequests.push(`${url.pathname}${url.search}`);
  });
  return page;
}

async function signIn(page, fixture) {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(`${origin}/`);
}

async function addPrivateCapability(page, fixture, description) {
  const response = await postLocal(page, '/api/e4', {
    headers: { origin },
    data: { action: 'create-capability', subjectId: fixture.subjectId, description, category: 'cultura', conditions: 'Condição sintética do ensaio.' },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.capability.visibility).toBe('privada');
  fixtures.capabilities.push(body.capability.id);
}

function postLocal(page, path, options) {
  const url = new URL(path, origin);
  if (url.origin !== origin || url.username || url.password) throw new Error('Destino HTTP do Playwright fora da origem local.');
  return page.request.post(url.href, { ...options, maxRedirects: 0 });
}

async function chooseContextAndConsent(page, fixture) {
  await page.getByLabel('Usar contexto autorizado').check();
  await expect(page.getByLabel('Sujeito do contexto')).toBeVisible();
  await page.getByLabel('Sujeito do contexto').selectOption(fixture.subjectId);
  await expect(page.getByText(/será enviado a um provedor externo de IA/i)).toBeVisible();
  await page.getByLabel('Autorizo o envio do contexto selecionado ao provedor de IA').check();
}

test.beforeAll(async () => {
  if (process.cwd() !== root || realpathSync(fileURLToPath(new URL('../../', import.meta.url))) !== root
    || (live === (process.env.DIGITAP_G4_03B_GATEWAY_MOCK === '1'))
    || process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1'
    || (!live && process.env.AI_GATEWAY_API_KEY !== 'g4-03b-synthetic-only')
    || process.env.AI_GATEWAY_MODEL !== 'moonshotai/kimi-k2.6'
    || process.env.G4_03B_CONTEXT_MARKER !== ownMarker
    || !/^operations\/evidence\/g4-03b-recovery-[a-zA-Z0-9-]+$/.test(out ?? '')
    || process.env.APP_ORIGIN !== origin
    || process.env.NEXT_PUBLIC_SUPABASE_URL !== supabaseOrigin
    || process.env.NODE_ENV === 'production') throw new Error('G4-03B exige o harness local explícito.');
  process.env.SUPABASE_TELEMETRY_DISABLED = '1';
  try {
    local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', root, '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch { throw new Error('Status Supabase local indisponível; nenhuma fixture criada.'); }
  const api = new URL(local.API_URL);
  const database = new URL(local.DB_URL);
  if (api.href !== `${supabaseOrigin}/` || database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') throw new Error('Destino fora da allowlist loopback G4-03B.');
  if (!existsSync(out) || existsSync(callsFile)) throw new Error('Diretório de evidência G4-03B ausente ou artefato anterior presente.');
  db = new Client({ connectionString: local.DB_URL });
  await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.origin !== supabaseOrigin || url.username || url.password) throw new Error('Cliente Supabase fora da origem local.');
      return fetch(input, { ...init, redirect: 'error' });
    } },
  });
  const staleUsers = await db.query("select count(*)::int n from auth.users where email like 'g4-03b-%@example.invalid'");
  const staleMarkers = await db.query('select count(*)::int n from public.capacidades where descricao=any($1::text[])', [[ownMarker, foreignMarker]]);
  if (staleUsers.rows[0].n !== 0 || staleMarkers.rows[0].n !== 0) throw new Error('Namespace sintética G4-03B já ocupada; nenhum dado preexistente será limpo.');
});

test.afterAll(async () => {
  for (const context of contexts) await context.close();
  if (!db) return;
  try {
    const accountIds = fixtures.users.map(user => user.id);
    const activityIds = (await db.query('select id from public.atividades where criada_por_conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))', [accountIds])).rows.map(row => row.id);
    const ideaIds = (await db.query('select id from public.ideias_privadas where owner_id=any($1::uuid[])', [accountIds])).rows.map(row => row.id);
    await db.query('begin');
    try {
      await db.query("delete from public.eventos_editoriais where (objeto_tipo='atividade' and objeto_id=any($1::uuid[])) or (objeto_tipo='sujeito' and objeto_id=any($2::uuid[]))", [activityIds, fixtures.subjects]);
      await db.query("delete from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=any($1::uuid[])", [activityIds]);
      await db.query('delete from public.atividades where id=any($1::uuid[])', [activityIds]);
      await db.query('delete from public.ideias_privadas where id=any($1::uuid[])', [ideaIds]);
      await db.query('delete from public.capacidades where id=any($1::uuid[])', [fixtures.capabilities]);
      await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])', [fixtures.subjects]);
      await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])', [fixtures.subjects]);
      await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])', [fixtures.subjects]);
      await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])', [accountIds]);
      await db.query('commit');
    } catch (error) { await db.query('rollback'); throw error; }
    for (const user of fixtures.users) {
      const result = await admin.auth.admin.deleteUser(user.id);
      if (result.error) throw new Error('Cleanup Auth G4-03B falhou para ID desta execução.');
    }
    const residual = (await db.query(`select
      (select count(*)::int from auth.users where id=any($1::uuid[])) auth,
      (select count(*)::int from public.sujeitos_publicadores where id=any($2::uuid[])) subjects,
      (select count(*)::int from public.capacidades where id=any($3::uuid[])) capabilities,
      (select count(*)::int from public.ideias_privadas where id=any($4::uuid[])) ideas,
      (select count(*)::int from public.atividades where id=any($5::uuid[])) activities`, [accountIds, fixtures.subjects, fixtures.capabilities, ideaIds, activityIds])).rows[0];
    if (Object.values(residual).some(count => count !== 0)) throw new Error('Cleanup G4-03B deixou fixture sintética residual.');
    if (live) appendFileSync(`${out}/jornada.jsonl`, JSON.stringify({ event: 'cleanup', residual }) + '\n');
  } finally { await db.end(); }
});

test('G4-03B: Tap, contexto E4, revisão humana e atividade privada sem publicação', async ({ browser }) => {
  test.setTimeout(180000);
  const noProfile = await newUser('sem-perfil', false);
  const owner = await newUser('titular', true);
  const outsider = await newUser('terceiro', true);

  // A — authenticated legacy path without an E4 subject lookup.
  const legacyPage = await localPage(browser);
  await signIn(legacyPage, noProfile);
  await legacyPage.goto('/meu-espaco/ideia');
  await legacyPage.getByLabel('Título do rascunho').fill('Ideia G4-03B sem contexto');
  await legacyPage.getByLabel('Sua proposta').fill(proposal);
  await legacyPage.getByRole('button', { name: 'Interpretar proposta', exact: true }).click();
  await expect(legacyPage.getByRole('heading', { name: 'Prévia para revisão humana' })).toBeVisible();
  expect(legacyPage.localRequests.filter(path => path === '/api/e4?action=subjects')).toHaveLength(0);
  expect((await db.query('select count(*)::int n from public.ideias_privadas where owner_id=$1', [noProfile.id])).rows[0].n).toBe(0);

  const ownerPage = await localPage(browser);
  await signIn(ownerPage, owner);
  await addPrivateCapability(ownerPage, owner, ownMarker);
  expect(ownerPage.externalAttempts).toEqual([]);

  const outsiderPage = await localPage(browser);
  await signIn(outsiderPage, outsider);
  await addPrivateCapability(outsiderPage, outsider, foreignMarker);
  expect(outsiderPage.externalAttempts).toEqual([]);

  // B/G — forged foreign subject is denied before any Gateway call.
  const beforeForeign = gatewayCalls().length;
  const foreignResponse = await postLocal(ownerPage, '/api/propostas/interpretar', {
    headers: { origin }, data: { texto: proposal, contexto: { subjectId: outsider.subjectId, consentimento: true } },
  });
  expect(foreignResponse.status()).toBe(403);
  expect(gatewayCalls()).toHaveLength(beforeForeign);

  await ownerPage.goto('/meu-espaco/ideia');
  const subjectsBeforeContext = ownerPage.localRequests.filter(path => path === '/api/e4?action=subjects').length;
  await ownerPage.getByLabel('Título do rascunho').fill('Oficina sintética G4-03B');
  await ownerPage.getByLabel('Sua proposta').fill(proposal);
  await chooseContextAndConsent(ownerPage, owner);
  await ownerPage.getByRole('button', { name: 'Interpretar proposta', exact: true }).click();
  await expect(ownerPage.getByRole('heading', { name: 'Prévia para revisão humana' })).toBeVisible();
  expect(ownerPage.localRequests.filter(path => path === '/api/e4?action=subjects').length).toBe(subjectsBeforeContext + 1);

  // C/D — audit log contains only sanitized assertions, while the real SDK payload was validated by preload.
  let audits = gatewayCalls();
  const legacyAudit = audits.find(call => call.mode === 'ok' && call.contextual === false);
  const contextAudit = audits.find(call => call.mode === 'ok' && call.contextual === true);
  expect(legacyAudit).toMatchObject({ endpoint: '/v4/ai/language-model', model: 'moonshotai/kimi-k2.6', providerPolicy: 'gateway-default', zeroDataRetention: true, disallowPromptTraining: true, tools: false });
  expect(contextAudit).toMatchObject({ hasOwnedMarker: true, hasForeignMarker: false, hasUuid: false, hasForbiddenFields: false });
  expect(contextAudit.contextKeys).toEqual(['capabilities', 'needs', 'projects', 'realizations']);
  expect(contextAudit.capabilityKeys).toEqual(['category', 'conditions', 'createdAt', 'description', 'provenance', 'state', 'updatedAt', 'version', 'visibility']);
  expect(await ownerPage.getByText(ownMarker, { exact: false }).count()).toBe(0);
  expect(await ownerPage.getByText(/^Interpretação não verificada\./).count()).toBe(1);
  await ownerPage.getByLabel('Descrição — Atividades propostas 1').fill('Sugestão revisada pela pessoa, sem confirmação factual.');
  expect(await ownerPage.getByRole('button', { name: /publicar/i }).count()).toBe(0);
  const beforeSave = (await db.query(`select
    (select count(*)::int from public.ideias_privadas where owner_id=$1) ideas,
    (select count(*)::int from public.atividades where criada_por_conta_id in (select id from public.contas_acesso where auth_user_id=$1)) activities`, [owner.id])).rows[0];
  expect(beforeSave).toEqual({ ideas: 0, activities: 0 });

  // E/F — save only by an explicit action, then use the existing conversion journey.
  await ownerPage.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(ownerPage.getByRole('status').filter({ hasText: 'Rascunho privado salvo' })).toBeVisible();
  const saved = (await db.query('select id,owner_id,title,original_interpretation,revised_interpretation from public.ideias_privadas where owner_id=$1', [owner.id])).rows;
  expect(saved).toHaveLength(1);
  ids.idea = saved[0].id;
  expect(saved[0].original_interpretation).toMatchObject({ estado: 'revisao_humana_pendente', verificacao: 'nao_verificada' });
  await ownerPage.getByRole('link', { name: 'Usar esta ideia para criar uma atividade' }).click();
  await expect(ownerPage.getByRole('heading', { name: 'Usar ideia para criar atividade' })).toBeVisible();
  await ownerPage.getByLabel('Título', { exact: true }).fill('Atividade G4-03B — rascunho privado');
  await ownerPage.getByLabel('Descrição', { exact: true }).fill('Plano sintético revisto pela pessoa responsável.');
  await ownerPage.getByLabel('Data e horário (America/Sao_Paulo)', { exact: true }).fill('2026-12-10T18:00');
  await ownerPage.getByLabel('Orientação de acesso', { exact: true }).fill('Acesso a combinar.');
  await ownerPage.getByRole('button', { name: 'Criar rascunho privado a partir desta ideia' }).click();
  await expect(ownerPage).toHaveURL(`${origin}/dashboard/pessoa-fisica`);
  const activity = (await db.query(`select id,estado_editorial,versao_publicada,numero_versao_publicada from public.atividades where criada_por_conta_id in (select id from public.contas_acesso where auth_user_id=$1)`, [owner.id])).rows;
  expect(activity).toHaveLength(1);
  ids.activity = activity[0].id;
  expect(activity[0]).toMatchObject({ estado_editorial: 'rascunho', versao_publicada: null, numero_versao_publicada: null });
  expect((await db.query("select count(*)::int n from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=$1", [ids.activity])).rows[0].n).toBe(0);

  // H — provider failure is sanitized and cannot create another private record or activity.
  const failurePage = ownerPage;
  await failurePage.goto('/meu-espaco/ideia');
  await failurePage.getByLabel('Título do rascunho').fill('Falha sintética G4-03B');
  await failurePage.getByLabel('Sua proposta').fill(`${proposal} G4-03B-GATEWAY-FAIL`);
  await chooseContextAndConsent(failurePage, owner);
  await failurePage.getByRole('button', { name: 'Interpretar proposta', exact: true }).click();
  await expect(failurePage.locator('p[role="alert"]')).toContainText('Não foi possível interpretar agora');
  expect(await failurePage.getByText(/SENSITIVE_PROVIDER_MARKER|g4-03b-synthetic-only|G4-03B-PRIVATE-SYNTHETIC/).count()).toBe(0);
  expect((await db.query(`select
    (select count(*)::int from public.ideias_privadas where owner_id=$1) ideas,
    (select count(*)::int from public.atividades where criada_por_conta_id in (select id from public.contas_acesso where auth_user_id=$1)) activities`, [owner.id])).rows[0]).toEqual({ ideas: 1, activities: 1 });
  expect(gatewayCalls().some(call => call.mode === 'failure' && call.contextual === true)).toBe(true);

  // G — a revoked current holder cannot make a new contextual request.
  const link = (await db.query("select id from public.vinculos_publicadores where sujeito_id=$1 and atual and situacao='ativo' and papel_vinculo='titular'", [owner.subjectId])).rows[0];
  expect(link?.id).toBeTruthy();
  await db.query("update public.vinculos_publicadores set situacao='revogado',revogada_em=clock_timestamp(),atualizada_em=clock_timestamp() where id=$1", [link.id]);
  const beforeRevoked = gatewayCalls().length;
  const revokedResponse = await postLocal(ownerPage, '/api/propostas/interpretar', {
    headers: { origin }, data: { texto: proposal, contexto: { subjectId: owner.subjectId, consentimento: true } },
  });
  expect(revokedResponse.status()).toBe(403);
  expect(gatewayCalls()).toHaveLength(beforeRevoked);
  expect(legacyPage.externalAttempts.concat(ownerPage.externalAttempts, outsiderPage.externalAttempts)).toEqual([]);
});


test('G4-03B: ideia revisada manualmente vira atividade privada sem interpretação antiga', async ({ browser }) => {
  test.setTimeout(180000);
  const owner = await newUser('revisao-manual', true);
  const page = await localPage(browser);
  await signIn(page, owner);

  // Start with a real saved idea and a deterministic, unverified AI suggestion.
  await page.goto('/meu-espaco/ideia');
  await page.getByLabel('Título do rascunho').fill('Oficina sintética a revisar');
  await page.getByLabel('Sua proposta').fill(proposal);
  await page.getByRole('button', { name: 'Interpretar proposta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prévia para revisão humana' })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Rascunho privado salvo' })).toBeVisible();

  const before = (await db.query(
    'select id,version,original_text,original_interpretation from public.ideias_privadas where owner_id=$1',
    [owner.id],
  )).rows;
  expect(before).toHaveLength(1);
  const gatewayCount = gatewayCalls().length;

  // A human replaces the intent. Saving the revision must not call the model.
  await page.getByRole('button', { name: 'Retomar' }).click();
  const revisedText = 'A oficina foi cancelada; agora quero organizar uma feira comunitária.';
  await page.getByLabel('Sua proposta').fill(revisedText);
  await expect(page.getByRole('heading', { name: 'Prévia para revisão humana' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Rascunho privado salvo' })).toBeVisible();

  const revised = (await db.query(
    'select id,version,revised_text,revised_interpretation,original_interpretation from public.ideias_privadas where owner_id=$1',
    [owner.id],
  )).rows;
  expect(revised).toHaveLength(1);
  expect(revised[0].id).toBe(before[0].id);
  expect(revised[0].version).toBe(before[0].version + 1);
  expect(revised[0].revised_text).toBe(revisedText);
  expect(revised[0].revised_interpretation).toBeNull();
  expect(revised[0].original_interpretation).toEqual(before[0].original_interpretation);
  expect(gatewayCalls()).toHaveLength(gatewayCount);

  // The actual browser navigation must not reintroduce obsolete suggestions.
  await page.getByRole('link', { name: 'Usar esta ideia para criar uma atividade' }).click();
  await expect(page.getByRole('heading', { name: 'Usar ideia para criar atividade' })).toBeVisible();
  await expect(page.getByText('Oficina de leitura sugerida', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/texto revisado ainda não possui sugestões atualizadas/i)).toBeVisible();
  await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('');

  const manualDescription = 'Feira comunitária planejada e descrita pela própria pessoa.';
  await page.getByLabel('Título', { exact: true }).fill('Feira comunitária sintética');
  await page.getByLabel('Descrição', { exact: true }).fill(manualDescription);
  await page.getByLabel('Data e horário (America/Sao_Paulo)', { exact: true }).fill('2026-12-10T18:00');
  await page.getByLabel('Orientação de acesso', { exact: true }).fill('Acesso a confirmar.');
  await page.getByRole('button', { name: 'Criar rascunho privado a partir desta ideia' }).click();
  await expect(page).toHaveURL(`${origin}/dashboard/pessoa-fisica`);

  const activities = (await db.query(`select a.id,a.descricao,a.estado_editorial,
    a.versao_publicada,a.numero_versao_publicada
    from public.atividades a join public.contas_acesso c on a.criada_por_conta_id=c.id
    where c.auth_user_id=$1`, [owner.id])).rows;
  expect(activities).toHaveLength(1);
  expect(activities[0]).toMatchObject({
    descricao: manualDescription, estado_editorial: 'rascunho',
    versao_publicada: null, numero_versao_publicada: null,
  });
  expect((await db.query("select count(*)::int n from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=$1", [activities[0].id])).rows[0].n).toBe(0);
  expect(gatewayCalls()).toHaveLength(gatewayCount);
  expect(page.externalAttempts).toEqual([]);
});

test('G5: teclado, consentimento, revisão e retorno de foco após salvar', async ({ browser }) => {
  const owner = await newUser('teclado-g5', true);
  const page = await localPage(browser);
  await signIn(page, owner);
  await page.goto('/dashboard/pessoa-fisica');

  async function tabTo(target) {
    await expect(target).toBeEnabled();
    for (let step = 0; step < 60; step++) {
      if (await target.evaluate(element => element === document.activeElement)) return;
      await page.keyboard.press('Tab');
    }
    await expect(target).toBeFocused();
  }

  const tap = page.getByRole('navigation', { name: 'Taps para participar' }).getByRole('link', { name: 'Organizar uma ideia' });
  await tabTo(tap);
  await expect(tap).toBeFocused();
  await expect(tap).toHaveCSS('outline-style', 'solid');
  await expect(tap).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(origin + '/meu-espaco/ideia');

  const title = page.getByRole('textbox', { name: 'Título do rascunho' });
  const text = page.getByRole('textbox', { name: 'Sua proposta' });
  const context = page.getByRole('checkbox', { name: 'Usar contexto autorizado' });
  await tabTo(title);
  await page.keyboard.insertText('Ideia sintética por teclado');
  await page.keyboard.press('Tab');
  await expect(text).toBeFocused();
  await page.keyboard.insertText(proposal);
  await page.keyboard.press('Tab');
  await expect(context).toBeFocused();
  await page.keyboard.press('Space');

  const selection = page.getByRole('combobox', { name: 'Sujeito do contexto' });
  await tabTo(selection);
  await expect(selection).toHaveAccessibleDescription(/enviado a um provedor externo de IA/);
  // Native type-ahead selects the PF option in Chromium's macOS headless shell.
  await page.keyboard.press('p');
  await expect(selection).toHaveValue(owner.subjectId);
  const consent = page.getByRole('checkbox', { name: /Autorizo o envio do contexto selecionado/ });
  await page.keyboard.press('Tab');
  await expect(consent).toBeFocused();
  const interpret = page.getByRole('button', { name: 'Interpretar proposta' });
  await page.keyboard.press('Tab');
  await expect(interpret).toBeFocused();
  const before = gatewayCalls().length;
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'autorize explicitamente' })).toBeVisible();
  expect(gatewayCalls()).toHaveLength(before);

  await page.keyboard.press('Shift+Tab');
  await expect(consent).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Interpretação não verificada/)).toBeVisible();
  const discard = page.getByRole('button', { name: 'Descartar Atividades propostas 1' });
  await tabTo(discard);
  await page.keyboard.press('Enter');
  const restore = page.getByRole('button', { name: 'Restaurar prévia original' });
  await expect(restore).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Oficina de leitura sugerida', { exact: true })).toBeVisible();

  await tabTo(page.getByRole('button', { name: 'Salvar rascunho' }));
  await page.keyboard.press('Enter');
  const savedStatus = page.getByRole('status').filter({ hasText: 'Rascunho privado salvo' });
  await expect(savedStatus).toBeVisible();

  await tabTo(page.getByRole('button', { name: 'Retomar' }));
  await page.keyboard.press('Enter');
  await tabTo(text);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('Agora vou preparar uma feira comunitária.');
  await tabTo(page.getByRole('button', { name: 'Salvar alterações' }));
  await page.keyboard.press('Enter');
  await expect(savedStatus).toBeFocused();
  await expect(page.getByText('Privada · não verificada · não publicada')).toBeVisible();
  expect(gatewayCalls()).toHaveLength(before + 1);
  expect(page.externalAttempts).toEqual([]);
});


if (live) test('G4-REAL: painel, contexto, interpretação e retomada privada', async ({ browser }) => {
  test.setTimeout(0);
  const log = (event, details = {}) => appendFileSync(`${out}/jornada.jsonl`, JSON.stringify({ event, ...details }) + '\n');
  const owner = await newUser('real-titular', true);
  const page = await localPage(browser);
  await signIn(page, owner);
  await addPrivateCapability(page, owner, ownMarker);
  await page.goto('/dashboard/pessoa-fisica');
  await page.getByRole('navigation', { name: 'Taps para participar' }).getByRole('link', { name: 'Organizar uma ideia' }).click();
  await expect(page).toHaveURL(origin + '/meu-espaco/ideia');
  const title = 'Oficina sintética G4 contextual real';
  const text = 'Quero organizar uma oficina de dança no projeto sintético Raízes. Proponho uma aula no sábado e preciso confirmar o espaço.';
  const review = 'Oficina de dança revisada pela pessoa responsável.';
  await page.getByLabel('Título do rascunho').fill(title);
  await page.getByLabel('Sua proposta').fill(text);
  await chooseContextAndConsent(page, owner);
  log('panel-tap-consent');

  // Check the browser cancellation in isolation, with the request held before it reaches Next.
  const path = '**/api/propostas/interpretar';
  let intercepted;
  let finishHold;
  const received = new Promise(resolve => { intercepted = resolve; });
  const held = new Promise(resolve => { finishHold = resolve; });
  let heldRequest;
  const hold = async route => {
    heldRequest = route.request();
    intercepted();
    await held;
    await route.abort().catch(() => {});
  };
  await page.route(path, hold);
  const submit = page.getByRole('button', { name: 'Interpretar proposta', exact: true });
  await submit.click();
  await received;
  await expect(page.getByRole('status').filter({ hasText: 'Aguarde a interpretação.' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar interpretação' }).click();
  try {
    await expect(page.getByRole('status').filter({ hasText: 'Interpretação cancelada.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Prévia para revisão humana' })).toHaveCount(0);
    expect(gatewayCalls()).toEqual([]);
  } finally {
    finishHold();
    await page.unroute(path, hold);
  }
  log('browser-cancelled-before-egress');

  await expect(page.getByLabel('Autorizo o envio do contexto selecionado ao provedor de IA')).not.toBeChecked();
  await page.getByLabel('Autorizo o envio do contexto selecionado ao provedor de IA').check();
  const responsePromise = page.waitForResponse(response => response.url() === origin + '/api/propostas/interpretar'
    && response.request().method() === 'POST' && response.request() !== heldRequest, { timeout: 0 });
  const started = performance.now();
  await submit.click();
  await expect(page.getByRole('status').filter({ hasText: 'Aguarde a interpretação.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancelar interpretação' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prévia para revisão humana' })).toHaveCount(0);
  log('real-pending-visible');
  const response = await responsePromise;
  log('interpretation-response', { status: response.status(), latencyMs: Math.round(performance.now() - started) });
  expect(response.status()).toBe(200);
  const apiBody = await response.json();
  expect(apiBody.interpretacao).toMatchObject({ estado: 'revisao_humana_pendente', verificacao: 'nao_verificada' });
  await expect(page.getByRole('heading', { name: 'Prévia para revisão humana' })).toBeVisible();
  const audit = gatewayCalls();
  expect(audit).toHaveLength(2);
  expect(audit[0]).toMatchObject({ event: 'reserved', mock: false, contextual: true, hasOwnedMarker: true, hasForeignMarker: false, hasUuid: false, hasForbiddenFields: false, zeroDataRetention: true, disallowPromptTraining: true });
  expect(audit[1]).toMatchObject({ event: 'response', status: 200 });
  expect((await db.query('select count(*)::int n from public.ideias_privadas where owner_id=$1', [owner.id])).rows[0].n).toBe(0);

  await page.getByLabel('Descrição — Atividades propostas 1').fill(review);
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Rascunho privado salvo' })).toBeVisible();
  const saved = (await db.query('select title,version,original_text,original_interpretation,revised_interpretation from public.ideias_privadas where owner_id=$1', [owner.id])).rows;
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ title, version: 1, original_text: text, original_interpretation: apiBody.interpretacao });
  expect(saved[0].revised_interpretation.dados.atividades[0].descricao).toBe(review);

  await page.reload();
  await expect(page.getByText('Privada · não verificada · não publicada')).toBeVisible();
  await page.getByRole('button', { name: 'Retomar' }).click();
  await expect(page.getByLabel('Sua proposta')).toHaveValue(text);
  await expect(page.getByLabel('Descrição — Atividades propostas 1')).toHaveValue(review);
  expect(gatewayCalls()).toEqual(audit);
  expect(page.externalAttempts).toEqual([]);
  log('saved-and-reopened', { private: true, revised: true, gatewaySends: 1, browserBlockedRequests: page.externalAttempts.length });
});
