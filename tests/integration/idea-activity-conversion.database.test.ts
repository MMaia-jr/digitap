import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createIdeasService } from '../../src/lib/ideas/service.server';
import { createActivityService } from '../../src/lib/activities/service.server';
import { closeDatabasePool, withTransaction, type Sql } from '../../src/lib/database.server';
import { createPublicQueries } from '../../src/lib/queries/public.server';

vi.mock('server-only', () => ({}));

let db: Client;
let admin: SupabaseClient;
const userIds: string[] = [];
const subjectIds: string[] = [];
const activityIds: string[] = [];
const services: ReturnType<typeof createActivityService>[] = [];
const ideas = createIdeasService();
const publicQueries = createPublicQueries();
const emailPrefix = 'e3-conversion-';
const source = `E3 fixture ${randomUUID()}: relato original de uma oficina comunitária.`;
const interpretation = {
  estado: 'revisao_humana_pendente' as const,
  verificacao: 'nao_verificada' as const,
  dados: { sujeitos: [], projetos: [], atividades: [{ descricao: 'Oficina comunitária', trecho: 'oficina comunitária' }], capacidades: [], relacoes: [], fontes: [], informacoes_nao_verificadas: [] },
};
const activityInput = () => ({
  titulo: `Atividade derivada ${randomUUID()}`,
  descricao: 'Descrição confirmada pela pessoa para um rascunho privado.',
  inicio_previsto: new Date(Date.now() + 4 * 86400000).toISOString(),
  orientacao_acesso: 'Informação de acesso a ser confirmada.',
  referencia_oficial: null,
});
const command = (overrides: Record<string, unknown> = {}) => ({ ...activityInput(), versao_esperada: 1, pedido_id: randomUUID(), ...overrides });

async function cleanupFixtures(ids: string[]) {
  if (!ids.length) return;
  await db.query('begin');
  try {
    const accounts = (await db.query<{ id: string }>('select id from public.contas_acesso where auth_user_id=any($1::uuid[])', [ids])).rows.map(row => row.id);
    const activityIds = (await db.query<{ id: string }>('select id from public.atividades where criada_por_conta_id=any($1::uuid[])', [accounts])).rows.map(row => row.id);
    const subjects = (await db.query<{ id: string }>('select id from public.sujeitos_publicadores where criado_por_conta_id=any($1::uuid[])', [accounts])).rows.map(row => row.id);
    await db.query('delete from public.eventos_editoriais where objeto_id=any($1::uuid[]) or objeto_id=any($2::uuid[])', [activityIds, subjects]);
    await db.query("delete from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=any($1::uuid[])", [activityIds]);
    await db.query('delete from public.atividades where id=any($1::uuid[])', [activityIds]);
    await db.query('delete from public.ideias_privadas where owner_id=any($1::uuid[])', [ids]);
    await db.query('delete from public.vinculos_publicadores where conta_id=any($1::uuid[])', [accounts]);
    await db.query('delete from public.casos_moderacao where sujeito_id=any($1::uuid[])', [subjects]);
    // Remove subtype and parent in one transaction; deferred integrity sees no orphan at commit.
    await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])', [subjects]);
    await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])', [subjects]);
    await db.query('delete from public.contas_acesso where id=any($1::uuid[])', [accounts]);
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
  for (const id of ids) if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Limpeza de identidade sintética incompleta.');
}

beforeAll(async () => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') throw new Error('Fixtures E3 exigem autorização local explícita.');
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', process.cwd(), '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as Record<string, string>;
  const api = new URL(local.API_URL);
  const database = new URL(local.DB_URL);
  if (api.origin !== 'http://127.0.0.1:56151' || database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') throw new Error('Alvo E3 não é a stack local isolada.');
  process.env.SUPABASE_DB_URL = local.DB_URL;
  db = new Client({ connectionString: local.DB_URL });
  await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const staleFixtures = (await db.query<{ id: string }>("select id from auth.users where email like $1", [`${emailPrefix}%@example.invalid`])).rows.map(row => row.id);
  if (staleFixtures.length) throw new Error('Namespace de conversão ocupado; nenhuma fixture preexistente será alterada.');
  for (let i = 0; i < 2; i++) {
    const created = await admin.auth.admin.createUser({ email: `${emailPrefix}${randomUUID()}@example.invalid`, password: `${randomUUID()}aA1!`, email_confirm: true });
    if (created.error || !created.data.user) throw new Error('Não foi possível criar identidade sintética local.');
    const user = created.data.user;
    userIds.push(user.id);
    const profile = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: user.id, p_nome_publico: `Pessoa Sintética E3 ${i} ${randomUUID()}` });
    if (profile.error || typeof profile.data !== 'string') throw new Error('Não foi possível criar sujeito sintético local.');
    subjectIds.push(profile.data);
    services.push(createActivityService({ verifyUser: async () => user }));
  }
  const unprofiled = await admin.auth.admin.createUser({ email: `${emailPrefix}${randomUUID()}@example.invalid`, password: `${randomUUID()}aA1!`, email_confirm: true });
  if (unprofiled.error || !unprofiled.data.user) throw new Error('Não foi possível criar identidade sintética sem perfil.');
  userIds.push(unprofiled.data.user.id);
  services.push(createActivityService({ verifyUser: async () => unprofiled.data.user }));
}, 30000);

