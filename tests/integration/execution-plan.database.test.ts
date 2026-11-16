import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createActivityService } from '../../src/lib/activities/service.server';

vi.mock('server-only', () => ({}));

type LocalStatus = Record<string, string>;
type Fixture = { authId: string; subjectId: string; accountId: string; email: string; password: string };
type PlanInput = { versao_esperada?: number; recursos: Array<Record<string, unknown>> };
type PlanOperations = {
  createExecutionPlan(activityId: string, input: PlanInput): Promise<{ id: string; activity_id: string; version: number }>;
  getExecutionPlan(activityId: string): Promise<Record<string, unknown>>;
  updateExecutionPlan(activityId: string, input: PlanInput): Promise<{ version: number }>;
};
type PlanService = ReturnType<typeof createActivityService> & PlanOperations;

let db: Client | undefined;
let admin: SupabaseClient | undefined;
let local: LocalStatus;
let first: Fixture;
let second: Fixture;
const fixtureAuthIds = new Set<string>();
let projectId = '';
let activityId = '';
let needId = '';
let planId = '';
let services: { first: PlanService; second: PlanService };
const fixtureSuffix = randomUUID();
const fixtureMarker = `ECO-01 fixture ${fixtureSuffix}`;
const emptyPlan: PlanInput = { recursos: [
  { categoria: 'material', descricao: `${fixtureMarker} material previsto`, quantidade: 2, unidade: 'unidades', valor_previsto_centavos: 1250 },
  { categoria: 'emprestimo', descricao: `${fixtureMarker} empréstimo sem valor`, valor_previsto_centavos: null },
] };

async function transaction<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  if (!db) throw new Error('Fixture ECO-01 PostgreSQL não inicializada.');
  await db.query('begin');
  try { const result = await operation(db); await db.query('commit'); return result; }
  catch (error) { await db.query('rollback'); throw error; }
}

function planService(fixture: Fixture): PlanService {
  const service = createActivityService({
    verifyUser: async () => ({ id: fixture.authId, email_confirmed_at: new Date().toISOString() }),
    transaction,
  });
  return service as PlanService;
}

