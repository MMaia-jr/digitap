import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { closeDatabasePool } from '../../src/lib/database.server';
import { e4Service, createE4Service } from '../../src/lib/capabilities/service.server';
import { createActivityService } from '../../src/lib/activities/service.server';
import { createPublicQueries } from '../../src/lib/queries/public.server';
import type { ProposalInterpretation } from '../../src/lib/proposals/interpret.server';

const session = vi.hoisted(() => ({ userId: '' }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: async () => ({}) }));
vi.mock('../../src/lib/supabase/admin.server', () => ({ adminClient: () => ({}) }));
vi.mock('../../src/lib/auth/gateway.server', () => ({
  createGateway: () => ({
    currentUser: async () => session.userId ? { id: session.userId, email_confirmed_at: '2026-11-23T12:00:00.000Z' } : null,
    account: async () => null,
  }),
}));

const origin = 'http://127.0.0.1:3215';
const proposal = 'Organizar uma oficina gratuita de leitura no bairro.';
const privateMarker = `G4-03-MARKER-${randomUUID()}`;
const interpretation: ProposalInterpretation = {
  estado: 'revisao_humana_pendente', verificacao: 'nao_verificada',
  dados: {
    sujeitos: [], projetos: [], atividades: [{ descricao: 'Oficina de leitura proposta', trecho: 'oficina gratuita de leitura' }],
    capacidades: [], relacoes: [], fontes: [{ descricao: 'Relato ainda não verificado', trecho: 'Organizar uma oficina' }],
    informacoes_nao_verificadas: [],
  },
};
const body = {
  content: [{ type: 'text', text: JSON.stringify(interpretation.dados) }],
  finishReason: { unified: 'stop', raw: 'stop' },
  usage: { inputTokens: { total: 14, noCache: 14, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 20, text: 20, reasoning: 0 } },
};

let db: Client | undefined;
let local: Record<string, string>;
let admin: SupabaseClient | undefined;
const users: string[] = [];
const subjects: string[] = [];
const capabilities: string[] = [];
const ideas: string[] = [];
const activities: string[] = [];
let ownerId = '';
let otherId = '';
let noProfileId = '';
let ownerSubjectId = '';
let otherSubjectId = '';
let savedIdeaId = '';
let capture: ReturnType<typeof vi.fn>;
let interpretPost: typeof import('../../src/app/api/propostas/interpretar/route').POST;
let ideaPost: typeof import('../../src/app/api/ideias/route').POST;

function request(path: string, payload: unknown) {
  return new Request(origin + path, {
    method: 'POST', headers: { origin, host: '127.0.0.1:3215', 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
}

function gatewayResponse() { return Response.json(body); }

async function withSimulatedGateway<T>(operation: () => Promise<T>) {
  const original = globalThis.fetch;
  capture = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.origin !== 'https://ai-gateway.vercel.sh' || init?.method !== 'POST') throw new Error('Rede externa bloqueada no ensaio G4-03.');
    return gatewayResponse();
  });
  vi.stubEnv('AI_GATEWAY_API_KEY', 'g4-03-synthetic-only');
  vi.stubEnv('AI_GATEWAY_MODEL', 'moonshotai/kimi-k2.6');
  vi.stubGlobal('fetch', capture);
  try { return await operation(); }
  finally { globalThis.fetch = original; vi.unstubAllEnvs(); }
}

beforeAll(async () => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') throw new Error('Fixtures G4-03 exigem autorização local explícita.');
  process.env.SUPABASE_TELEMETRY_DISABLED = '1';
  try {
    local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', process.cwd(), '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as Record<string, string>;
  } catch { throw new Error('Preflight Supabase local G4-03 indisponível; nenhuma fixture criada.'); }
  const api = new URL(local.API_URL);
  const database = new URL(local.DB_URL);
  if (api.origin !== 'http://127.0.0.1:56151' || database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') throw new Error('Alvo fora da allowlist loopback G4-03.');
  process.env.SUPABASE_DB_URL = local.DB_URL;
  db = new Client({ connectionString: local.DB_URL });
  await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const preexisting = await db.query("select count(*)::int n from auth.users where email like 'g4-03-%@example.invalid'");
  if (preexisting.rows[0].n !== 0) throw new Error('Namespace de fixtures G4-03 já contém dados; nenhum cleanup preexistente será tentado.');
  const addUser = async (profile: boolean, label: string) => {
    const email = `g4-03-${label}-${randomUUID()}@example.invalid`;
    const password = `${randomUUID()}aA1!`;
    const created = await admin!.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error('Não foi possível criar identidade sintética local.');
    const id = created.data.user.id;
    users.push(id);
    if (profile) {
      const result = await admin!.rpc('criar_pf_com_sujeito', { p_auth_user_id: id, p_nome_publico: `Pessoa fictícia G4-03 ${label}` });
      if (result.error || typeof result.data !== 'string') throw new Error('Não foi possível criar sujeito sintético local.');
      subjects.push(result.data);
      if (label === 'alfa') ownerSubjectId = result.data;
      if (label === 'beta') otherSubjectId = result.data;
    }
    if (label === 'alfa') ownerId = id;
    if (label === 'beta') otherId = id;
    if (label === 'sem-perfil') noProfileId = id;
    return id;
  };
  await addUser(true, 'alfa');
  await addUser(true, 'beta');
  await addUser(false, 'sem-perfil');
  vi.stubEnv('APP_ORIGIN', origin);
  interpretPost = (await import('../../src/app/api/propostas/interpretar/route')).POST;
  ideaPost = (await import('../../src/app/api/ideias/route')).POST;
  process.env.APP_ORIGIN = origin;
}, 30000);

