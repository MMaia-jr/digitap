import {test, expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';

test.describe.configure({mode: 'serial'});
const origin = 'http://127.0.0.1:3215';
const evidenceDir = process.env.A_PRACA_EVIDENCE_DIR;
const bucketName = process.env.SUPABASE_PRIVATE_EVIDENCE_BUCKET;
const actors = [];
const ownedActivityIds = [];
const ownedRecordIds = [];
const ownedObjectKeys = new Set();
const privateMarkers = new Set();
const observations = [];
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137]);
let db;
let admin;
let bucketOwned = false;
let fixtureSetupStarted = false;

async function createActor(browser, label) {
  const email = `oss01d-${randomUUID()}@example.invalid`;
  const password = `${randomUUID()}aA1!`;
  const result = await admin.auth.admin.createUser({email, password, email_confirm: true});
  if (result.error || !result.data.user) throw new Error('Fixture Auth sintética falhou.');
  const actor = {id: result.data.user.id, email, password, label};
  actors.push(actor);
  actor.context = await browser.newContext({baseURL: origin});
  await actor.context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['http://127.0.0.1:3215', 'http://127.0.0.1:56151'].includes(url.origin)
      ? route.continue() : route.abort();
  });
  actor.page = await actor.context.newPage();
  return actor;
}

async function login(actor) {
  await actor.page.goto('/login');
  await actor.page.getByLabel('E-mail', {exact: true}).fill(actor.email);
  await actor.page.getByLabel('Senha', {exact: true}).fill(actor.password);
  await actor.page.getByRole('button', {name: 'Entrar', exact: true}).click();
  await expect(actor.page).toHaveURL(`${origin}/`);
}

async function addRecord(actor, kind) {
  const activityId = randomUUID();
  const recordId = randomUUID();
  ownedActivityIds.push(activityId);
  ownedRecordIds.push(recordId);
  await db.query(`
    insert into public.atividades
      (id, organizacao_id, sujeito_id, criada_por_conta_id, politica_publicacao,
       titulo, descricao, inicio_previsto, orientacao_acesso)
    values ($1, $2, $3, $4, $5, $6, 'Fixture sintética OSS-01D; nenhum encontro real.', now(), 'Ensaio local')
  `, [activityId, actor.organizationId ?? null, actor.subjectId, actor.accountId,
    actor.organizationId ? 'i3' : 'i4', `Registro sintético de ${kind} OSS-01D`]);
  await db.query(`
    insert into public.registros_realizacao
      (id, atividade_id, data_realizacao, descricao_factual, origem_informacao)
    values ($1, $2, current_date, $3, 'Declaração sintética de teste')
  `, [recordId, activityId, `Relato sintético de ${kind}; não é fato ocorrido.`]);
  actor.activityId = activityId;
  actor.recordId = recordId;
}

