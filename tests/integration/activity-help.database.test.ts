import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createE4Service } from '../../src/lib/capabilities/service.server';
import { createActivityService } from '../../src/lib/activities/service.server';
import { closeDatabasePool } from '../../src/lib/database.server';
vi.mock('server-only', () => ({}));

let db: Client, admin: SupabaseClient;
const users: string[] = [], subjects: string[] = [], activities: string[] = [], needs: string[] = [];
const services: ReturnType<typeof createE4Service>[] = [];
const run = randomUUID();
function activityService(user: { id: string; email_confirmed_at: string }) { return createActivityService({ verifyUser: async () => user }); }

beforeAll(async () => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') throw new Error('Fixtures E4.1 exigem autorização local explícita.');
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', process.cwd(), '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as Record<string, string>;
  const api = new URL(local.API_URL), database = new URL(local.DB_URL);
  if (api.origin !== 'http://127.0.0.1:56151' || database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') throw new Error('Destino fora da stack Supabase local E4.1.');
  process.env.SUPABASE_DB_URL = local.DB_URL;
  db = new Client({ connectionString: local.DB_URL });
  await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  for (let index = 0; index < 2; index++) {
    const email = `e41-help-${index}-${run}@example.invalid`, password = randomUUID() + 'aA1!';
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error('Fixture Auth E4.1 não criada.');
    const user = created.data.user;
    users.push(user.id);
    const registered = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: user.id, p_nome_publico: `E4.1 pessoa sintética ${index} ${run.slice(0, 6)}` });
    if (registered.error) throw new Error('Fixture PF E4.1 não criada.');
    subjects.push(registered.data);
    const verified = { id: user.id, email_confirmed_at: new Date().toISOString() };
    services.push(createE4Service({ verifyUser: async () => verified }));
    if (index === 0) {
      const row = await activityService(verified).create({ titulo: `Atividade privada E4.1 ${run}`, descricao: 'Atividade sintética para teste integrado de solicitação de ajuda.', inicio_previsto: new Date(Date.now() + 86400000 * 3).toISOString(), orientacao_acesso: 'Condições sintéticas e sujeitas a confirmação.' });
      activities.push(row.id);
    }
  }
}, 30000);

afterAll(async () => {
  await closeDatabasePool();
  if (db && users.length) {
    await db.query('begin');
    try {
      await db.query('delete from public.interesses_necessidade where necessidade_id=any($1::uuid[]) or owner_auth_user_id=any($2::uuid[])', [needs, users]);
      await db.query('delete from public.necessidades_projeto where id=any($1::uuid[])', [needs]);
      await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])", [activities]);
      await db.query('delete from public.atividades where id=any($1::uuid[])', [activities]);
      await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])', [users]);
      await db.query('commit');
    } catch (error) { await db.query('rollback'); throw error; }
    for (const id of users) if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Limpeza de Auth sintético E4.1 falhou.');
  }
  await db?.end();
});

it('RLS e grants da tabela estendida continuam deny-by-default', async () => {
  const row = (await db.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(`select relrowsecurity,relforcerowsecurity from pg_class where oid='public.necessidades_projeto'::regclass`)).rows[0];
  expect(row).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  for (const role of ['anon', 'authenticated']) for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    expect((await db.query('select has_table_privilege($1,$2,$3) allowed', [role, 'public.necessidades_projeto', privilege])).rows[0].allowed).toBe(false);
  }
});

it('mantém solicitações privadas, deriva titular da sessão, isola contas e protege versão concorrente', async () => {
  const [owner, other] = services, [ownerSubject, otherSubject] = subjects, activityId = activities[0];
  const before = (await db.query(`select (select count(*)::int from public.atividades where id=any($1::uuid[])) activities,(select count(*)::int from public.eventos_editoriais where objeto_id=any($1::uuid[])) events,(select count(*)::int from public.vinculos_colaboracao where sujeito_id=any($2::uuid[])) links`, [activities, subjects])).rows[0];
  const created = await owner.createActivityNeed({ activityId, description: 'Ajuda sintética para revisar material.', categories: ['comunicacao'], conditions: 'Condições serão confirmadas entre as pessoas.' });
  needs.push(created.id);
  expect(created).toMatchObject({ atividade_id: activityId, visibilidade: 'privada', estado: 'aberta', versao: 1 });
  expect((await owner.listActivityNeeds(activityId)).needs.map(item => item.id)).toEqual([created.id]);
  await expect(other.listActivityNeeds(activityId)).rejects.toMatchObject({ status: 403 });
  await expect(other.updateActivityNeed({ id: created.id, subjectId: ownerSubject, expectedVersion: 1, description: 'Alteração cruzada.', categories: ['cultura'], visibility: 'privada' } as never)).rejects.toMatchObject({ status: 403 });
  await expect(owner.updateActivityNeed({ id: created.id, expectedVersion: 1, description: 'Texto revisado pelo titular.', categories: ['comunicacao'], visibility: 'privada' })).resolves.toMatchObject({ versao: 2 });
  await expect(owner.updateActivityNeed({ id: created.id, expectedVersion: 1, description: 'Edição obsoleta.', categories: ['comunicacao'], visibility: 'privada' })).rejects.toMatchObject({ status: 409 });
  await expect(other.closeActivityNeed({ id: created.id, expectedVersion: 2 })).rejects.toMatchObject({ status: 403 });
  await expect(owner.updateActivityNeed({ id: created.id, expectedVersion: 2, description: 'Solicitação não publicada.', categories: ['comunicacao'], visibility: 'visivel' })).rejects.toMatchObject({ status: 403 });
  expect(await owner.discoverActivityNeeds()).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id })]));
  const persisted = (await db.query('select projeto_id,atividade_id,visibilidade,estado,versao from public.necessidades_projeto where id=$1', [created.id])).rows[0];
  expect(persisted).toEqual({ projeto_id: null, atividade_id: activityId, visibilidade: 'privada', estado: 'aberta', versao: 2 });
  const after = (await db.query(`select (select count(*)::int from public.atividades where id=any($1::uuid[])) activities,(select count(*)::int from public.eventos_editoriais where objeto_id=any($1::uuid[])) events,(select count(*)::int from public.vinculos_colaboracao where sujeito_id=any($2::uuid[])) links`, [activities, subjects])).rows[0];
  expect(after).toEqual(before);
  await expect(other.listActivityNeeds(String(otherSubject))).rejects.toMatchObject({ status: 404 });
});
