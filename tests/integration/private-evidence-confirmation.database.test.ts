import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import type {QueryResult} from 'pg';
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {closeDatabasePool, withTransaction, type Sql, type Transaction} from '../../src/lib/database.server';
import {createPrivateFileRepository} from '../../src/lib/evidence/private-files.repository.server';
import {createPrivateFileService} from '../../src/lib/evidence/private-files.server';

vi.mock('server-only', () => ({}));

const owner = randomUUID();
const other = randomUUID();
const activity = randomUUID();
const record = randomUUID();
const file = randomUUID();
const objectKey = `evidencias/${record}/${file}`;
const previousDbUrl = process.env.SUPABASE_DB_URL;
let organization: string;
let otherOrganization: string;
let fixtureAttempted = false;

function barrier() {
  let release!: () => void;
  const reached = new Promise<void>(resolve => { release = resolve; });
  return {reached, release};
}

async function until(description: string, predicate: () => boolean | Promise<boolean>) {
  const deadline = performance.now() + 2_000;
  do {
    if (await predicate()) return;
    await delay(15);
  } while (performance.now() < deadline);
  throw new Error(`Sincronização PostgreSQL: ${description}`);
}

async function blockedBy(waiter: number, blocker: number) {
  return withTransaction(async sql => {
    await sql.query("set local statement_timeout = '500ms'");
    const result = await sql.query<{blocked: boolean}>(
      'select $2::int = any(pg_blocking_pids($1::int)) as blocked', [waiter, blocker],
    );
    return result.rows[0].blocked;
  });
}

async function backendPid(sql: Sql) {
  return (await sql.query<{pid: number}>('select pg_backend_pid() as pid')).rows[0].pid;
}

function observeUpdate(sql: Sql, observe: (proceed: () => Promise<number>) => Promise<void>): Sql {
  return {
    async query(statement: string, values?: unknown[]) {
      if (!/^\s*update\s+public\.evidencias_arquivos_privados\b/i.test(statement)) {
        return sql.query(statement, values);
      }
      let result: QueryResult | undefined;
      await observe(async () => {
        result = await sql.query(statement, values);
        return result.rowCount ?? 0;
      });
      return result;
    },
  } as Sql;
}

function service(options: {
  actorId?: string;
  transaction?: Transaction;
  stat?: () => Promise<void>;
  beforeWrite?: () => Promise<void>;
} = {}) {
  const access = createPrivateFileRepository();
  const writes = createPrivateFileRepository({transaction: options.transaction}).repository;
  return createPrivateFileService({
    verifyActor: async () => options.actorId ?? owner,
    authorize: access.authorize,
    repository: {
      ...access.repository,
      async markConfirmed(context) {
        await options.beforeWrite?.();
        return writes.markConfirmed(context);
      },
    },
    storage: {
      signedUpload: async () => { throw new Error('Upload fora do cenário.'); },
      signedRead: async () => { throw new Error('Leitura fora do cenário.'); },
      async stat(key) {
        expect(key).toBe(objectKey);
        await options.stat?.();
        return {contentType: 'image/png', sizeBytes: 128};
      },
    },
  });
}

async function suspend(sql: Sql) {
  const result = await sql.query(
    "update public.organizacoes set estado_validacao = 'suspensa' where id = $1", [organization],
  );
  expect(result.rowCount).toBe(1);
}