afterAll(async () => {
  vi.unstubAllEnvs();
  await closeDatabasePool();
  if (db && (users.length || subjects.length || activities.length || ideas.length || capabilities.length)) {
    await db.query('begin');
    try {
      await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])", [activities]);
      await db.query("delete from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=any($1::uuid[])", [activities]);
      await db.query('delete from public.atividades where id=any($1::uuid[])', [activities]);
      await db.query('delete from public.ideias_privadas where id=any($1::uuid[]) or owner_id=any($2::uuid[])', [ideas, users]);
      await db.query('delete from public.capacidades where id=any($1::uuid[])', [capabilities]);
      await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])', [users]);
      await db.query('commit');
    } catch (error) { await db.query('rollback'); throw error; }
    for (const id of users) {
      const result = await admin?.auth.admin.deleteUser(id);
      if (result?.error) throw new Error('Limpeza de identidade sintética G4-03 falhou.');
    }
    const leftovers = (await db.query(`select
      (select count(*)::int from auth.users where id=any($1::uuid[])) auth,
      (select count(*)::int from public.sujeitos_publicadores where id=any($2::uuid[])) subjects,
      (select count(*)::int from public.capacidades where id=any($3::uuid[])) capabilities,
      (select count(*)::int from public.ideias_privadas where id=any($4::uuid[])) ideas,
      (select count(*)::int from public.atividades where id=any($5::uuid[])) activities`, [users, subjects, capabilities, ideas, activities])).rows[0];
    if (Object.values(leftovers).some(value => value !== 0)) throw new Error('Resíduo de fixture G4-03 permaneceu após cleanup restrito por IDs.');
  }
  await db?.end();
});

it('conta sem perfil segue o modo legado sem consultar contexto; Gateway simulado, sem persistência até ação explícita', async () => {
  session.userId = noProfileId;
  const subjectsSpy = vi.spyOn(e4Service, 'subjects');
  const contextSpy = vi.spyOn(e4Service, 'context');
  const response = await withSimulatedGateway(() => interpretPost(request('/api/propostas/interpretar', { texto: proposal })));
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.interpretacao).toMatchObject({ estado: 'revisao_humana_pendente', verificacao: 'nao_verificada' });
  expect(subjectsSpy).not.toHaveBeenCalled();
  expect(contextSpy).not.toHaveBeenCalled();
  expect(capture).toHaveBeenCalledOnce();
  expect(await db!.query("select count(*)::int n from public.ideias_privadas where owner_id=$1", [noProfileId])).toMatchObject({ rows: [{ n: 0 }] });
});

