import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {closeDatabasePool, withTransaction} from '../../src/lib/database.server';
import {createPrivateFileRepository} from '../../src/lib/evidence/private-files.repository.server';
import {createSupabasePrivateFileStorage} from '../../src/lib/evidence/private-files.storage.server';
import {createPrivateFileService} from '../../src/lib/evidence/private-files.server';

vi.mock('server-only', () => ({}));

const owner = randomUUID();
const unrelated = randomUUID();
const pfActor = randomUUID();
const collectiveActor = randomUUID();
const representative = randomUUID();
const activity = randomUUID();
const record = randomUUID();
const pfActivity = randomUUID();
const pfRecord = randomUUID();
const collectiveActivity = randomUUID();
const collectiveRecord = randomUUID();
const bucketName = `oss01c-private-${randomUUID()}`;
const previousDbUrl = process.env.SUPABASE_DB_URL;
const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137]);
let organization: string;
let unrelatedOrganization: string;
let pfSubject: string;
let collectiveSubject: string;
let admin: SupabaseClient | undefined;
let bucketOwned = false;
let fixtureAttempted = false;
const ownObjectKeys = new Set<string>();
const ownFileIds = new Set<string>();

function signedStorage() {
  if (!admin) throw new Error('Supabase Storage local não inicializado.');
  const adapter = createSupabasePrivateFileStorage(admin, bucketName);
  return {
    ...adapter,
    signedUpload: vi.fn(adapter.signedUpload),
    signedRead: vi.fn(adapter.signedRead),
  };
}

function service(actorId: string, storage = signedStorage()) {
  const access = createPrivateFileRepository();
  return {service: createPrivateFileService({
    verifyActor: async () => actorId,
    authorize: access.authorize,
    repository: access.repository,
    storage,
  }), storage};
}

async function currentFileState(fileId: string) {
  return withTransaction(async sql => (await sql.query<{estado: string}>(
    'select estado from public.evidencias_arquivos_privados where id = $1 and registro_id = $2',
    [fileId, record],
  )).rows[0]?.estado);
}

async function startUpload(actorId = owner, sizeBytes = bytes.length) {
  const s = service(actorId);
  const started = await s.service.iniciarUpload({registroId: record, contentType: 'image/png', sizeBytes});
  ownFileIds.add(started.arquivoId);
  ownObjectKeys.add(started.objectKey);
  return {...s, started};
}

async function upload(client: SupabaseClient, objectKey: string, token: string, body = bytes) {
  const result = await client.storage.from(bucketName).uploadToSignedUrl(objectKey, token, body, {
    contentType: 'image/png', upsert: false,
  });
  if (result.error) throw new Error('Upload sintético no Storage local falhou.');
}

async function resetOwnerLink() {
  await withTransaction(async sql => {
    const current = (await sql.query<{id: string; versao: number; situacao: string}>(`
      select v.id, v.versao, v.situacao from public.vinculos_publicadores v
      join public.contas_acesso c on c.id = v.conta_id
      where c.auth_user_id = $1 and v.atual
    `, [owner])).rows[0];
    if (current?.situacao === 'ativo') return;
    if (!current) throw new Error('Vínculo sintético ausente.');
    await sql.query('update public.vinculos_publicadores set atual = false where id = $1 and versao = $2', [current.id, current.versao]);
    await sql.query(`
      insert into public.vinculos_publicadores
        (id, versao, atual, sujeito_id, conta_id, papel_vinculo, escopos, situacao, origem, ativada_em)
      select id, versao + 1, true, sujeito_id, conta_id, papel_vinculo,
             array['ler_privado','editar','enviar','publicar','gerir_vinculo']::text[],
             'ativo', origem, clock_timestamp()
      from public.vinculos_publicadores where id = $1 and versao = $2
    `, [current.id, current.versao]);
  });
}

