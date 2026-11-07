import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createActivityService } from '../../src/lib/activities/service.server';
import { closeDatabasePool } from '../../src/lib/database.server';
vi.mock('server-only', () => ({}));
let db: Client, admin: SupabaseClient;
const users: string[] = [], subjects: string[] = [];
const services: ReturnType<typeof createActivityService>[] = [];
const draft = () => ({ titulo: 'Oficina Fictícia ' + randomUUID(), descricao: 'Encontro fictício de saberes comunitários.', inicio_previsto: new Date(Date.now() + 86400000 * 3).toISOString(), orientacao_acesso: 'Acesso gratuito fictício.', referencia_oficial: null });
beforeAll(async () => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') throw new Error('Fixtures locais não autorizadas.');
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  if (local.API_URL !== 'http://127.0.0.1:56151' || new URL(local.DB_URL).hostname !== '127.0.0.1' || new URL(local.DB_URL).port !== '56152') throw new Error('Alvo não autorizado.');
  process.env.SUPABASE_DB_URL = local.DB_URL;
  db = new Client(local.DB_URL); await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  for (let i = 0; i < 2; i++) {
    const result = await admin.auth.admin.createUser({ email: `mvp-pf-${randomUUID()}@example.invalid`, password: randomUUID() + 'aA1!', email_confirm: true });
    if (result.error || !result.data.user) throw new Error('Criação da fixture Auth falhou.');
    const user = result.data.user; users.push(user.id);
    const registered = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: user.id, p_nome_publico: 'Pessoa Fictícia MVP ' + i });
    if (registered.error) throw new Error('Criação da fixture PF falhou.');
    subjects.push(registered.data);
    services.push(createActivityService({ verifyUser: async () => user }));
  }
}, 30000);
afterAll(async () => {
  await closeDatabasePool();
  if (db && users.length) {
    await db.query('begin');
    try {
      await db.query('delete from public.atividades where criada_por_conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))', [users]);
      await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))', [users]);
      await db.query('delete from public.pessoas_fisicas where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))', [users]);
      await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])', [users]);
      await db.query('commit');
    } catch (e) { await db.query('rollback'); throw e; }
    for (const id of users) if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Limpeza Auth falhou.');
  }
  await db?.end();
});
it('PF pendente cria rascunho com sujeito próprio e sem publicação', async () => {
  const created = await services[0].create(draft());
  expect((await db.query('select sujeito_id,organizacao_id,politica_publicacao,estado_editorial,versao_publicada,apoios_abertos from public.atividades where id=$1', [created.id])).rows[0]).toEqual({ sujeito_id: subjects[0], organizacao_id: null, politica_publicacao: 'i4', estado_editorial: 'rascunho', versao_publicada: null, apoios_abertos: false });
});
it('listagem PF é isolada por sujeito e autor', async () => {
  const a = await services[0].create(draft()), b = await services[1].create(draft());
  expect((await services[0].list()).map(row => row.id)).toContain(a.id);
  expect((await services[0].list()).map(row => row.id)).not.toContain(b.id);
  expect((await services[1].list()).map(row => row.id)).toEqual([b.id]);
});
it('payload não escolhe sujeito nem autor', async () => {
  await expect(services[0].create({ ...draft(), sujeito_id: subjects[1] })).rejects.toMatchObject({ status: 400 });
});
it('PF não ganha acesso editorial ou publicação automática', async () => {
  const created = await services[0].create(draft());
  await expect(services[0].publish(created.id, { pedido_id: randomUUID(), versao_esperada: 1 })).rejects.toMatchObject({ status: 403 });
  await expect(services[1].get(created.id)).rejects.toMatchObject({ status: 403 });
});
it('conta bloqueada não cria nem lista rascunhos', async () => {
  await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1", [users[0]]);
  try {
    await expect(services[0].create(draft())).rejects.toMatchObject({ status: 403 });
    await expect(services[0].list()).rejects.toMatchObject({ status: 403 });
  } finally { await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1", [users[0]]); }
});
it('escopos reais do vínculo são revalidados para cada operação', async () => {
  const old = (await db.query('select id,escopos from public.vinculos_publicadores where sujeito_id=$1 and atual', [subjects[0]])).rows[0];
  async function version(scopes: string[]) {
    await db.query('begin');
    try {
      const previous = (await db.query('update public.vinculos_publicadores set atual=false where id=$1 and atual returning *', [old.id])).rows[0];
      await db.query("insert into public.vinculos_publicadores(id,versao,sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,ativada_em) values($1,$2,$3,$4,$5,$6,'ativo',$7,now())", [previous.id, previous.versao + 1, previous.sujeito_id, previous.conta_id, previous.papel_vinculo, scopes, previous.origem]);
      await db.query('commit');
    } catch (e) { await db.query('rollback'); throw e; }
  }
  await version(['ler_privado']);
  try { await expect(services[0].create(draft())).rejects.toMatchObject({ status: 403 }); await expect(services[0].list()).resolves.toBeInstanceOf(Array); }
  finally { await version(old.escopos); }
});