test.beforeAll(async ({browser}) => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') throw new Error('Limpeza sintética OSS-01D não autorizada.');
  if (!/^oss01d-private-[a-z0-9-]+$/.test(bucketName ?? '')
    || !/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(evidenceDir ?? '')) throw new Error('Bucket ou evidência fora do escopo OSS-01D.');
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase',
    ['status', '--workdir', process.cwd(), '--output', 'json'],
    {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: {...process.env, SUPABASE_TELEMETRY_DISABLED: '1'}}));
  const api = new URL(local.API_URL);
  const database = new URL(local.DB_URL);
  if (api.origin !== 'http://127.0.0.1:56151' || database.hostname !== '127.0.0.1'
    || database.port !== '56152' || database.pathname !== '/postgres' || !database.password) {
    throw new Error('Fixture OSS-01D bloqueada: destino não é o Supabase local autorizado.');
  }
  db = new Client({connectionString: local.DB_URL});
  await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
  const migration = await db.query(`select to_regclass('public.evidencias_arquivos_privados') as table_name,
    current_setting('transaction_isolation') as isolation`);
  if (migration.rows[0].table_name !== 'evidencias_arquivos_privados' || migration.rows[0].isolation !== 'read committed') {
    throw new Error('Preflight OSS-01D: migration local ou isolamento inesperado.');
  }
  const buckets = await admin.storage.listBuckets();
  if (buckets.error || buckets.data.some(bucket => bucket.name === bucketName)) throw new Error('Bucket OSS-01D indisponível ou preexistente.');
  const createdBucket = await admin.storage.createBucket(bucketName, {
    public: false, fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
  });
  if (createdBucket.error) {
    const afterFailure = await admin.storage.listBuckets();
    bucketOwned = !afterFailure.error && afterFailure.data.some(bucket => bucket.name === bucketName);
    throw new Error('Não foi possível criar o bucket privado sintético OSS-01D.');
  }
  bucketOwned = true;
  const detail = await admin.storage.getBucket(bucketName);
  if (detail.error || detail.data.public !== false) throw new Error('Bucket OSS-01D não confirmou acesso privado.');

  fixtureSetupStarted = true;
  const initiative = await createActor(browser, 'iniciativa técnica sintética; sem mandato institucional');
  const registeredOrg = await admin.rpc('criar_organizacao_com_sujeito', {
    p_auth_user_id: initiative.id, p_nome_publico: `Fixture sintética — iniciativa técnica ${randomUUID()}`, p_canal_publico: null,
  });
  if (registeredOrg.error) throw new Error('Fixture de iniciativa sintética falhou.');
  initiative.organizationId = registeredOrg.data;
  initiative.subjectId = (await db.query('select id from public.sujeitos_publicadores where organizacao_legada_id=$1', [initiative.organizationId])).rows[0].id;
  initiative.accountId = (await db.query('select id from public.contas_acesso where auth_user_id=$1', [initiative.id])).rows[0].id;
  await db.query("update public.organizacoes set estado_validacao='validada' where id=$1", [initiative.organizationId]);
  await addRecord(initiative, 'iniciativa técnica sintética');

  const collective = await createActor(browser, 'coletivo independente sintético; sem representação de A Praça');
  collective.accountId = (await db.query("insert into public.contas_acesso(auth_user_id,papel,situacao,ativa_desde) values($1,'publicador','ativa',clock_timestamp()) returning id", [collective.id])).rows[0].id;
  await db.query('begin');
  try {
    collective.subjectId = (await db.query(`insert into public.sujeitos_publicadores
      (tipo,nome_publico,estado,modo_publicacao,risco,origem,criado_por_conta_id)
      values('coletivo_informal',$1,'ativo','curadoria_previa','medio','cadastro',$2) returning id`,
    [`Fixture sintética — coletivo independente ${randomUUID()}`, collective.accountId])).rows[0].id;
    await db.query("insert into public.coletivos_informais(sujeito_id,nome_em_curadoria) values($1,'Fixture sintética OSS-01D')", [collective.subjectId]);
    await db.query(`insert into public.vinculos_publicadores
      (sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,ativada_em)
      values($1,$2,'titular',array['ler_privado','editar','enviar'],'ativo','cadastro',clock_timestamp())`,
    [collective.subjectId, collective.accountId]);
    await db.query('commit');
  } catch (error) { await db.query('rollback'); throw error; }
  await addRecord(collective, 'coletivo independente sintético');

  const person = await createActor(browser, 'Marcos — pessoa fictícia de teste');
  const registeredPerson = await admin.rpc('criar_pf_com_sujeito', {p_auth_user_id: person.id, p_nome_publico: 'Marcos — pessoa fictícia de teste'});
  if (registeredPerson.error) throw new Error('Fixture PF sintética falhou.');
  person.subjectId = registeredPerson.data;
  person.accountId = (await db.query('select id from public.contas_acesso where auth_user_id=$1', [person.id])).rows[0].id;
  await addRecord(person, 'pessoa física sintética');

  const collaborator = await createActor(browser, 'colaborador independente sintético');
  collaborator.organizationId = initiative.organizationId;
  collaborator.accountId = (await db.query(`insert into public.contas_acesso(auth_user_id,organizacao_id,papel,situacao)
    values($1,$2,'organizacao','ativa') returning id`, [collaborator.id, initiative.organizationId])).rows[0].id;
  await db.query(`insert into public.vinculos_publicadores
    (sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,ativada_em)
    values($1,$2,'representante',array['ler_privado'],'ativo','cadastro',clock_timestamp())`,
  [initiative.subjectId, collaborator.accountId]);

  const unrelated = await createActor(browser, 'titular não relacionado sintético');
  const registeredOther = await admin.rpc('criar_pf_com_sujeito', {p_auth_user_id: unrelated.id, p_nome_publico: 'Titular sintético não relacionado'});
  if (registeredOther.error) throw new Error('Fixture não relacionada falhou.');
  unrelated.subjectId = registeredOther.data;
  unrelated.accountId = (await db.query('select id from public.contas_acesso where auth_user_id=$1', [unrelated.id])).rows[0].id;

  for (const actor of [initiative, collective, person, collaborator, unrelated]) await login(actor);
}, 90_000);

