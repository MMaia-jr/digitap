import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
vi.mock('server-only', () => ({}));

let db: Client;

beforeAll(async () => {
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', process.cwd(), '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as { API_URL: string; DB_URL: string };
  const api = new URL(local.API_URL), database = new URL(local.DB_URL);
  if (api.origin !== 'http://127.0.0.1:56151' || database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') throw new Error('Destino fora da stack Supabase local autorizada.');
  db = new Client({ connectionString: local.DB_URL });
  await db.connect();
}, 15000);

afterAll(async () => { await db?.end(); });

it('preserva a tabela E4 fechada e admite associação exclusiva a atividade ou projeto', async () => {
  const result = await db.query<{ column_name: string; is_nullable: string }>(`select column_name,is_nullable from information_schema.columns where table_schema='public' and table_name='necessidades_projeto' and column_name in ('projeto_id','atividade_id')`);
  expect(result.rows).toEqual(expect.arrayContaining([
    { column_name: 'projeto_id', is_nullable: 'YES' },
    { column_name: 'atividade_id', is_nullable: 'YES' },
  ]));
  const table = await db.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(`select relrowsecurity,relforcerowsecurity from pg_class where oid='public.necessidades_projeto'::regclass`);
  expect(table.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  for (const role of ['anon', 'authenticated']) {
    const grants = await db.query<{ allowed: boolean }>('select has_table_privilege($1,$2,$3) allowed', [role, 'public.necessidades_projeto', 'SELECT']);
    expect(grants.rows[0].allowed).toBe(false);
  }
  const check = await db.query<{ definition: string }>(`select pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.necessidades_projeto'::regclass and conname='necessidades_projeto_parent_check'`);
  expect(check.rows[0]?.definition).toMatch(/projeto_id IS NOT NULL/);
  expect(check.rows[0]?.definition).toMatch(/atividade_id IS NOT NULL/);
});