it('E4 real autoriza somente o titular; a projeção exata chega ao SDK e a decisão ainda exige salvar a ideia', async () => {
  session.userId = ownerId;
  const ownerService = createE4Service({ verifyUser: async () => ({ id: ownerId, email_confirmed_at: '2026-11-23T12:00:00.000Z' }) });
  const own = await ownerService.createCapability({ subjectId: ownerSubjectId, description: privateMarker, category: 'cultura', conditions: 'Uso contextual sintético.' });
  capabilities.push(own.id);
  const foreign = await createE4Service({ verifyUser: async () => ({ id: otherId, email_confirmed_at: '2026-11-23T12:00:00.000Z' }) }).createCapability({ subjectId: otherSubjectId, description: 'G4-03-PRIVATE-BETA-MUST-NOT-LEAK', category: 'cultura' });
  capabilities.push(foreign.id);

  const denied = await withSimulatedGateway(() => interpretPost(request('/api/propostas/interpretar', { texto: proposal, contexto: { subjectId: otherSubjectId, consentimento: true } })));
  expect(denied.status).toBe(403);
  expect(capture).not.toHaveBeenCalled();

  const response = await withSimulatedGateway(() => interpretPost(request('/api/propostas/interpretar', { texto: proposal, contexto: { subjectId: ownerSubjectId, consentimento: true } })));
  expect(response.status).toBe(200);
  const returned = await response.json();
  expect(returned.interpretacao).toMatchObject({ estado: 'revisao_humana_pendente', verificacao: 'nao_verificada' });
  const providerRequest = JSON.parse(String(capture.mock.calls[0][1]?.body));
  const userPayload = JSON.parse(providerRequest.prompt[1].content[0].text);
  expect(userPayload).toMatchObject({ proposta: proposal });
  expect(userPayload.contexto_autorizado.capabilities).toHaveLength(1);
  expect(userPayload.contexto_autorizado.capabilities[0]).toMatchObject({
    description: privateMarker, category: 'cultura', conditions: 'Uso contextual sintético.',
    provenance: { source: 'capacidades', attribution: 'subject_owner' }, state: 'ativa', visibility: 'privada', version: 1,
  });
  expect(userPayload.contexto_autorizado).toMatchObject({ projects: [], needs: [], realizations: [] });
  for (const forbidden of [ownerSubjectId, own.id, ownerId, otherSubjectId, foreign.id, 'G4-03-PRIVATE-BETA-MUST-NOT-LEAK', 'conta_id', 'auth_user_id', 'authorizedScope']) {
    expect(JSON.stringify(userPayload)).not.toContain(forbidden);
  }
  expect(providerRequest.prompt[0].content).toContain('não confiável');
  expect(providerRequest.tools).toBeUndefined();
  expect(providerRequest.providerOptions.gateway).toMatchObject({ only: ['parasail'], zeroDataRetention: true, disallowPromptTraining: true });

  const ideaResponse = await ideaPost(request('/api/ideias', {
    action: 'create', title: 'G4-03 oficina sintética', originalText: proposal,
    originalInterpretation: returned.interpretacao, revisedInterpretation: returned.interpretacao,
  }));
  expect(ideaResponse.status).toBe(200);
  const ideaResult = await ideaResponse.json();
  savedIdeaId = ideaResult.ideia.id;
  ideas.push(savedIdeaId);
  const storedIdea = (await db!.query('select id,owner_id,title,original_text,original_interpretation from public.ideias_privadas where id=$1', [savedIdeaId])).rows[0];
  expect(storedIdea).toMatchObject({ id: savedIdeaId, owner_id: ownerId, title: 'G4-03 oficina sintética', original_text: proposal });
  expect(storedIdea.original_interpretation).toMatchObject({ estado: 'revisao_humana_pendente', verificacao: 'nao_verificada' });

  const activity = await createActivityService({ verifyUser: async () => ({ id: ownerId, email_confirmed_at: '2026-11-23T12:00:00.000Z' }) }).convertIdea(savedIdeaId, {
    versao_esperada: 1, pedido_id: randomUUID(), titulo: 'Oficina de leitura — rascunho',
    descricao: 'Descrição confirmada pela pessoa para o rascunho privado.',
    inicio_previsto: '2026-12-15T18:00:00-03:00', orientacao_acesso: 'Acesso a confirmar.', referencia_oficial: null,
  });
  activities.push(activity.id);
  expect(activity.estado_editorial).toBe('rascunho');
  const persistedActivity = (await db!.query('select estado_editorial,versao_publicada,numero_versao_publicada from public.atividades where id=$1', [activity.id])).rows[0];
  expect(persistedActivity).toMatchObject({ estado_editorial: 'rascunho', versao_publicada: null, numero_versao_publicada: null });
  await expect(createPublicQueries().get(activity.id)).rejects.toMatchObject({ status: 404 });
  const publication = await db!.query("select count(*)::int n from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=$1", [activity.id]);
  expect(publication.rows[0].n).toBe(0);
});

it('revogação de vínculo impede uma nova recuperação e não chama o Gateway', async () => {
  session.userId = ownerId;
  const link = (await db!.query("select id from public.vinculos_publicadores where sujeito_id=$1 and atual and situacao='ativo' and papel_vinculo='titular'", [ownerSubjectId])).rows[0];
  expect(link?.id).toBeTruthy();
  await db!.query("update public.vinculos_publicadores set situacao='revogado',revogada_em=clock_timestamp(),atualizada_em=clock_timestamp() where id=$1", [link.id]);
  const response = await withSimulatedGateway(() => interpretPost(request('/api/propostas/interpretar', { texto: proposal, contexto: { subjectId: ownerSubjectId, consentimento: true } })));
  expect(response.status).toBe(403);
  expect(capture).not.toHaveBeenCalled();
  await expect(e4Service.context(ownerSubjectId)).rejects.toMatchObject({ status: 403 });
});