test.afterAll(async () => {
  const errors = [];
  if (db && admin && bucketOwned) {
    try {
      const rows = (await db.query(`select object_key from public.evidencias_arquivos_privados where registro_id=any($1::uuid[])`, [ownedRecordIds])).rows;
      for (const row of rows) ownedObjectKeys.add(row.object_key);
      if (ownedObjectKeys.size) {
        const removed = await admin.storage.from(bucketName).remove([...ownedObjectKeys]);
        if (removed.error) throw new Error('Objetos sintéticos conhecidos não puderam ser removidos.');
      }
      const contents = await admin.storage.from(bucketName).list('', {limit: 1000});
      if (contents.error || contents.data.length) throw new Error('Bucket OSS-01D não ficou vazio; conteúdo inesperado foi preservado.');
      const deletedBucket = await admin.storage.deleteBucket(bucketName);
      if (deletedBucket.error) throw new Error('Bucket temporário OSS-01D não pôde ser removido.');
      bucketOwned = false;
    } catch (error) { errors.push(error); }
  }
  if (db && fixtureSetupStarted) {
    try {
      await db.query('begin');
      const accountIds = actors.map(actor => actor.accountId).filter(Boolean);
      await db.query("delete from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=any($1::uuid[])", [ownedRecordIds]);
      await db.query('delete from public.evidencias_arquivos_privados where registro_id=any($1::uuid[])', [ownedRecordIds]);
      await db.query('delete from public.evidencias where registro_id=any($1::uuid[])', [ownedRecordIds]);
      await db.query('delete from public.registros_realizacao where id=any($1::uuid[])', [ownedRecordIds]);
      await db.query('delete from public.atividades where id=any($1::uuid[])', [ownedActivityIds]);
      if (accountIds.length) await db.query('delete from public.vinculos_publicadores where conta_id=any($1::uuid[])', [accountIds]);
      const subjectIds = actors.map(actor => actor.subjectId).filter(Boolean);
      if (subjectIds.length) {
        await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])', [subjectIds]);
        await db.query('delete from public.coletivos_informais where sujeito_id=any($1::uuid[])', [subjectIds]);
        await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])', [subjectIds]);
      }
      if (accountIds.length) await db.query('delete from public.contas_acesso where id=any($1::uuid[])', [accountIds]);
      const organizationIds = actors.map(actor => actor.organizationId).filter(Boolean);
      if (organizationIds.length) await db.query('delete from public.organizacoes where id=any($1::uuid[])', [[...new Set(organizationIds)]]);
      const userIds = actors.map(actor => actor.id).filter(Boolean);
      await db.query('commit');
      for (const actor of actors) if ((await admin.auth.admin.deleteUser(actor.id)).error) throw new Error('Auth fixture sintética não removida.');
      const residual = await db.query(`select
        (select count(*) from public.atividades where id=any($1::uuid[]))::int as activities,
        (select count(*) from public.registros_realizacao where id=any($2::uuid[]))::int as records,
        (select count(*) from public.evidencias_arquivos_privados where registro_id=any($2::uuid[]))::int as files,
        (select count(*) from auth.users where id=any($3::uuid[]))::int as users`, [ownedActivityIds, ownedRecordIds, userIds]);
      if (Object.values(residual.rows[0]).some(Number)) throw new Error('Fixture própria OSS-01D permaneceu após limpeza.');
      observations.push({cleanup: 'PASS', residual: residual.rows[0]});
    } catch (error) {
      await db.query('rollback').catch(() => {});
      errors.push(error);
    }
  }
  await db?.end().catch(() => {});
  if (evidenceDir) {
    mkdirSync(evidenceDir, {recursive: true});
    writeFileSync(`${evidenceDir}/private-evidence-e2e.json`, JSON.stringify({observations}, null, 2) + '\n', {flag: 'wx'});
  }
  if (errors.length) throw new AggregateError(errors, 'Limpeza limitada às fixtures OSS-01D incompleta; interromper e preservar resíduos próprios.');
});