beforeAll(async () => {
  if (process.env.NODE_ENV !== 'test' || process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') {
    throw new Error('Fixtures OSS-01C exigem ambiente local e limpeza autorizada.');
  }
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', [
    'status', '--workdir', process.cwd(), '--output', 'json',
  ], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: {...process.env, SUPABASE_TELEMETRY_DISABLED: '1'}}));
  const api = new URL(local.API_URL);
  const db = new URL(local.DB_URL);
  if (api.origin !== 'http://127.0.0.1:56151' || db.hostname !== '127.0.0.1'
    || db.port !== '56152' || db.pathname !== '/postgres' || db.username !== 'postgres'
    || !db.password || db.search || db.hash) throw new Error('Destino OSS-01C fora do loopback autorizado.');
  if (!local.SECRET_KEY?.startsWith('sb_secret_')) throw new Error('Credencial local de teste indisponível.');
  process.env.SUPABASE_DB_URL = local.DB_URL;
  admin = createClient(local.API_URL, local.SECRET_KEY, {auth: {persistSession: false, autoRefreshToken: false}});

  await withTransaction(async sql => {
    const ready = await sql.query<{ready: boolean}>(`
      select current_setting('transaction_isolation') = 'read committed'
        and to_regclass('public.evidencias_arquivos_privados') is not null as ready
    `);
    if (!ready.rows[0].ready) throw new Error('Preflight PostgreSQL OSS-01B não atendido.');
  });

  const listed = await admin.storage.listBuckets();
  if (listed.error) throw new Error('Preflight Storage local indisponível.');
  if (listed.data.some(bucket => bucket.name === bucketName)) throw new Error('Bucket sintético já existia antes da execução.');
  const created = await admin.storage.createBucket(bucketName, {public: false, fileSizeLimit: 25 * 1024 * 1024, allowedMimeTypes: ['image/png']});
  if (created.error) {
    const afterFailure = await admin.storage.listBuckets();
    bucketOwned = !afterFailure.error && afterFailure.data.some(bucket => bucket.name === bucketName);
    throw new Error(`Não foi possível criar o bucket privado sintético local (${created.error.status ?? 'unknown'}/${created.error.statusCode ?? 'unknown'}).`);
  }
  bucketOwned = true;
  const bucketDetails = await admin.storage.getBucket(bucketName);
  if (created.data.name !== bucketName || bucketDetails.error || bucketDetails.data.public !== false) {
    throw new Error('Bucket OSS-01C não confirmou escopo privado.');
  }

  fixtureAttempted = true;
  await withTransaction(async sql => {
    for (const actor of [owner, unrelated, pfActor, collectiveActor, representative]) {
      await sql.query('insert into auth.users (id, email) values ($1, $2)', [actor, `${actor}@example.invalid`]);
      if (actor === owner || actor === unrelated) {
        const createdOrganization = await sql.query<{id: string}>(
          'select public.criar_organizacao_com_sujeito($1, $2, null) as id',
          [actor, `Organização sintética OSS-01C ${actor}`],
        );
        if (actor === owner) organization = createdOrganization.rows[0].id;
        else unrelatedOrganization = createdOrganization.rows[0].id;
      }
    }
    await sql.query("update public.organizacoes set estado_validacao = 'validada' where id = any($1::uuid[])", [[organization, unrelatedOrganization]]);
    const pf = await sql.query<{id: string}>('select public.criar_pf_com_sujeito($1, $2) as id', [pfActor, 'PF sintética OSS-01C']);
    pfSubject = pf.rows[0].id;
    const collectiveAccount = await sql.query<{id: string}>(
      "insert into public.contas_acesso (auth_user_id, papel, situacao, ativa_desde) values ($1, 'publicador', 'ativa', clock_timestamp()) returning id",
      [collectiveActor],
    );
    const collective = await sql.query<{id: string}>(`
      insert into public.sujeitos_publicadores
        (tipo, nome_publico, estado, modo_publicacao, risco, origem, criado_por_conta_id)
      values ('coletivo_informal', 'Coletivo sintético OSS-01C', 'ativo', 'curadoria_previa', 'medio', 'cadastro', $1)
      returning id
    `, [collectiveAccount.rows[0].id]);
    collectiveSubject = collective.rows[0].id;
    await sql.query("insert into public.coletivos_informais (sujeito_id, nome_em_curadoria) values ($1, 'Coletivo sintético OSS-01C')", [collectiveSubject]);
    await sql.query(`
      insert into public.vinculos_publicadores
        (sujeito_id, conta_id, papel_vinculo, escopos, situacao, origem, ativada_em)
      values ($1, $2, 'titular', array['ler_privado','editar','enviar'], 'ativo', 'cadastro', clock_timestamp())
    `, [collectiveSubject, collectiveAccount.rows[0].id]);
    const ownerAccount = await sql.query<{id: string}>(
      'select id from public.contas_acesso where auth_user_id = $1', [owner],
    );
    await sql.query(`
      insert into public.contas_acesso (auth_user_id, organizacao_id, papel, situacao)
      values ($1, $2, 'organizacao', 'ativa')
    `, [representative, organization]);
    await sql.query(`
      insert into public.vinculos_publicadores
        (sujeito_id, conta_id, papel_vinculo, escopos, situacao, origem, ativada_em)
      values ((select id from public.sujeitos_publicadores where organizacao_legada_id = $1), $2,
              'representante', array['ler_privado','editar'], 'ativo', 'cadastro', clock_timestamp())
    `, [organization, (await sql.query<{id: string}>('select id from public.contas_acesso where auth_user_id = $1', [representative])).rows[0].id]);
    await sql.query(`
      insert into public.atividades
        (id, organizacao_id, criada_por_conta_id, titulo, descricao, inicio_previsto, orientacao_acesso)
      select $1, organizacao_id, id, 'Atividade sintética OSS-01C',
             'Atividade sintética para integração de Storage.', now(), 'Fixture local'
      from public.contas_acesso where auth_user_id = $2
    `, [activity, owner]);
    await sql.query(`
      insert into public.atividades
        (id, organizacao_id, sujeito_id, criada_por_conta_id, politica_publicacao,
         titulo, descricao, inicio_previsto, orientacao_acesso)
      values ($1, null, $2, $3, 'i4', 'Atividade PF sintética',
              'Atividade de verificação do perfil PF sintético.', now(), 'Fixture local')
    `, [pfActivity, pfSubject, (await sql.query<{id: string}>('select id from public.contas_acesso where auth_user_id = $1', [pfActor])).rows[0].id]);
    await sql.query(`
      insert into public.atividades
        (id, organizacao_id, sujeito_id, criada_por_conta_id, politica_publicacao,
         titulo, descricao, inicio_previsto, orientacao_acesso)
      values ($1, null, $2, $3, 'i4', 'Atividade coletivo sintética',
              'Atividade de verificação do coletivo sintético.', now(), 'Fixture local')
    `, [collectiveActivity, collectiveSubject, collectiveAccount.rows[0].id]);
    await sql.query(`
      insert into public.registros_realizacao
        (id, atividade_id, data_realizacao, descricao_factual, origem_informacao)
      values ($1, $2, current_date, 'Relato sintético OSS-01C.', 'Fixture local')
    `, [record, activity]);
    await sql.query(`
      insert into public.registros_realizacao
        (id, atividade_id, data_realizacao, descricao_factual, origem_informacao)
      values ($1, $2, current_date, 'Relato sintético PF OSS-01C.', 'Fixture local'),
             ($3, $4, current_date, 'Relato sintético coletivo OSS-01C.', 'Fixture local')
    `, [pfRecord, pfActivity, collectiveRecord, collectiveActivity]);
    expect(ownerAccount.rowCount).toBe(1);
  });
}, 20_000);