afterAll(async () => {
  await closeDatabasePool();
  if (db && userIds.length) await cleanupFixtures(userIds);
  await db?.end();
}, 30000);

it('E3 converte ideia própria em rascunho privado, rejeita titular alheio/versão antiga e deduplica retries', async () => {
  const first = await ideas.create(userIds[0], { title: 'Ideia comunitária', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
  const second = await ideas.create(userIds[1], { title: 'Ideia de outra pessoa', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
  const convert = Reflect.get(services[0], 'convertIdea') as unknown as ((id: string, input: unknown) => Promise<{ id: string; repetida: boolean; [key: string]: unknown }>) | undefined;
  expect(convert, 'o serviço existente ainda não converte rascunhos de ideia').toBeTypeOf('function');
  if (!convert) return;
  const payload = command();
  const foreign = Reflect.get(services[1], 'convertIdea') as (id: string, input: unknown) => Promise<unknown>;
  await expect(foreign(first.id, payload)).rejects.toMatchObject({ status: 404 });
  await expect(Reflect.apply(convert, services[0], [second.id, payload])).rejects.toMatchObject({ status: 404 });
  const noSession = Reflect.get(createActivityService({ verifyUser: async () => null }), 'convertIdea') as (id: string, input: unknown) => Promise<unknown>;
  await expect(noSession(first.id, payload)).rejects.toMatchObject({ status: 401 });
  const blockedIdea = await ideas.create(userIds[0], { title: 'Ideia bloqueada', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
  await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1", [userIds[0]]);
  try { await expect(convert(blockedIdea.id, command())).rejects.toMatchObject({ status: 403 }); }
  finally { await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1", [userIds[0]]); }
  const unpermittedIdea = await ideas.create(userIds[2], { title: 'Ideia sem perfil publicador', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
  const noSubject = Reflect.get(services[2], 'convertIdea') as (id: string, input: unknown) => Promise<unknown>;
  await expect(noSubject(unpermittedIdea.id, command())).rejects.toMatchObject({ status: 403 });
  const edited = await ideas.update(userIds[0], first.id, { expectedVersion: 1, title: first.title, revisedText: `${source} trecho revisto`, revisedInterpretation: interpretation });
  await expect(convert(first.id, command({ versao_esperada: 1 }))).rejects.toMatchObject({ status: 409 });
  const current = await ideas.get(userIds[0], first.id);
  const next = { ...payload, versao_esperada: edited.version, pedido_id: randomUUID() };
  const results = await Promise.all(Array.from({ length: 3 }, () => convert(first.id, next)));
  const activityId = String(results[0].id);
  activityIds.push(activityId);
  expect(new Set(results.map(result => result.id)).size).toBe(1);
  expect(results.filter(result => result.repetida === false)).toHaveLength(1);
  expect(results.filter(result => result.repetida === true)).toHaveLength(2);
  expect(results[0]).toMatchObject({ titulo: next.titulo, descricao: next.descricao, estado_editorial: 'rascunho', versao_submetida: 1 });
  await expect(convert(first.id, { ...next, titulo: 'Payload alterado na repetição.' })).rejects.toMatchObject({ status: 409 });
  await expect(publicQueries.get(activityId)).rejects.toMatchObject({ status: 404 });
  expect(await db.query("select estado_editorial,versao_publicada,numero_versao_publicada from public.atividades where id=$1", [activityId])).toMatchObject({ rows: [{ estado_editorial: 'rascunho', versao_publicada: null, numero_versao_publicada: null }] });
  expect(await ideas.get(userIds[0], first.id)).toMatchObject({ original_text: source, revised_text: `${source} trecho revisto`, revised_interpretation: interpretation, version: current.version });
  expect((await db.query('select criada_por_conta_id,sujeito_id,organizacao_id,estado_editorial,versao_publicada,numero_versao_publicada from public.atividades where id=$1', [activityId])).rows[0]).toMatchObject({ criada_por_conta_id: expect.any(String), sujeito_id: subjectIds[0], organizacao_id: null, estado_editorial: 'rascunho', versao_publicada: null, numero_versao_publicada: null });
  await expect(Reflect.get(createActivityService({ verifyUser: async () => null }), 'convertIdea')?.(first.id, next)).rejects.toMatchObject({ status: 401 });
});

it('reverte a atividade se a conversão for interrompida antes da auditoria e permite repetir o pedido', async () => {
  const idea = await ideas.create(userIds[0], { title: 'Ideia para recuperação', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
  const payload = command();
  let interrupted = false;
  const service = createActivityService({
    verifyUser: async () => ({ id: userIds[0], email_confirmed_at: '2026-11-24T00:00:00Z' }),
    transaction: operation => withTransaction(sql => operation({
      query: async (statement: string, values?: unknown[]) => {
        if (statement.includes('insert into public.eventos_editoriais') && statement.includes("'atividade_criada_de_ideia'")) {
          const pending = await sql.query('select id from public.atividades where id=$1', [values?.[0]]);
          expect(pending.rowCount).toBe(1);
          interrupted = true;
          throw new Error('Interrupção sintética da auditoria de conversão');
        }
        return sql.query(statement, values);
      },
    } as Sql)),
  });
  await expect(service.convertIdea(idea.id, payload)).rejects.toMatchObject({ status: 503 });
  expect(interrupted).toBe(true);
  expect((await db.query('select id from public.atividades where sujeito_id=$1 and titulo=$2', [subjectIds[0], payload.titulo])).rows).toEqual([]);
  expect(await ideas.get(userIds[0], idea.id)).toMatchObject({ version: 1, original_text: source, original_interpretation: interpretation });
  const recovered = await services[0].convertIdea(idea.id, payload);
  expect(recovered).toMatchObject({ repetida: false, estado_editorial: 'rascunho' });
  expect(await services[0].convertIdea(idea.id, payload)).toMatchObject({ id: recovered.id, repetida: true });
});

it('QA-03 converte a ideia de uma atividade acontecendo agora e registra horário privado uma única vez', async () => {
  const idea = await ideas.create(userIds[0], { title: 'Ideia em andamento', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
  const instant = new Date(Date.now() + 15000);
  const inicioEmItaperuna = new Date(instant.getTime() - 3 * 3600000).toISOString().replace('Z', '-03:00');
  const payload = command({ inicio_previsto: inicioEmItaperuna, acontecendo_agora: true });
  const owner = services[0];
  await expect(services[1].convertIdea(idea.id, payload)).rejects.toMatchObject({ status: 404 });
  const created = await owner.convertIdea(idea.id, payload);
  expect(created).toMatchObject({ estado_editorial: 'rascunho', inicio_previsto: instant.toISOString(), repetida: false });
  expect(await owner.get(created.id)).toMatchObject({ inicio_previsto: instant.toISOString() });
  expect(await owner.convertIdea(idea.id, payload)).toMatchObject({ id: created.id, repetida: true });
  await expect(owner.convertIdea(idea.id, { ...payload, acontecendo_agora: false })).rejects.toMatchObject({ status: 409 });
  await expect(publicQueries.get(created.id)).rejects.toMatchObject({ status: 404 });
  const timing = await db.query<{ declaration: unknown }>(`select justificativa_restrita::jsonb as declaration
    from public.eventos_editoriais where objeto_id=$1 and acao='atividade_horario_atual'`, [created.id]);
  expect(timing.rows).toEqual([{ declaration: { tipo: 'horario-atual.v1', versao: 1, inicio_previsto: instant.toISOString() } }]);
});

it('QA-03 valida e recupera o modo retrospectivo que o mesmo formulário oferece', async () => {
  const idea = await ideas.create(userIds[0], { title: 'Ideia retrospectiva', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
  const owner = services[0];
  const payload = command({ inicio_previsto: '2026-01-10T10:30:00-03:00', retrospectiva: true });
  await expect(owner.convertIdea(idea.id, { ...payload, acontecendo_agora: true })).rejects.toMatchObject({ status: 422 });
  const created = await owner.convertIdea(idea.id, payload);
  expect(await owner.get(created.id)).toMatchObject({ retrospectiva: true, estado_editorial: 'rascunho', inicio_previsto: '2026-01-10T13:30:00.000Z' });
  expect(await owner.convertIdea(idea.id, payload)).toMatchObject({ id: created.id, repetida: true });
  await expect(publicQueries.get(created.id)).rejects.toMatchObject({ status: 404 });
});
