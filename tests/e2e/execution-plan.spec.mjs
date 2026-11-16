import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const origin = 'http://127.0.0.1:3215';
const evidenceDir = process.env.A_PRACA_EVIDENCE_DIR ?? 'operations/evidence/eco01-entrega-vertical-20261116';
const fixtures = [];
let db;
let admin;
let local;
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') throw new Error('Fixtures ECO-01 locais não autorizadas.');
  local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', process.cwd(), '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const api = new URL(local.API_URL);
  const database = new URL(local.DB_URL);
  if (api.origin !== 'http://127.0.0.1:56151' || database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') throw new Error('Destino E2E ECO-01 não local.');
  db = new Client({ connectionString: local.DB_URL });
  await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
});

test.afterAll(async () => {
  try {
    if (!db || !admin || fixtures.length === 0) return;
    const authIds = fixtures.map(fixture => fixture.authId).filter(Boolean);
    if (authIds.length === 0) return;
    const auth = await db.query('select id,email from auth.users where id=any($1::uuid[])', [authIds]);
    if (auth.rows.length !== authIds.length || auth.rows.some(row => !/^eco01-ui-[0-9a-f-]+@example[.]invalid$/i.test(row.email))) throw new Error('Limpeza E2E ECO-01 recusada fora das identidades sintéticas desta execução.');
    await db.query('begin');
    try {
      await db.query('set constraints all deferred');
      const accounts = (await db.query('select id from public.contas_acesso where auth_user_id=any($1::uuid[])', [authIds])).rows.map(row => row.id);
      const subjectRows = (await db.query('select id,tipo,nome_publico from public.sujeitos_publicadores where criado_por_conta_id=any($1::uuid[])', [accounts])).rows;
      if (subjectRows.some(row => row.tipo !== 'pessoa_fisica' || !row.nome_publico.startsWith('ECO-01 interface fixture '))) throw new Error('Limpeza E2E ECO-01 recusada: sujeito fora do namespace sintético.');
      const subjects = subjectRows.map(row => row.id);
      const activityRows = (await db.query('select id,titulo from public.atividades where criada_por_conta_id=any($1::uuid[])', [accounts])).rows;
      if (activityRows.some(row => !row.titulo.startsWith('ECO-01 interface fixture '))) throw new Error('Limpeza E2E ECO-01 recusada: atividade fora do namespace sintético.');
      const activities = activityRows.map(row => row.id);
      await db.query('delete from public.itens_planejamento_execucao where plano_id in (select id from public.planos_execucao where atividade_id=any($1::uuid[]))', [activities]);
      await db.query('delete from public.planos_execucao where atividade_id=any($1::uuid[])', [activities]);
      await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])", [activities]);
      await db.query('delete from public.atividades where id=any($1::uuid[]) and criada_por_conta_id=any($2::uuid[])', [activities, accounts]);
      await db.query('delete from public.vinculos_colaboracao where sujeito_id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[]) and conta_id=any($2::uuid[])', [subjects, accounts]);
      await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[]) and conta_id=any($2::uuid[])', [subjects, accounts]);
      await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[]) and criado_por_conta_id=any($2::uuid[])', [subjects, accounts]);
      await db.query('delete from public.contas_acesso where id=any($1::uuid[]) and auth_user_id=any($2::uuid[])', [accounts, authIds]);
      await db.query('commit');
    } catch (error) {
      await db.query('rollback');
      throw error;
    }
    for (const fixture of fixtures) {
      const removed = await admin.auth.admin.deleteUser(fixture.authId);
      if (removed.error) throw new Error('Limpeza E2E ECO-01 Auth incompleta.');
      await fixture.context?.close();
    }
  } finally {
    await db?.end();
  }
});