async function storedState() {
  return withTransaction(async sql => {
    const result = await sql.query<{estado: string}>(
      'select estado from public.evidencias_arquivos_privados where id = $1 and registro_id = $2',
      [file, record],
    );
    return result.rows[0]?.estado;
  });
}

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test' || process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') {
    throw new Error('Fixtures requerem autorização para o ambiente local.');
  }
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', [
    'status', '--workdir', process.cwd(), '--output', 'json',
  ], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}));
  let db: URL;
  try { db = new URL(local.DB_URL); } catch { throw new Error('URL local inválida.'); }
  if (local.API_URL !== 'http://127.0.0.1:56151' || db.hostname !== '127.0.0.1'
    || db.port !== '56152' || db.pathname !== '/postgres' || db.username !== 'postgres'
    || !db.password || db.search || db.hash || !['postgres:', 'postgresql:'].includes(db.protocol)) {
    throw new Error('Destino PostgreSQL fora do ambiente de teste local.');
  }
  process.env.SUPABASE_DB_URL = local.DB_URL;
  await withTransaction(async sql => {
    const preflight = await sql.query<{ready: boolean}>(`
      select current_setting('transaction_isolation') = 'read committed'
        and to_regclass('public.evidencias_arquivos_privados') is not null as ready
    `);
    if (!preflight.rows[0].ready) throw new Error('Preflight OSS-01B requer schema e READ COMMITTED.');
  });
  fixtureAttempted = true;
  await withTransaction(async sql => {
    const organizations: string[] = [];
    for (const actor of [owner, other]) {
      await sql.query("insert into auth.users (id, email) values ($1, $2)", [actor, `oss01b-${actor}@example.invalid`]);
      const result = await sql.query<{id: string}>(
        'select public.criar_organizacao_com_sujeito($1, $2, null) as id',
        [actor, `Organização sintética OSS-01B ${actor}`],
      );
      organizations.push(result.rows[0].id);
    }
    [organization, otherOrganization] = organizations;
    await sql.query("update public.organizacoes set estado_validacao = 'validada' where id = any($1::uuid[])", [organizations]);
    await sql.query(`
      insert into public.atividades
        (id, organizacao_id, criada_por_conta_id, titulo, descricao, inicio_previsto, orientacao_acesso)
      select $1, organizacao_id, id, 'Atividade sintética OSS-01B',
             'Atividade sintética de teste de confirmação.', now(), 'Fixture local'
      from public.contas_acesso where auth_user_id = $2
    `, [activity, owner]);
    await sql.query(`
      insert into public.registros_realizacao
        (id, atividade_id, data_realizacao, descricao_factual, origem_informacao)
      values ($1, $2, current_date, 'Relato sintético de confirmação.', 'Fixture local')
    `, [record, activity]);
  });
}, 15_000);

beforeEach(async () => {
  await withTransaction(async sql => {
    await sql.query("update public.organizacoes set estado_validacao = 'validada' where id = $1", [organization]);
    await sql.query(`
      insert into public.evidencias_arquivos_privados
        (id, registro_id, object_key, content_type, size_bytes)
      values ($1, $2, $3, 'image/png', 128)
    `, [file, record, objectKey]);
  });
});

async function removeFile(sql: Sql) {
  await sql.query('delete from public.evidencias_arquivos_privados where id = $1 and registro_id = $2', [file, record]);
}

afterEach(async () => {
  if (fixtureAttempted) await withTransaction(removeFile);
});

afterAll(async () => {
  try {
    if (!fixtureAttempted) return;
    // Todos os IDs de entrada são fixados antes de criar a fixture. A criação
    // é transacional e os IDs derivados são conhecidos antes de tentar o commit.
    const cleanupErrors: unknown[] = [];
    for (const [actor, org] of [[owner, organization], [other, otherOrganization]]) {
      try {
        await withTransaction(async sql => {
          if (actor === owner) {
            await removeFile(sql);
            await sql.query('delete from public.registros_realizacao where id = $1 and atividade_id = $2', [record, activity]);
            await sql.query('delete from public.atividades where id = $1 and organizacao_id = $2', [activity, org ?? null]);
          }
          await sql.query(`
            delete from public.vinculos_publicadores
            where conta_id in (select id from public.contas_acesso where auth_user_id = $1 and organizacao_id = $2)
          `, [actor, org ?? null]);
          await sql.query('delete from public.sujeitos_publicadores where organizacao_legada_id = $1', [org ?? null]);
          await sql.query('delete from public.contas_acesso where auth_user_id = $1 and organizacao_id = $2', [actor, org ?? null]);
          await sql.query('delete from public.organizacoes where id = $1', [org ?? null]);
          await sql.query('delete from auth.users where id = $1 and email = $2', [actor, `oss01b-${actor}@example.invalid`]);
        });
      } catch (error) {
        cleanupErrors.push(new Error(`Limpeza OSS-01B pendente para a fixture ${actor}.`, {cause: error}));
      }
    }
    if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Falha na limpeza das fixtures OSS-01B.');
  } finally {
    await closeDatabasePool();
    if (previousDbUrl === undefined) delete process.env.SUPABASE_DB_URL;
    else process.env.SUPABASE_DB_URL = previousDbUrl;
  }
}, 15_000);