beforeEach(resetOwnerLink);

afterEach(async () => {
  if (admin && bucketOwned && ownObjectKeys.size) {
    const keys = [...ownObjectKeys];
    const removed = await admin.storage.from(bucketName).remove(keys);
    if (removed.error) throw new Error('Limpeza dos objetos OSS-01C próprios falhou.');
    ownObjectKeys.clear();
  }
  if (ownFileIds.size) {
    await withTransaction(async sql => {
      for (const id of ownFileIds) {
        await sql.query('delete from public.evidencias_arquivos_privados where id = $1 and registro_id = $2', [id, record]);
      }
    });
    ownFileIds.clear();
  }
});

afterAll(async () => {
  const errors: unknown[] = [];
  try {
    if (bucketOwned && admin) {
      const remaining = await admin.storage.from(bucketName).list('', {limit: 1000});
      if (remaining.error) throw new Error('Não foi possível verificar a limpeza do bucket OSS-01C.');
      if (remaining.data.length) throw new Error('Bucket OSS-01C contém objetos não identificados; preservado sem exclusão.');
      const deleted = await admin.storage.deleteBucket(bucketName);
      if (deleted.error) throw new Error('Bucket privado OSS-01C não pôde ser removido.');
      bucketOwned = false;
    }
  } catch (error) { errors.push(error); }
  try {
    if (fixtureAttempted) {
      await withTransaction(async sql => {
        await sql.query('delete from public.registros_realizacao where id = any($1::uuid[])', [[pfRecord, collectiveRecord]]);
        await sql.query('delete from public.atividades where id = any($1::uuid[])', [[pfActivity, collectiveActivity]]);
        await sql.query(`delete from public.vinculos_publicadores where conta_id in
          (select id from public.contas_acesso where auth_user_id = any($1::uuid[]))`, [[pfActor, collectiveActor, representative]]);
        await sql.query(`delete from public.pessoas_fisicas where conta_id in
          (select id from public.contas_acesso where auth_user_id = $1)`, [pfActor]);
        await sql.query(`delete from public.coletivos_informais where sujeito_id in
          (select id from public.sujeitos_publicadores where criado_por_conta_id in
            (select id from public.contas_acesso where auth_user_id = $1))`, [collectiveActor]);
        await sql.query(`delete from public.sujeitos_publicadores where criado_por_conta_id in
          (select id from public.contas_acesso where auth_user_id = any($1::uuid[]))`, [[pfActor, collectiveActor]]);
        await sql.query('delete from public.contas_acesso where auth_user_id = any($1::uuid[])', [[pfActor, collectiveActor, representative]]);
        await sql.query('delete from auth.users where id = any($1::uuid[])', [[pfActor, collectiveActor, representative]]);
      });
      await withTransaction(async sql => {
      for (const actor of [owner, unrelated]) {
        const org = actor === owner ? organization : unrelatedOrganization;
        if (actor === owner) {
          await sql.query('delete from public.registros_realizacao where id = $1 and atividade_id = $2', [record, activity]);
          await sql.query('delete from public.atividades where id = $1 and organizacao_id = $2', [activity, org]);
        }
        await sql.query(`delete from public.vinculos_publicadores where conta_id in
          (select id from public.contas_acesso where auth_user_id = $1 and organizacao_id = $2)`, [actor, org]);
        await sql.query('delete from public.sujeitos_publicadores where organizacao_legada_id = $1', [org]);
        await sql.query('delete from public.contas_acesso where auth_user_id = $1 and organizacao_id = $2', [actor, org]);
        await sql.query('delete from public.organizacoes where id = $1', [org]);
        await sql.query('delete from auth.users where id = $1 and email = $2', [actor, `${actor}@example.invalid`]);
      }
      });
    }
  } catch (error) { errors.push(error); }
  await closeDatabasePool();
  if (previousDbUrl === undefined) delete process.env.SUPABASE_DB_URL;
  else process.env.SUPABASE_DB_URL = previousDbUrl;
  if (errors.length) throw new AggregateError(errors, 'Limpeza OSS-01C incompleta; os resíduos próprios foram preservados para inspeção.');
}, 20_000);