async function createFixture(browser, index) {
  const suffix = randomUUID();
  const fixture = {
    email: `eco01-ui-${suffix}@example.invalid`,
    password: `${randomUUID()}aA1!`,
    name: `ECO-01 interface fixture ${suffix}`,
    context: null,
    page: null,
    authId: null,
    activityId: null,
    activityTitle: `ECO-01 interface fixture ${index} ${suffix}`,
  };
  fixtures.push(fixture);
  const created = await admin.auth.admin.createUser({ email: fixture.email, password: fixture.password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('Falha ao preparar identidade fictícia local ECO-01.');
  fixture.authId = created.data.user.id;
  const profile = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: fixture.authId, p_nome_publico: fixture.name });
  if (profile.error || typeof profile.data !== 'string') throw new Error('Falha ao preparar perfil fictício local ECO-01.');
  fixture.subjectId = profile.data;
  fixture.accountId = (await db.query('select id from public.contas_acesso where auth_user_id=$1', [fixture.authId])).rows[0]?.id;
  if (!fixture.accountId) throw new Error('Conta fictícia local ECO-01 ausente.');
  fixture.context = await browser.newContext({ baseURL: origin });
  await fixture.context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' && ['3215', '56151'].includes(url.port) ? route.continue() : route.abort();
  });
  fixture.page = await fixture.context.newPage();
  return fixture;
}

async function login(fixture) {
  await fixture.page.goto('/login');
  await fixture.page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await fixture.page.getByLabel('Senha', { exact: true }).fill(fixture.password);
  await fixture.page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(fixture.page).toHaveURL(origin + '/');
}