async function createFixture(index: number, options: { failAfterProfile?: boolean; onAuthId?: (id: string) => void } = {}): Promise<Fixture> {
  if (!admin || !db) throw new Error('Fixture local ECO-01 indisponível.');
  const email = `eco01-${fixtureSuffix}-${index}@example.invalid`;
  const password = `${randomUUID()}aA1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('Não foi possível criar identidade sintética local ECO-01.');
  const authId = created.data.user.id;
  fixtureAuthIds.add(authId);
  options.onAuthId?.(authId);
  const profile = await admin.rpc('criar_pf_com_sujeito', {
    p_auth_user_id: authId,
    p_nome_publico: `${fixtureMarker} pessoa ${index}`,
  });
  if (profile.error || typeof profile.data !== 'string') {
    throw new Error('Não foi possível criar sujeito sintético local ECO-01.');
  }
  if (options.failAfterProfile) throw new Error('Falha sintética após criar perfil para validar limpeza parcial ECO-01.');
  const account = await db.query<{ id: string }>('select id from public.contas_acesso where auth_user_id=$1', [authId]);
  if (!account.rows[0]) throw new Error('Conta de acesso sintética ECO-01 não encontrada.');
  return { authId, subjectId: profile.data, accountId: account.rows[0].id, email, password };
}

async function cleanupFixtures(authIds: string[], records: { activityId?: string; needId?: string; projectId?: string } = {}) {
  if (!db || !admin || authIds.length === 0) return;
  const ids = [...new Set(authIds)];
  let authRows: Array<{ id: string; email: string }> = [];
  await db.query('begin');
  try {
    authRows = (await db.query<{ id: string; email: string }>(
      'select id,email from auth.users where id=any($1::uuid[])', [ids],
    )).rows;
    if (authRows.some(row => !/^eco01-[0-9a-f-]+-\d+@example\.invalid$/i.test(row.email))) {
      throw new Error('Limpeza ECO-01 recusada: identidade fora do namespace sintético autorizado.');
    }
    const accounts = (await db.query<{ id: string }>(
      'select id from public.contas_acesso where auth_user_id=any($1::uuid[])', [ids],
    )).rows.map(row => row.id);
    const subjects = (await db.query<{ id: string; tipo: string; nome_publico: string }>(
      'select id,tipo,nome_publico from public.sujeitos_publicadores where criado_por_conta_id=any($1::uuid[])', [accounts],
    )).rows;
    if (subjects.some(row => row.tipo !== 'pessoa_fisica' || !row.nome_publico.startsWith('ECO-01 fixture '))) {
      throw new Error('Limpeza ECO-01 recusada: sujeito fora do escopo de fixture PF sintética.');
    }
    const subjectIds = subjects.map(row => row.id);

    if (records.activityId) {
      await db.query('delete from public.itens_planejamento_execucao where plano_id in (select id from public.planos_execucao where atividade_id=$1)', [records.activityId]);
      await db.query('delete from public.planos_execucao where atividade_id=$1', [records.activityId]);
      await db.query('delete from public.eventos_editoriais where objeto_tipo=$1 and objeto_id=$2', ['atividade', records.activityId]);
      await db.query('delete from public.atividades where id=$1 and criada_por_conta_id=any($2::uuid[])', [records.activityId, accounts]);
    }
    if (records.needId) {
      await db.query('delete from public.interesses_necessidade where necessidade_id=$1', [records.needId]);
      await db.query('delete from public.necessidades_projeto where id=$1', [records.needId]);
    }
    if (records.projectId) {
      await db.query('delete from public.vinculos_colaboracao where projeto_id=$1', [records.projectId]);
      await db.query('delete from public.projetos where id=$1 and sujeito_id=any($2::uuid[])', [records.projectId, subjectIds]);
    }
    if (subjectIds.length) {
      await db.query('delete from public.interesses_necessidade where criado_por_conta_id=any($1::uuid[])', [accounts]);
      await db.query('delete from public.vinculos_colaboracao where sujeito_id=any($1::uuid[])', [subjectIds]);
      await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[]) and conta_id=any($2::uuid[])', [subjectIds, accounts]);
      await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[]) and conta_id=any($2::uuid[])', [subjectIds, accounts]);
      // The deferred subtype trigger must see both subtype and parent removed at commit.
      await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[]) and criado_por_conta_id=any($2::uuid[])', [subjectIds, accounts]);
    }
    if (accounts.length) await db.query('delete from public.contas_acesso where id=any($1::uuid[])', [accounts]);
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
  for (const row of authRows) {
    const removed = await admin.auth.admin.deleteUser(row.id);
    if (removed.error) throw new Error('Limpeza Auth da fixture sintética ECO-01 incompleta.');
    fixtureAuthIds.delete(row.id);
  }
}

async function expectFixtureAbsent(authId: string) {
  if (!db) throw new Error('Conexão local ECO-01 indisponível.');
  const result = await db.query<{ auth_users: number; accounts: number; subjects: number }>(
    `select (select count(*)::int from auth.users where id=$1) auth_users,
      (select count(*)::int from public.contas_acesso where auth_user_id=$1) accounts,
      (select count(*)::int from public.sujeitos_publicadores s join public.contas_acesso c on c.id=s.criado_por_conta_id where c.auth_user_id=$1) subjects`,
    [authId],
  );
  expect(result.rows[0]).toEqual({ auth_users: 0, accounts: 0, subjects: 0 });
}

async function asDatabaseIdentity<T>(authId: string, operation: () => Promise<T>): Promise<T> {
  if (!db) throw new Error('Conexão local ECO-01 indisponível.');
  await db.query('begin');
  try {
    await db.query('set local role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [authId]);
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: authId, role: 'authenticated' })]);
    const result = await operation();
    await db.query('commit');
    return result;
  } catch (error) { await db.query('rollback'); throw error; }
}

describe('ECO-01 — persistência, autorização e privacidade (PostgreSQL local)', () => {
  beforeAll(async () => {
    if (process.env.ECO01_ALLOW_FIXTURE_CLEANUP !== '1') {
      throw new Error('Execução ECO-01 exige ECO01_ALLOW_FIXTURE_CLEANUP=1 e autorização para fixtures locais.');
    }
    local = JSON.parse(execFileSync('./node_modules/.bin/supabase', [
      'status', '--workdir', process.cwd(), '--output', 'json',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as LocalStatus;
    const api = new URL(local.API_URL);
    const database = new URL(local.DB_URL);
    if (api.origin !== 'http://127.0.0.1:56151' || !['postgres:', 'postgresql:'].includes(database.protocol) ||
        database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') {
      throw new Error('Destino ECO-01 rejeitado: somente Supabase local em 127.0.0.1:56151/56152 é permitido.');
    }
    db = new Client({ connectionString: local.DB_URL });
    await db.connect();
    admin = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    first = await createFixture(1);
    second = await createFixture(2);

    const profile = (fixture: Fixture) => createActivityService({
      verifyUser: async () => ({ id: fixture.authId, email_confirmed_at: new Date().toISOString() }),
      transaction,
    });
    const project = await db.query<{ id: string }>(
      'insert into public.projetos(sujeito_id,titulo,descricao,ano) values($1,$2,$3,2026) returning id',
      [first.subjectId, `${fixtureMarker} projeto`, 'Projeto sintético ECO-01.'],
    );
    projectId = project.rows[0].id;
    await db.query(
      "insert into public.vinculos_colaboracao(sujeito_id,projeto_id,papel,status,origem) values($1,$2,'colaborador','ativo','convite')",
      [second.subjectId, projectId],
    );
    const activity = await profile(first).create({
      projeto_id: projectId,
      titulo: `${fixtureMarker} atividade`,
      descricao: 'Atividade sintética para testar planejamento privado de recursos.',
      inicio_previsto: '2035-04-12T18:30:00.000Z',
      orientacao_acesso: 'Apenas dado sintético de teste.',
      referencia_oficial: null,
    });
    activityId = activity.id;

    const need = await db.query<{ id: string }>(
      "insert into public.necessidades_projeto(projeto_id,criado_por_conta_id,descricao,categorias,visibilidade) values($1,$2,$3,array['cultura'],'visivel') returning id",
      [projectId, first.accountId, `${fixtureMarker} necessidade`],
    );
    needId = need.rows[0].id;
    await db.query(
      `insert into public.interesses_necessidade(necessidade_id,sujeito_id,criado_por_conta_id,owner_auth_user_id,request_id,request_hash)
       values($1,$2,$3,$4,$5,$6)`,
      [needId, second.subjectId, second.accountId, second.authId, randomUUID(), createHash('sha256').update(fixtureMarker).digest('hex')],
    );
    services = { first: planService(first), second: planService(second) };
  }, 30000);

  afterAll(async () => {
    try {
      await cleanupFixtures([...fixtureAuthIds], { activityId, needId, projectId });
    } finally {
      if (db) await db.end();
    }
  }, 30000);

  it('persiste plano privado ligado à atividade e o recupera numa nova requisição autenticada', async () => {
    let partialAuthId = '';
    await expect(createFixture(3, {
      failAfterProfile: true,
      onAuthId: id => { partialAuthId = id; },
    })).rejects.toThrow('Falha sintética após criar perfil');
    expect(partialAuthId).toBeTruthy();
    await cleanupFixtures([partialAuthId]);
    await expectFixtureAbsent(partialAuthId);

    const created = await services.first.createExecutionPlan(activityId, emptyPlan);
    planId = created.id;
    expect(created.activity_id).toBe(activityId);
    expect(created.version).toBe(1);
    const reauthenticatedRequest = planService(first);
    await expect(reauthenticatedRequest.getExecutionPlan(activityId)).resolves.toMatchObject({ id: created.id, version: 1 });
  });

  it('nega leitura e alteração por outra identidade apesar de colaboração e interesse', async () => {
    const created = planId ? await services.first.getExecutionPlan(activityId) : await services.first.createExecutionPlan(activityId, emptyPlan);
    planId ||= created.id;
    await expect(services.second.getExecutionPlan(activityId)).rejects.toMatchObject({ status: 404 });
    await expect(services.second.updateExecutionPlan(activityId, {
      versao_esperada: 1,
      recursos: [{ categoria: 'material', descricao: `${fixtureMarker} tentativa válida sem autorização`, valor_previsto_centavos: 0 }],
    })).rejects.toMatchObject({ status: 404 });
  });

  it('aplica RLS e privilégios mínimos às tabelas de cabeçalho e itens', async () => {
    const tables = ['planos_execucao', 'itens_planejamento_execucao'];
    const result = await db!.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `select c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`, [tables],
    );
    expect(result.rows.map(row => row.relname)).toEqual([...tables].sort());
    for (const row of result.rows) { expect(row.relrowsecurity).toBe(true); expect(row.relforcerowsecurity).toBe(true); }
    for (const table of tables) {
      for (const role of ['anon', 'authenticated']) {
       const grants = await db!.query<{ can_select: boolean; can_insert: boolean; can_update: boolean; can_delete: boolean }>(
        `select has_table_privilege($1,$2,'select') as can_select,has_table_privilege($1,$2,'insert') as can_insert,
         has_table_privilege($1,$2,'update') as can_update,has_table_privilege($1,$2,'delete') as can_delete`, [role, `public.${table}`],
       );
       expect(Object.values(grants.rows[0])).toEqual([false, false, false, false]);
      }
      const serviceGrants = await db!.query<{ can_select: boolean; can_insert: boolean; can_update: boolean; can_delete: boolean }>(
        `select has_table_privilege('service_role',$1,'select') as can_select,has_table_privilege('service_role',$1,'insert') as can_insert,
         has_table_privilege('service_role',$1,'update') as can_update,has_table_privilege('service_role',$1,'delete') as can_delete`, [`public.${table}`],
      );
      expect(Object.values(serviceGrants.rows[0])).toEqual([true, true, true, true]);
    }
    await asDatabaseIdentity(second.authId, async () => {
      await expect(db!.query('select id from public.planos_execucao where atividade_id=$1', [activityId]))
        .rejects.toMatchObject({ code: '42501' });
    });
  });

  it('rejeita versão obsoleta e mantém custo previsto como inteiro em centavos seguro', async () => {
    const created = planId ? await services.first.getExecutionPlan(activityId) : await services.first.createExecutionPlan(activityId, emptyPlan);
    planId ||= created.id;
    const updated = await services.first.updateExecutionPlan(activityId, { versao_esperada: 1, recursos: emptyPlan.recursos });
    expect(updated.version).toBe(2);
    await expect(services.first.updateExecutionPlan(activityId, { versao_esperada: 1, recursos: emptyPlan.recursos })).rejects.toMatchObject({ status: 409 });
    const materialCost = await db!.query<{ valor_previsto_centavos: string | null }>(
      'select valor_previsto_centavos::text from public.itens_planejamento_execucao where plano_id=$1 and descricao=$2',
      [planId, `${fixtureMarker} material previsto`],
    );
    expect(materialCost.rows).toHaveLength(1);
    expect(Number(materialCost.rows[0].valor_previsto_centavos)).toBe(1250);
    const loan = await db!.query<{ valor_previsto_centavos: string | null }>(
      'select valor_previsto_centavos::text from public.itens_planejamento_execucao where plano_id=$1 and descricao=$2',
      [planId, `${fixtureMarker} empréstimo sem valor`],
    );
    expect(loan.rows).toHaveLength(1);
    expect(loan.rows[0].valor_previsto_centavos).toBeNull();
    await expect(services.first.updateExecutionPlan(activityId, { versao_esperada: 2, recursos: [
      { descricao: fixtureMarker, valor_previsto_centavos: -1 },
    ] })).rejects.toBeTruthy();
  });

  it('não converte plano em despesa ou pagamento nem altera atividade ou fluxo editorial', async () => {
    const before = await db!.query(
      `select a.estado_editorial,a.versao_submetida,a.versao_publicada,
       (select count(*)::int from public.eventos_editoriais e where e.objeto_tipo='atividade' and e.objeto_id=a.id) as eventos
       from public.atividades a where a.id=$1`, [activityId],
    );
    const created = planId ? await services.first.getExecutionPlan(activityId) : await services.first.createExecutionPlan(activityId, emptyPlan);
    planId ||= created.id;
    const stored = await services.first.getExecutionPlan(activityId);
    expect(stored).toMatchObject({ estado: 'privado' });
    expect(stored).not.toHaveProperty('despesa_centavos');
    expect(stored).not.toHaveProperty('pagamento_centavos');
    const after = await db!.query(
      `select a.estado_editorial,a.versao_submetida,a.versao_publicada,
       (select count(*)::int from public.eventos_editoriais e where e.objeto_tipo='atividade' and e.objeto_id=a.id) as eventos
       from public.atividades a where a.id=$1`, [activityId],
    );
    expect(after.rows).toEqual(before.rows);
  });
});