describe('OSS-01C — integração privada real PostgreSQL + Storage local', () => {
  it('preserva titularidade PF, titularidade de coletivo e representação organizacional com escopos vigentes', async () => {
    const access = createPrivateFileRepository();
    for (const actorRecord of [[pfActor, pfRecord], [collectiveActor, collectiveRecord], [representative, record]]) {
      await expect(access.authorize({actorId: actorRecord[0], registroId: actorRecord[1], scope: 'upload'})).resolves.toBe(true);
      await expect(access.authorize({actorId: actorRecord[0], registroId: actorRecord[1], scope: 'read'})).resolves.toBe(true);
    }
    await expect(access.authorize({actorId: owner, registroId: pfRecord, scope: 'read'})).resolves.toBe(false);
    await expect(access.authorize({actorId: owner, registroId: collectiveRecord, scope: 'upload'})).resolves.toBe(false);
  });

  it('uploada bytes pelo SDK, mantém pendente, confirma e lê bytes por URL curta', async () => {
    const started = await startUpload();
    await expect(started.service.obterUrlLeitura({arquivoId: started.started.arquivoId})).rejects.toMatchObject({status: 409});
    expect(started.storage.signedRead).not.toHaveBeenCalled();
    await upload(admin!, started.started.objectKey, started.started.uploadToken);
    expect(await currentFileState(started.started.arquivoId)).toBe('pendente');
    await expect(started.service.confirmarUpload({arquivoId: started.started.arquivoId})).resolves.toEqual({estado: 'confirmado'});
    expect(await currentFileState(started.started.arquivoId)).toBe('confirmado');
    const signed = await started.service.obterUrlLeitura({arquivoId: started.started.arquivoId});
    expect(signed.expiresIn).toBeLessThanOrEqual(300);
    const response = await fetch(signed.url);
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
  });

  it('nega novas URLs de leitura ao ator sem vínculo e após revogação; URL anterior expira por TTL', async () => {
    const started = await startUpload();
    await upload(admin!, started.started.objectKey, started.started.uploadToken);
    await started.service.confirmarUpload({arquivoId: started.started.arquivoId});
    const signed = await started.service.obterUrlLeitura({arquivoId: started.started.arquivoId});
    const denied = service(unrelated);
    await expect(denied.service.obterUrlLeitura({arquivoId: started.started.arquivoId})).rejects.toMatchObject({status: 403});
    expect(denied.storage.signedRead).not.toHaveBeenCalled();
    await withTransaction(async sql => {
      await sql.query(`update public.vinculos_publicadores set situacao = 'revogado', revogada_em = clock_timestamp()
        where conta_id = (select id from public.contas_acesso where auth_user_id = $1) and atual`, [owner]);
    });
    const afterRevocation = service(owner);
    await expect(afterRevocation.service.obterUrlLeitura({arquivoId: started.started.arquivoId})).rejects.toMatchObject({status: 403});
    expect(afterRevocation.storage.signedRead).not.toHaveBeenCalled();
    const prior = await fetch(signed.url);
    expect(prior.status).toBe(200);
    expect(Buffer.from(await prior.arrayBuffer())).toEqual(bytes);
  });

  it('uma confirmação concorrente por objeto real vence e a outra recebe 409', async () => {
    const started = await startUpload();
    await upload(admin!, started.started.objectKey, started.started.uploadToken);
    const outcomes = await Promise.allSettled([
      started.service.confirmarUpload({arquivoId: started.started.arquivoId}),
      started.service.confirmarUpload({arquivoId: started.started.arquivoId}),
    ]);
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find(result => result.status === 'rejected');
    expect(rejected).toMatchObject({status: 'rejected', reason: {status: 409}});
    expect(await currentFileState(started.started.arquivoId)).toBe('confirmado');
  });

  it('objeto incompatível fica recuperável como pendente e nunca é confirmado', async () => {
    const started = await startUpload(owner, bytes.length + 1);
    await upload(admin!, started.started.objectKey, started.started.uploadToken);
    await expect(started.service.confirmarUpload({arquivoId: started.started.arquivoId})).rejects.toMatchObject({status: 422});
    expect(await currentFileState(started.started.arquivoId)).toBe('pendente');
  });

  it('conta sem autorização não recebe capacidade de upload nem URL de leitura', async () => {
    const denied = service(unrelated);
    await expect(denied.service.iniciarUpload({registroId: record, contentType: 'image/png', sizeBytes: bytes.length}))
      .rejects.toMatchObject({status: 403});
    expect(denied.storage.signedUpload).not.toHaveBeenCalled();
    expect(denied.storage.signedRead).not.toHaveBeenCalled();
  });
});