test('DOG-01: titular envia bytes privados pela tela; PF, coletivo, organização, colaborador e revogação respeitam seus vínculos', async () => {
  for (const owner of actors.slice(0, 3)) {
    await owner.page.goto(`/dashboard/atividade/${owner.activityId}`);
    await expect(owner.page.getByRole('region', {name: 'Registro privado'})).toBeVisible();
    await expect(owner.page.getByRole('heading', {name: 'Anexos privados'})).toBeVisible();
    const file = {name: 'evidencia-sintetica.png', mimeType: 'image/png', buffer: png};
    const input = owner.page.getByLabel('Arquivo de evidência privada');
    await input.setInputFiles(file);
    const confirmResponse = owner.page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/confirmar')
      && response.request().method() === 'POST');
    const initResponse = owner.page.waitForResponse(response => new URL(response.url()).pathname === `/api/registros/${owner.recordId}/arquivos` && response.request().method() === 'POST');
    await owner.page.getByRole('button', {name: 'Enviar evidência privada'}).click();
    const initialized = await initResponse;
    expect(initialized.status()).toBe(200);
    const issued = await initialized.json();
    ownedObjectKeys.add(issued.arquivo.objectKey);
    privateMarkers.add(issued.arquivo.objectKey);
    privateMarkers.add(issued.arquivo.uploadToken);
    privateMarkers.add(bucketName);
    const confirmation = await confirmResponse;
    expect(new URL(confirmation.url()).pathname).toBe(`/api/registros/${owner.recordId}/arquivos/${issued.arquivo.id}/confirmar`);
    expect(confirmation.status()).toBe(200);
    await expect(owner.page.getByRole('link', {name: 'Abrir anexo privado'})).toBeVisible();
    expect(await owner.page.locator('body').innerText()).not.toContain(issued.arquivo.objectKey);
    expect(await owner.page.content()).not.toContain(issued.arquivo.uploadToken);
    const download = await owner.page.request.get(`/api/registros/${owner.recordId}/arquivos/${issued.arquivo.id}`);
    expect(download.status()).toBe(200);
    expect(Buffer.from(await download.body())).toEqual(png);
    observations.push({role: owner.label, upload: initialized.status(), download: download.status(), bytes: png.length});

    const pendingResponse = await owner.page.request.post(`/api/registros/${owner.recordId}/arquivos`, {
      headers: {origin}, data: {contentType: 'image/png', sizeBytes: png.length},
    });
    expect(pendingResponse.status()).toBe(200);
    const pending = await pendingResponse.json();
    ownedObjectKeys.add(pending.arquivo.objectKey);
    privateMarkers.add(pending.arquivo.objectKey);
    privateMarkers.add(pending.arquivo.uploadToken);
    const pendingRead = await owner.page.request.get(`/api/registros/${owner.recordId}/arquivos/${pending.arquivo.id}`);
    expect(pendingRead.status()).toBe(409);
  }

  const org = actors[0];
  const first = await db.query('select id from public.evidencias_arquivos_privados where registro_id=$1 and estado=\'confirmado\' order by id limit 1', [org.recordId]);
  expect(first.rowCount).toBe(1);
  const fileId = first.rows[0].id;
  const outsider = actors.at(-1);
  const denied = await outsider.page.request.get(`/api/registros/${org.recordId}/arquivos/${fileId}`);
  expect(denied.status()).toBe(403);
  const unrelatedList = await outsider.page.request.get(`/api/registros/${org.recordId}/arquivos`);
  observations.push({unrelatedListingStatus: unrelatedList.status()});
  expect(unrelatedList.status()).toBe(403);
  const collaborator = actors[3];
  const detailResponse = await collaborator.page.goto(`/dashboard/atividade/${org.activityId}`);
  const collaboratorList = await collaborator.page.request.get(`/api/registros/${org.recordId}/arquivos`);
  observations.push({collaboratorDetailStatus: detailResponse?.status() ?? null,
    collaboratorListingStatus: collaboratorList.status(),
    recordRegionVisible: await collaborator.page.getByRole('region', {name: 'Registro privado'}).count() === 1});
  await expect(collaborator.page.getByRole('link', {name: 'Abrir anexo privado'})).toBeVisible();
  await expect(collaborator.page.getByLabel('Arquivo de evidência privada')).toHaveCount(0);
  const signed = await collaborator.page.request.get(`/api/registros/${org.recordId}/arquivos/${fileId}`, {maxRedirects: 0});
  expect(signed.status()).toBe(302);
  const oldUrl = signed.headers().location;
  await db.query(`update public.vinculos_publicadores set situacao='revogado',revogada_em=clock_timestamp()
    where conta_id=$1 and sujeito_id=$2 and atual`, [collaborator.accountId, org.subjectId]);
  expect((await collaborator.page.request.get(`/api/registros/${org.recordId}/arquivos/${fileId}`)).status()).toBe(403);
  const revokedInit = await collaborator.page.request.post(`/api/registros/${org.recordId}/arquivos`, {
    headers: {origin}, data: {contentType: 'image/png', sizeBytes: png.length},
  });
  expect(revokedInit.status()).toBe(403);
  const oldLinkStillValid = await collaborator.page.request.get(oldUrl);
  expect(oldLinkStillValid.status()).toBe(200);
  expect(Buffer.from(await oldLinkStillValid.body())).toEqual(png);

  const publicFeed = await outsider.page.request.get('/api/public/atividades');
  expect(publicFeed.status()).toBe(200);
  const publicContent = JSON.stringify(await publicFeed.json());
  expect([...privateMarkers].some(marker => marker && publicContent.includes(marker))).toBe(false);
  const publicProfile = await outsider.page.request.get(`/perfil/${org.subjectId}`);
  expect(publicProfile.status()).toBe(404); // Perfil sem snapshot publicado permanece oculto.
  observations.push({role: outsider.label, denied: denied.status(), listing: unrelatedList.status(), revoked: 403,
    revokedUpload: revokedInit.status(), priorUrlTtl: oldLinkStillValid.status(), publicFeed: publicFeed.status(),
    privateMarkersAbsentFromPublicFeed: true, unpublishedProfileHidden: publicProfile.status()});
});
