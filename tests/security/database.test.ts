import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { authorize } from '../../src/lib/auth/permissions.server';
import { createAccessDependencies } from '../../src/lib/auth/supabase-access.server';
vi.mock('server-only', () => ({}));

const tables = ['organizacoes', 'contas_acesso', 'atividades', 'registros_realizacao', 'evidencias', 'autorizacoes_publicacao', 'apoios', 'parceiros', 'eventos_editoriais'] as const;
let db: Client;
let admin: SupabaseClient;
let userClient: SupabaseClient;
let apiUrl: string;
let publicKey: string;
let accessToken: string;
let userId: string;
const fixtureId = randomUUID();
const organizationId = randomUUID();
const config = { auth: { persistSession: false, autoRefreshToken: false } };

beforeAll(async () => {
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', process.cwd(), '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  // Hard guard: these tests must never read a remote project or another local database.
  apiUrl = local.API_URL;
  publicKey = local.PUBLISHABLE_KEY ?? local.ANON_KEY;
  if (apiUrl !== 'http://127.0.0.1:56151') throw new Error('Endpoint local de A Praça inesperado.');
  const dbUrl = new URL(local.DB_URL);
  if (dbUrl.hostname !== '127.0.0.1' || dbUrl.port !== '56152') throw new Error('Banco local de A Praça inesperado.');
  db = new Client({ connectionString: local.DB_URL });
  await db.connect();
  admin = createClient(apiUrl, local.SECRET_KEY ?? local.SERVICE_ROLE_KEY, config);
  const email = `security-${randomUUID()}@example.invalid`;
  const password = randomUUID() + 'aA1!';
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { papel: 'administrador' } });
  if (error || !created.user) throw new Error('Não foi possível criar usuário fictício local.');
  userId = created.user.id;
  userClient = createClient(apiUrl, publicKey, config);
  const { data: session, error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError || !session.session) throw new Error('Não foi possível autenticar usuário fictício local.');
  accessToken = session.session.access_token;
  const exists = await db.query("select to_regclass('public.organizacoes') as name");
  if (exists.rows[0].name) {
    await db.query('insert into public.organizacoes(id,nome_publico) values ($1,$2)', [organizationId, 'Organização Fictícia de Teste']);
    await db.query('insert into public.contas_acesso(id,auth_user_id,organizacao_id) values ($1,$2,$3)', [fixtureId, userId, organizationId]);
  }
}, 30000);

afterAll(async () => {
  if (db) {
    const exists = await db.query("select to_regclass('public.contas_acesso') as name");
    if (exists.rows[0].name) {
      await db.query('delete from public.contas_acesso where id=$1', [fixtureId]);
      await db.query('delete from public.organizacoes where id=$1', [organizationId]);
    }
    await db.end();
  }
  if (userId && admin) await admin.auth.admin.deleteUser(userId);
});

describe('segurança real no Supabase isolado — subconjunto G01/G02/G03/H02', () => {
  it.each(tables)('%s existe com RLS e sem grants aos clientes', async table => {
    const { rows } = await db.query(`select c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=$1`, [table]);
    expect(rows).toHaveLength(1);
    expect(rows[0].rls).toBe(true);
    for (const role of ['anon', 'authenticated']) {
      for (const privilege of ['SELECT','INSERT','UPDATE','DELETE']) {
        const result = await db.query('select has_table_privilege($1,$2,$3) as allowed', [role, `public.${table}`, privilege]);
        expect(result.rows[0].allowed).toBe(false);
      }
    }
  });

  for (const role of ['anon', 'authenticated']) {
    for (const table of tables) {
      for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
        it(`${role}: ${method} /rest/v1/${table} nega acesso direto`, async () => {
          const response = await fetch(`${apiUrl}/rest/v1/${table}?id=eq.${fixtureId}`, {
            method, headers: { apikey: publicKey, ...(role === 'authenticated' ? { Authorization: `Bearer ${accessToken}` } : {}), 'Content-Type': 'application/json' },
            ...(['POST','PATCH'].includes(method) ? { body: '{}' } : {}),
          });
          // 404 = table intentionally absent from client schema cache; 401/403 = privilege denied.
          expect([401, 403, 404]).toContain(response.status);
          const body = await response.json();
          expect(['42501','PGRST205']).toContain(body.code);
          expect(JSON.stringify(body)).not.toContain('Organização Fictícia');
        });
      }
    }
  }

  it('RLS continua negando leitura mesmo se SELECT for concedido por engano (rollback)', async () => {
    await db.query('begin');
    try {
      await db.query('grant select on public.contas_acesso to anon');
      await db.query('set local role anon');
      const result = await db.query('select * from public.contas_acesso');
      expect(result.rows).toEqual([]);
    } finally { await db.query('rollback'); }
  });

  it('Auth real e papel do banco prevalecem sobre metadata administrativa forjada', async () => {
    const deps = createAccessDependencies(userClient, admin);
    expect(await deps.verifyUser()).toMatchObject({ id: userId });
    await expect(authorize(deps, { action: 'editorial' })).rejects.toMatchObject({ status: 403 });
    expect(await authorize(deps, { action: 'organizacao', organizationId })).toMatchObject({ papel: 'organizacao' });
    await expect(authorize(deps, { action: 'organizacao', organizationId: randomUUID() })).rejects.toMatchObject({ status: 403 });
  });

  it('bloqueio e mudança de papel são efetivos sem renovar o JWT', async () => {
    const deps = createAccessDependencies(userClient, admin);
    try {
      await db.query("update public.contas_acesso set papel='editor' where id=$1", [fixtureId]);
      expect(await authorize(deps, { action: 'editorial' })).toMatchObject({ papel: 'editor' });
      await db.query("update public.contas_acesso set situacao='bloqueada' where id=$1", [fixtureId]);
      await expect(authorize(deps, { action: 'editorial' })).rejects.toMatchObject({ status: 403 });
    } finally {
      await db.query("update public.contas_acesso set papel='organizacao',situacao='ativa' where id=$1", [fixtureId]);
    }
  });

  it('tentativas públicas não alteraram os registros fictícios', async () => {
    const result = await db.query('select auth_user_id, papel, situacao from public.contas_acesso where id=$1', [fixtureId]);
    expect(result.rows).toEqual([{ auth_user_id: userId, papel: 'organizacao', situacao: 'ativa' }]);
  });
});
