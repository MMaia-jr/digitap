import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
vi.mock('server-only', () => ({}));
import { createIdeasService } from '../../src/lib/ideas/service.server';

let db: Client;
let admin: SupabaseClient;
let firstUser = '';
let secondUser = '';
const fixtureUsers: string[] = [];
const prefix = `E2.2 local fixture ${randomUUID()}`;
const source = `${prefix}: proposta de oficina comunitária`;
const interpretation = {
  estado: 'revisao_humana_pendente' as const,
  verificacao: 'nao_verificada' as const,
  dados: { sujeitos: [], projetos: [], atividades: [], capacidades: [], relacoes: [], fontes: [], informacoes_nao_verificadas: [] },
};
const options = { auth: { persistSession: false, autoRefreshToken: false } };

async function asAuthenticated<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  await db.query('begin');
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [userId]);
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    const result = await operation();
    await db.query('commit');
    return result;
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
}

describe('persistência privada de ideias — PostgreSQL local e RLS', () => {
  beforeAll(async () => {
    const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', process.cwd(), '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as Record<string, string>;
    const api = new URL(local.API_URL);
    const database = new URL(local.DB_URL);
    if (api.origin !== 'http://127.0.0.1:56151' || database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') throw new Error('Alvo local fora da allowlist E2.2.');
    db = new Client({ connectionString: local.DB_URL });
    await db.connect();
    admin = createClient(local.API_URL, local.SECRET_KEY, options);
    for (const [slot, email] of ['first', 'second'].map(slot => [slot, `e22-${slot}-${randomUUID()}@example.invalid`] as const)) {
      const created = await admin.auth.admin.createUser({ email, password: `${randomUUID()}aA1!`, email_confirm: true });
      if (created.error || !created.data.user) throw new Error('Falha ao criar fixture fictícia de Auth local.');
      fixtureUsers.push(created.data.user.id);
      if (slot === 'first') firstUser = created.data.user.id;
      else secondUser = created.data.user.id;
    }
  }, 30000);

  afterAll(async () => {
    if (db) {
      await db.query('delete from public.ideias_privadas where owner_id = any($1::uuid[])', [fixtureUsers]);
      await db.end();
    }
    for (const userId of fixtureUsers) await admin?.auth.admin.deleteUser(userId);
  }, 30000);

  it('cria, lista, consulta, atualiza, preserva concorrência e exclui somente os rascunhos próprios', async () => {
    const service = createIdeasService(async operation => operation(db));
    const created = await service.create(firstUser, { title: 'Rascunho de teste', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
    expect(created.owner_id).toBe(firstUser);
    expect(created.version).toBe(1);
    expect(await service.list(secondUser)).toEqual([]);
    await expect(service.get(secondUser, created.id)).rejects.toMatchObject({ status: 404 });
    const editedText = `${source} texto editado`;
    const revised = await service.update(firstUser, created.id, { expectedVersion: 1, title: 'Versão revisada', revisedText: editedText, revisedInterpretation: interpretation });
    expect(revised.version).toBe(2);
    expect(revised.original_text).toBe(source);
    expect(revised.revised_text).toBe(editedText);
    const revisedQuote = { ...interpretation, dados: { ...interpretation.dados, atividades: [{ descricao: 'Texto editado', trecho: 'texto editado' }] } };
    const savedEdit = await service.update(firstUser, created.id, { expectedVersion: 2, title: 'Versão revisada', revisedText: editedText, revisedInterpretation: revisedQuote });
    expect(savedEdit.original_interpretation).toEqual(interpretation);
    expect(savedEdit.original_text).toBe(source);
    await expect(service.update(firstUser, created.id, { expectedVersion: 1, title: 'Conflito', revisedText: source, revisedInterpretation: interpretation })).rejects.toMatchObject({ status: 409 });
    expect((await service.get(firstUser, created.id)).title).toBe('Versão revisada');
    await expect(service.delete(secondUser, created.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.delete(firstUser, created.id)).resolves.toBe(true);
    await expect(service.get(firstUser, created.id)).rejects.toMatchObject({ status: 404 });
  });

  it('RLS restringe SELECT e bloqueia INSERT, UPDATE e DELETE entre identidades', async () => {
    const row = await createIdeasService(async operation => operation(db)).create(firstUser, { title: 'RLS fixture', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
    const otherRows = await asAuthenticated(secondUser, async () => (await db.query('select id from public.ideias_privadas where id=$1', [row.id])).rows);
    expect(otherRows).toEqual([]);
    await expect(asAuthenticated(secondUser, () => db.query('insert into public.ideias_privadas(owner_id,title,original_text,original_interpretation) values($1,$2,$3,$4)', [firstUser, 'forjado', source, JSON.stringify(interpretation)]))).rejects.toMatchObject({ code: '42501' });
    const changed = await asAuthenticated(secondUser, () => db.query('update public.ideias_privadas set title=$2 where id=$1 returning id', [row.id, 'forjado']).then(result => result.rows));
    expect(changed).toEqual([]);
    const deleted = await asAuthenticated(secondUser, () => db.query('delete from public.ideias_privadas where id=$1 returning id', [row.id]).then(result => result.rows));
    expect(deleted).toEqual([]);
    const own = await asAuthenticated(firstUser, async () => (await db.query('select id,owner_id from public.ideias_privadas where id=$1', [row.id])).rows);
    expect(own).toEqual([{ id: row.id, owner_id: firstUser }]);
  });

  it('não cria sujeitos, projetos, atividades ou vínculos publicáveis', async () => {
    const before = await db.query('select (select count(*) from public.sujeitos_publicadores)::int as subjects, (select count(*) from public.projetos)::int as projects, (select count(*) from public.atividades)::int as activities, (select count(*) from public.vinculos_publicadores)::int as links');
    const created = await createIdeasService(async operation => operation(db)).create(secondUser, { title: 'Somente ideia', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
    expect(created.id).toBeTruthy();
    const after = await db.query('select (select count(*) from public.sujeitos_publicadores)::int as subjects, (select count(*) from public.projetos)::int as projects, (select count(*) from public.atividades)::int as activities, (select count(*) from public.vinculos_publicadores)::int as links');
    expect(after.rows).toEqual(before.rows);
  });
});