describe('OSS-01B — confirmação persistente', () => {
  it('duas confirmações concorrentes produzem uma escrita e um 409', async () => {
    const bothPending = barrier();
    const releaseCommit = barrier();
    const pids: number[] = [];
    const rowCounts: number[] = [];
    let atStat = 0;
    let winner: number | undefined;
    const transaction: Transaction = operation => withTransaction(async sql => {
      const pid = await backendPid(sql);
      pids.push(pid);
      return operation(observeUpdate(sql, async proceed => {
        rowCounts.push(await proceed());
        if (winner === undefined) {
          winner = pid;
          await releaseCommit.reached;
        }
      }));
    });
    const confirmation = service({transaction, async stat() {
      if (++atStat === 2) bothPending.release();
      await bothPending.reached;
    }});
    const result = Promise.allSettled([
      confirmation.confirmarUpload({arquivoId: file}),
      confirmation.confirmarUpload({arquivoId: file}),
    ]);
    try {
      await until('vencedora escreveu', () => winner !== undefined);
      await until('perdedora bloqueada pela vencedora', async () => {
        const waiter = pids.find(pid => pid !== winner);
        return waiter !== undefined && await blockedBy(waiter, winner!);
      });
      expect(atStat).toBe(2);
      expect(new Set(pids).size).toBe(2);
    } finally {
      bothPending.release();
      releaseCommit.release();
      await result;
    }
    const outcomes = await result;
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toEqual([
      {status: 'fulfilled', value: {estado: 'confirmado'}},
    ]);
    expect(outcomes.filter(outcome => outcome.status === 'rejected')).toMatchObject([
      {reason: {status: 409, message: 'Arquivo não está pendente.'}},
    ]);
    expect(rowCounts).toEqual([1, 0]);
    expect(await storedState()).toBe('confirmado');
  }, 15_000);

  it('recusa com 403 uma suspensão confirmada após a autorização preliminar', async () => {
    const resumeWrite = barrier();
    let atWrite = false;
    const confirmation = service({async beforeWrite() {
      atWrite = true;
      await resumeWrite.reached;
    }});
    const result = Promise.allSettled([confirmation.confirmarUpload({arquivoId: file})]);
    try {
      await until('autorização preliminar concluída', () => atWrite);
      await withTransaction(suspend);
    } finally {
      resumeWrite.release();
      await result;
    }
    expect(await result).toMatchObject([{status: 'rejected', reason: {status: 403}}]);
    expect(await storedState()).toBe('pendente');
  }, 15_000);

  it('suspensão direta espera o lock de autorização até o commit da confirmação', async () => {
    const releaseWrite = barrier();
    let writer: number | undefined;
    let revoker: number | undefined;
    let atUpdate = false;
    let suspension: Promise<PromiseSettledResult<void>[]> | undefined;
    const transaction: Transaction = operation => withTransaction(async sql => {
      writer = await backendPid(sql);
      return operation(observeUpdate(sql, async proceed => {
        atUpdate = true;
        await releaseWrite.reached;
        await proceed();
      }));
    });
    const result = Promise.allSettled([service({transaction}).confirmarUpload({arquivoId: file})]);
    try {
      await until('confirmação chegou ao CAS', () => atUpdate);
      suspension = Promise.allSettled([withTransaction(async sql => {
        revoker = await backendPid(sql);
        await suspend(sql);
      })]);
      await until('suspensão bloqueada pela confirmação', async () =>
        revoker !== undefined && writer !== undefined && await blockedBy(revoker, writer));
      expect(await storedState()).toBe('pendente');
    } finally {
      releaseWrite.release();
      await Promise.all([result, suspension]);
    }
    expect(await result).toEqual([{status: 'fulfilled', value: {estado: 'confirmado'}}]);
    expect(await suspension).toEqual([{status: 'fulfilled', value: undefined}]);
    expect(await storedState()).toBe('confirmado');
  }, 15_000);

  it('nega outro titular na autorização preliminar e na escrita persistente', async () => {
    const access = createPrivateFileRepository();
    expect(otherOrganization).not.toBe(organization);
    await withTransaction(async sql => {
      const account = await sql.query(`
        select c.id from public.contas_acesso c
        join public.organizacoes o on o.id = c.organizacao_id
        where c.auth_user_id = $1 and c.organizacao_id = $2
          and c.papel = 'organizacao' and c.situacao = 'ativa'
          and o.estado_validacao = 'validada'
      `, [other, otherOrganization]);
      expect(account.rowCount).toBe(1);
    });
    await expect(access.authorize({actorId: other, registroId: record, scope: 'upload'})).resolves.toBe(false);
    const stat = vi.fn(async () => {});
    await expect(service({actorId: other, stat}).confirmarUpload({arquivoId: file}))
      .rejects.toMatchObject({status: 403});
    expect(stat).not.toHaveBeenCalled();
    await expect(access.repository.markConfirmed({actorId: other, arquivoId: file, registroId: record}))
      .rejects.toMatchObject({status: 403});
    expect(await storedState()).toBe('pendente');
  });
});