async function createActivity(fixture) {
  const response = await fixture.page.request.post('/api/atividades', {
    headers: { origin },
    data: {
      titulo: fixture.activityTitle,
      descricao: 'Atividade fictícia para validar planejamento privado de recursos.',
      inicio_previsto: new Date(Date.now() + 10 * 86400000).toISOString(),
      orientacao_acesso: 'Acesso fictício, sem compromisso de participação.',
      referencia_oficial: null,
    },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  fixture.activityId = body.atividade.id;
  await fixture.page.goto(`/dashboard/atividade/${fixture.activityId}`);
  await expect(fixture.page.getByRole('region', { name: 'Planejamento privado de recursos e custos previstos' })).toBeVisible();
}

async function createPlan(fixture, description, amount) {
  await fixture.page.getByLabel('Descrição do recurso', { exact: true }).fill(description);
  if (amount !== undefined) await fixture.page.getByLabel('Valor previsto (R$)', { exact: true }).fill(amount);
  await fixture.page.getByRole('button', { name: 'Salvar planejamento', exact: true }).click();
  await expect(fixture.page.getByRole('status').filter({ hasText: 'Planejamento privado salvo.' })).toBeVisible();
}

test('ECO-01 E2E: criar, reabrir, atualizar, isolar e preservar como privado entre duas identidades', async ({ browser }) => {
  const owner = await createFixture(browser, 1);
  await login(owner);
  await createActivity(owner);
  await owner.page.getByLabel('Descrição do recurso', { exact: true }).fill('Papel reciclado sintético');
  await owner.page.getByLabel('Valor previsto (R$)', { exact: true }).fill('12,50');
  await owner.page.getByRole('button', { name: 'Adicionar recurso' }).click();
  await owner.page.getByLabel('Descrição do recurso (linha 2)').fill('Mesas emprestadas sintéticas');
  await expect(owner.page.getByText('Total previsto: R$ 12,50')).toBeVisible();
  await owner.page.getByRole('button', { name: 'Salvar planejamento', exact: true }).click();
  await expect(owner.page.getByRole('status').filter({ hasText: 'Planejamento privado salvo.' })).toBeVisible();

  const state = await db.query(`select a.estado_editorial,a.versao_submetida,a.numero_versao_publicada,p.versao,p.total_previsto_centavos::text total,count(i.id)::int item_count,
    max(i.valor_previsto_centavos) filter(where i.descricao='Papel reciclado sintético')::text material_cents,
    max(i.valor_previsto_centavos) filter(where i.descricao='Mesas emprestadas sintéticas')::text loan_cents
    from public.atividades a join public.planos_execucao p on p.atividade_id=a.id left join public.itens_planejamento_execucao i on i.plano_id=p.id
    where a.id=$1 and a.criada_por_conta_id=$2 group by a.id,p.id`, [owner.activityId, owner.accountId]);
  expect(state.rows).toEqual([{ estado_editorial: 'rascunho', versao_submetida: 1, numero_versao_publicada: null, versao: 1, total: '1250', item_count: 2, material_cents: '1250', loan_cents: null }]);
  const screenshotPath = `${evidenceDir}/plano-privado.png`;
  if (existsSync(screenshotPath)) throw new Error('Screenshot ECO-01 já existe; não sobrescrever evidência anterior.');
  await owner.page.screenshot({ path: screenshotPath, fullPage: true });

  await owner.page.getByRole('banner').getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(owner.page).toHaveURL(origin + '/login');
  await login(owner);
  await owner.page.goto(`/dashboard/atividade/${owner.activityId}`);
  await expect(owner.page.getByLabel('Descrição do recurso', { exact: true })).toHaveValue('Papel reciclado sintético');
  await expect(owner.page.getByLabel('Valor previsto (R$)', { exact: true })).toHaveValue('12,50');

  const other = await createFixture(browser, 2);
  await login(other);
  const forbiddenRead = await other.page.request.get(`/api/atividades/${owner.activityId}/planejamento`);
  expect(forbiddenRead.status()).toBe(404);
  expect(forbiddenRead.headers()['cache-control']).toContain('no-store');
  const forbiddenCreate = await other.page.request.post(`/api/atividades/${owner.activityId}/planejamento`, {
    headers: { origin }, data: { recursos: [{ descricao: 'Não deve persistir', valor_previsto_centavos: 1 }] },
  });
  expect(forbiddenCreate.status()).toBe(404);
  const forbiddenUpdate = await other.page.request.patch(`/api/atividades/${owner.activityId}/planejamento`, {
    headers: { origin }, data: { versao_esperada: 1, recursos: [{ descricao: 'Não deve substituir', valor_previsto_centavos: 1 }] },
  });
  expect(forbiddenUpdate.status()).toBe(404);
  const csrf = await other.page.request.post(`/api/atividades/${owner.activityId}/planejamento`, {
    headers: { origin: 'https://evil.invalid' }, data: { recursos: [{ descricao: 'CSRF negado' }] },
  });
  expect(csrf.status()).toBe(403);

  await createActivity(other);
  await createPlan(other, 'Sementes sintéticas do segundo perfil', '3,25');
  const ownPlan = await other.page.request.get(`/api/atividades/${other.activityId}/planejamento`);
  expect(ownPlan.status()).toBe(200);
  expect((await ownPlan.json()).plano.total_previsto_centavos).toBe(325);
  const retry = await owner.page.request.patch(`/api/atividades/${owner.activityId}/planejamento`, {
    headers: { origin }, data: { versao_esperada: 1, recursos: [{ descricao: 'Atualização concorrente', valor_previsto_centavos: 1500 }] },
  });
  expect(retry.status()).toBe(200);
  const stale = await owner.page.request.patch(`/api/atividades/${owner.activityId}/planejamento`, {
    headers: { origin }, data: { versao_esperada: 1, recursos: [{ descricao: 'Versão obsoleta', valor_previsto_centavos: 2000 }] },
  });
  expect(stale.status()).toBe(409);
  const current = await owner.page.request.get(`/api/atividades/${owner.activityId}/planejamento`);
  expect((await current.json()).plano).toMatchObject({ version: 2, total_previsto_centavos: 1500 });

  const publicRead = await owner.page.request.get(`/api/public/atividades/${owner.activityId}/planejamento`);
  expect(publicRead.status()).toBe(404);
  const editorial = await db.query('select estado_editorial,numero_versao_publicada from public.atividades where id=any($1::uuid[])', [[owner.activityId, other.activityId]]);
  expect(editorial.rows).toEqual([
    { estado_editorial: 'rascunho', numero_versao_publicada: null },
    { estado_editorial: 'rascunho', numero_versao_publicada: null },
  ]);
});
