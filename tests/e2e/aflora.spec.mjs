import {test, expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
import {fixtureCounts} from './helpers/fixture-counts.mjs';

const origin = 'http://127.0.0.1:3215';
const output = process.env.A_PRACA_EVIDENCE_DIR;
const run = randomUUID();
const title = 'Oficina de sementes e memória — demonstração fictícia';
const projectTitle = 'Sementes do Amanhã — projeto fictício';
const needText = 'Organizar a próxima troca de sementes e preparar um guia de cultivo.';
const report = 'Na oficina fictícia, o grupo separou sementes, registrou modos de cultivo e combinou testar uma nova troca comunitária.';
const publicReference = 'A ata fictícia documenta a organização das sementes para a próxima troca.';
const privateReference = 'Rascunho de trabalho reservado à organização fictícia.';
const fixtures = [];
const authorizationIds = [];
let db, admin, organization, participant, editor, projectId;

async function fixture(kind, name) {
  const item = {email: `aflora-${kind}-${run}@example.invalid`, password: `${randomUUID()}aA1!`};
  fixtures.push(item);
  const result = await admin.auth.admin.createUser({email: item.email, password: item.password, email_confirm: true});
  if (result.error || !result.data.user) throw new Error('Falha ao criar conta sintética.');
  item.id = result.data.user.id;
  if (kind === 'editor') {
    await db.query("insert into public.contas_acesso(auth_user_id,papel) values($1,'editor')", [item.id]);
    return item;
  }
  if (kind === 'representative') {
    await db.query('begin');
    try {
      const account = (await db.query(`
        insert into public.contas_acesso(auth_user_id,organizacao_id,papel)
        values($1,$2,'organizacao') returning id
      `, [item.id, organization.org])).rows[0].id;
      await db.query(`
        insert into public.vinculos_publicadores
          (sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,ativada_em)
        values($1,$2,'representante',ARRAY['enviar','publicar'],'ativo','cadastro',clock_timestamp())
      `, [organization.subject, account]);
      await db.query('commit');
    } catch (error) {
      await db.query('rollback');
      throw error;
    }
    return item;
  }
  if (kind === 'org') {
    const created = await admin.rpc('criar_organizacao_com_sujeito', {
      p_auth_user_id: item.id, p_nome_publico: name, p_canal_publico: null,
    });
    if (created.error) throw new Error('Falha na organização sintética.');
    item.org = created.data;
    await db.query("update public.organizacoes set estado_validacao='validada' where id=$1", [created.data]);
  } else {
    const created = await admin.rpc('criar_pf_com_sujeito', {p_auth_user_id: item.id, p_nome_publico: name});
    if (created.error) throw new Error('Falha no sujeito sintético.');
  }
  item.subject = (await db.query(`
    select s.id from public.sujeitos_publicadores s
    join public.contas_acesso c on c.id=s.criado_por_conta_id
    where c.auth_user_id=$1
  `, [item.id])).rows[0].id;
  return item;
}

test.skip(!output?.startsWith('operations/evidence/aflora-'), 'Ensaio executado com diretório AFLORA exclusivo.');

test.beforeAll(async () => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1' || !/^operations\/evidence\/aflora-[a-zA-Z0-9-]+$/.test(output ?? '')) {
    throw new Error('Use autorização para fixtures e um diretório de evidências exclusivo do AFLORA.');
  }
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--output', 'json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }));
  let target;
  try { target = new URL(local.DB_URL); } catch { throw new Error('Destino local inválido.'); }
  if (local.API_URL !== 'http://127.0.0.1:56151' || !['postgresql:', 'postgres:'].includes(target.protocol)
    || target.hostname !== '127.0.0.1' || target.port !== '56152' || target.pathname !== '/postgres'
    || target.username !== 'postgres' || target.search || target.hash) throw new Error('Destino fora da stack local.');
  db = new Client({connectionString: local.DB_URL, connectionTimeoutMillis: 3000, statement_timeout: 10000});
  await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, {auth: {persistSession: false, autoRefreshToken: false}});
  organization = await fixture('org', 'Associação Jardim de Ensaio — fictícia');
  participant = await fixture('pf', 'Pessoa voluntária — fictícia');
  editor = await fixture('editor');
  mkdirSync(output, {recursive: true});
});

test.afterAll(async () => {
  if (!db) return;
  try {
    const users = (await db.query('select id from auth.users where email=any($1::text[])', [fixtures.map(item => item.email)])).rows.map(row => row.id);
    let entries, before;
    await db.query('begin');
    try {
      const {rows: accounts} = await db.query('select id,organizacao_id from public.contas_acesso where auth_user_id=any($1::uuid[])', [users]);
      const accountIds = accounts.map(row => row.id);
      const organizations = accounts.flatMap(row => row.organizacao_id ? [row.organizacao_id] : []);
      const {rows: subjects} = await db.query('select id from public.sujeitos_publicadores where criado_por_conta_id=any($1::uuid[])', [accountIds]);
      const subjectIds = subjects.map(row => row.id);
      const {rows: activities} = await db.query('select id from public.atividades where criada_por_conta_id=any($1::uuid[])', [accountIds]);
      const activityIds = activities.map(row => row.id);
      const {rows: records} = await db.query('select id from public.registros_realizacao where atividade_id=any($1::uuid[])', [activityIds]);
      const recordIds = records.map(row => row.id);
      const {rows: projects} = await db.query('select id from public.projetos where sujeito_id=any($1::uuid[])', [subjectIds]);
      const projectIds = projects.map(row => row.id);
      const {rows: needs} = await db.query('select id from public.necessidades_projeto where projeto_id=any($1::uuid[])', [projectIds]);
      const needIds = needs.map(row => row.id);
      const grants = (await db.query(`
        select id from public.autorizacoes_publicacao where
          (objeto_tipo='atividade' and objeto_id=any($1::uuid[]))
          or (objeto_tipo='registro' and objeto_id=any($2::uuid[]))
      `, [activityIds, recordIds])).rows.map(row => row.id);
      const eventObjects = [...activityIds, ...recordIds, ...subjectIds, ...authorizationIds, ...grants];
      entries = {
        auth: ['auth.users', 'id', users],
        accounts: ['public.contas_acesso', 'id', accountIds],
        organizations: ['public.organizacoes', 'id', organizations],
        subjects: ['public.sujeitos_publicadores', 'id', subjectIds],
        profiles: ['public.pessoas_fisicas', 'sujeito_id', subjectIds],
        links: ['public.vinculos_publicadores', 'conta_id', accountIds],
        activities: ['public.atividades', 'id', activityIds],
        records: ['public.registros_realizacao', 'id', recordIds],
        references: ['public.evidencias', 'registro_id', recordIds],
        authorizations: ['public.autorizacoes_publicacao', 'id', grants],
        events: ['public.eventos_editoriais', 'objeto_id', eventObjects],
        moderation: ['public.casos_moderacao', 'sujeito_id', subjectIds],
        projects: ['public.projetos', 'id', projectIds],
        needs: ['public.necessidades_projeto', 'id', needIds],
        interests: ['public.interesses_necessidade', 'necessidade_id', needIds],
        capacities: ['public.capacidades', 'sujeito_id', subjectIds],
      };
      before = await fixtureCounts(db, entries);
      await db.query('delete from public.interesses_necessidade where necessidade_id=any($1::uuid[])', [needIds]);
      await db.query('delete from public.necessidades_projeto where id=any($1::uuid[])', [needIds]);
      await db.query('delete from public.capacidades where sujeito_id=any($1::uuid[])', [subjectIds]);
      await db.query('delete from public.eventos_editoriais where objeto_id=any($1::uuid[])', [eventObjects]);
      await db.query("delete from public.autorizacoes_publicacao where (objeto_tipo='atividade' and objeto_id=any($1::uuid[])) or (objeto_tipo='registro' and objeto_id=any($2::uuid[]))", [activityIds, recordIds]);
      await db.query('delete from public.evidencias where registro_id=any($1::uuid[])', [recordIds]);
      await db.query('delete from public.registros_realizacao where id=any($1::uuid[])', [recordIds]);
      await db.query('delete from public.casos_moderacao where sujeito_id=any($1::uuid[])', [subjectIds]);
      await db.query('delete from public.atividades where id=any($1::uuid[])', [activityIds]);
      await db.query('delete from public.projetos where id=any($1::uuid[])', [projectIds]);
      await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])', [subjectIds]);
      await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])', [subjectIds]);
      await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])', [subjectIds]);
      await db.query('delete from public.contas_acesso where id=any($1::uuid[])', [accountIds]);
      await db.query('delete from public.organizacoes where id=any($1::uuid[])', [organizations]);
      await db.query('commit');
    } catch (error) {
      await db.query('rollback');
      throw error;
    }
    for (const id of users) {
      if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Falha ao remover conta sintética.');
    }
    const after = await fixtureCounts(db, entries);
    writeFileSync(`${output}/aflora-fixtures.json`, JSON.stringify({before, after}, null, 2) + '\n');
    expect(Object.values(after).every(value => value === 0)).toBe(true);
    console.log('AFLORA: limpeza das fixtures sintéticas confirmada.');
  } finally {
    await db.end();
  }
});

async function login(page, identity) {
  await page.goto('/login');
  await page.getByLabel('E-mail', {exact: true}).fill(identity.email);
  await page.getByLabel('Senha', {exact: true}).fill(identity.password);
  await page.getByRole('button', {name: 'Entrar', exact: true}).click();
  await expect(page).toHaveURL(origin + '/');
}

async function post(page, path, data) {
  const response = await page.request.post(path, {headers: {origin}, data});
  expect(response.status(), path).toBe(200);
  return response.json();
}

async function activityConsentId(activity) {
  const result = await db.query(`
    select id from public.autorizacoes_publicacao
    where objeto_tipo='atividade' and objeto_id=$1 and escopo_autorizado @> ARRAY['divulgacao','atividade:versao:1']
  `, [activity]);
  expect(result.rowCount).toBe(1);
  return result.rows[0].id;
}

async function authorize(id, type, scope) {
  const authorization = randomUUID();
  authorizationIds.push(authorization);
  await db.query(`
    insert into public.autorizacoes_publicacao
      (id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em)
    values($1,$2,$3,$4,'Responsável fictício','COMPROVANTE_SINTÉTICO_RESTRITO',clock_timestamp())
  `, [authorization, type, id, scope]);
  return authorization;
}

async function capture(locator, name) {
  await locator.screenshot({path: `${output}/${name}.png`, animations: 'disabled'});
}

test('AFLORA-01: da oficina da organização à próxima ação e ao portfólio autorizado', async ({browser}) => {
  test.setTimeout(240_000);
  const contexts = [];
  try {
    for (let index = 0; index < 4; index++) {
      const context = await browser.newContext({baseURL: origin, viewport: {width: 1360, height: 950}, serviceWorkers: 'block'});
      contexts.push(context);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return ['http://127.0.0.1:3215', 'http://127.0.0.1:56151'].includes(url.origin) ? route.continue() : route.abort();
      });
    }
    const [owner, person, reviewer, visitor] = await Promise.all(contexts.map(context => context.newPage()));
    await Promise.all([login(owner, organization), login(person, participant), login(reviewer, editor)]);
    await owner.goto('/dashboard');
    await owner.getByText('Criar novo projeto', {exact: true}).click();
    await owner.getByLabel('Título do projeto', {exact: true}).fill(projectTitle);
    await owner.getByLabel('Descrição', {exact: true}).fill('Oficina de sementes e a preparação de uma nova troca comunitária. Cenário sintético.');
    await owner.getByRole('button', {name: 'Salvar projeto', exact: true}).click();
    await expect(owner.getByRole('status')).toContainText('Projeto criado');
    projectId = (await db.query('select id from public.projetos where sujeito_id=$1 and titulo=$2', [organization.subject, projectTitle])).rows[0].id;

    await owner.goto('/dashboard/nova-atividade');
    await owner.getByLabel('Projeto (opcional)').selectOption(projectId);
    await owner.getByLabel('Título', {exact: true}).fill(title);
    await owner.getByLabel('Descrição', {exact: true}).fill('Oficina fictícia de separação de sementes e registro de modos de cultivo comunitário.');
    const begins = new Date(Math.ceil((Date.now() + 45_000) / 60_000) * 60_000);
    const localDateTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
    }).format(begins).replace(' ', 'T');
    await owner.getByLabel('Data e horário (America/Sao_Paulo)').fill(localDateTime);
    await owner.getByLabel('Orientação de acesso').fill('Cenário fictício de demonstração, sem inscrições.');
    await owner.getByRole('button', {name: 'Salvar rascunho', exact: true}).click();
    await expect(owner).toHaveURL(/\/dashboard\/atividade\/[0-9a-f-]{36}$/);
    const activity = owner.url().split('/').at(-1);
    const activityPage = `/dashboard/atividade/${activity}`;
    const activityApi = `/api/atividades/${activity}`;
    const recordApi = `${activityApi}/registro`;
    expect((await db.query('select projeto_id from public.atividades where id=$1', [activity])).rows[0].projeto_id).toBe(projectId);
    await post(owner, `${activityApi}/enviar`, {versao_esperada: 1, autoriza_publicacao: true});
    const announcementConsent = await activityConsentId(activity);
    for (const command of [
      {acao: 'iniciar', estado_esperado: 'enviada'},
      {acao: 'aprovar', estado_esperado: 'em_revisao', autorizacao_id: announcementConsent},
    ]) await post(reviewer, `/api/admin/atividades/${activity}/revisar`, {...command, pedido_id: randomUUID(), versao_esperada: 1});
    await post(reviewer, `/api/admin/atividades/${activity}/publicar`, {pedido_id: randomUUID(), versao_esperada: 1});

    await delay(Math.max(0, begins.getTime() - Date.now()));
    const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'}).format(begins);
    await owner.goto(activityPage);
    await owner.getByLabel('Data efetiva', {exact: true}).fill(today);
    await owner.getByLabel('Descrição factual', {exact: true}).fill(report);
    await owner.getByLabel('Origem da informação', {exact: true}).fill('Declaração sintética da organização responsável.');
    await owner.getByRole('button', {name: 'Salvar declaração privada', exact: true}).click();
    await expect(owner.getByRole('region', {name: 'Registro privado'})).toContainText(report);
    for (const [kind, link, claim] of [
      ['Ata fictícia da oficina', 'https://example.invalid/ata-oficina', publicReference],
      ['Nota fictícia de trabalho', 'https://example.invalid/nota-de-trabalho', privateReference],
    ]) {
      await owner.getByLabel('Tipo da fonte', {exact: true}).fill(kind);
      await owner.getByLabel('Referência pública', {exact: true}).fill(link);
      await owner.getByLabel('Afirmação sustentada', {exact: true}).fill(claim);
      const date = await owner.evaluate(() => {
        const now = new Date(Date.now() - 60_000);
        return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
      });
      await owner.getByLabel('Data da consulta (horário deste navegador)', {exact: true}).fill(date);
      await owner.getByRole('button', {name: 'Salvar referência privada', exact: true}).click();
      await expect(owner.getByRole('region', {name: 'Registro privado'})).toContainText(claim);
    }
    await capture(owner.getByRole('region', {name: 'Registro privado'}), '01-registro-privado');
    async function readRecord(page) {
      const response = await page.request.get(recordApi);
      expect(response.status()).toBe(200);
      return (await response.json()).registro;
    }
    const record = await readRecord(owner);
    expect(record.evidencias).toHaveLength(2);
    expect((await visitor.request.get(`/api/public/atividades/${activity}/registro`)).status()).toBe(404);
    await post(owner, `${recordApi}/enviar`, {pedido_id: randomUUID(), estado_esperado: 'rascunho', conteudo_esperado: record.conteudo_sha256});
    const recordConsent = await authorize(record.id, 'registro', ['registro_realizacao', 'registro:versao:1']);
    for (const command of [
      {acao: 'iniciar', estado_esperado: 'enviada'},
      {acao: 'aprovar', estado_esperado: 'em_revisao', autorizacao_id: recordConsent,
        evidencias_aprovadas: [record.evidencias.find(item => item.afirmacao_sustentada === publicReference).id]},
      {acao: 'publicar', estado_esperado: 'aprovada'},
    ]) {
      const reviewed = await readRecord(reviewer);
      await post(reviewer, `/api/admin/atividades/${activity}/registro/revisar`, {
        ...command, pedido_id: randomUUID(), conteudo_esperado: reviewed.conteudo_sha256,
      });
    }

    const personActivity = await post(person, '/api/atividades', {
      titulo: 'Preparação de guia de cultivo — atividade fictícia',
      descricao: 'Demonstração fictícia de capacidade de organizar textos sobre cultivo comunitário.',
      inicio_previsto: new Date().toISOString(), acontecendo_agora: true, orientacao_acesso: 'Cenário sintético.',
    });
    const personId = personActivity.atividade.id;
    await post(person, `/api/atividades/${personId}/enviar`, {versao_esperada: 1, autoriza_publicacao: true});
    await post(reviewer, `/api/admin/atividades/${personId}/decidir`, {acao: 'aprovar_publicacao', versao_esperada: 1, pedido_id: randomUUID()});
    await person.goto('/meu-espaco/capacidades');
    await person.getByLabel('Descrição', {exact: true}).fill('Posso ajudar a preparar um guia fictício de cultivo.');
    await person.getByLabel('Área de atuação declarada', {exact: true}).selectOption('cultura');
    await person.getByRole('button', {name: 'Salvar capacidade privada', exact: true}).click();
    await person.locator('article').filter({hasText: 'Posso ajudar a preparar um guia fictício de cultivo.'})
      .getByRole('button', {name: 'Editar', exact: true}).click();
    await person.getByRole('checkbox', {name: 'Autorizar apresentação pública'}).check();
    await person.getByRole('button', {name: 'Salvar capacidade', exact: true}).click();
    await expect(person.getByRole('status')).toContainText('Capacidade salva');

    const needsPage = `/dashboard/projetos/${projectId}/necessidades`;
    await owner.goto(needsPage);
    await owner.getByLabel('Descrição', {exact: true}).fill(needText);
    await owner.getByLabel('Cultura', {exact: true}).check();
    await owner.getByLabel('Condições', {exact: true}).fill('Escopo e participação serão combinados após manifestação de interesse.');
    await owner.getByRole('button', {name: 'Salvar necessidade privada', exact: true}).click();
    const need = owner.locator('article').filter({hasText: needText});
    await expect(need).toContainText('privada');
    await need.getByRole('button', {name: 'Tornar visível', exact: true}).click();
    await expect(need).toContainText('visivel');
    await capture(need, '02-proxima-acao');

    await person.goto('/encontros');
    const match = person.getByRole('article').filter({hasText: needText});
    await expect(match).toContainText(projectTitle);
    await match.getByRole('button', {name: 'Manifestar interesse', exact: true}).click();
    await expect(person.getByRole('status')).toContainText('Interesse registrado');
    await owner.reload();
    const received = owner.locator('li').filter({hasText: 'manifestou interesse'});
    await expect(received).toContainText('Pessoa voluntária — fictícia');
    await capture(received, '03-interesse-recebido');
    expect((await db.query('select id from public.vinculos_colaboracao where projeto_id=$1 and sujeito_id=$2', [projectId, participant.subject])).rowCount).toBe(0);

    const denied = await person.request.post(`${recordApi}/evidencias`, {headers: {origin}, data: {
      pedido_id: randomUUID(), tipo_fonte: 'Nota fictícia', url_publica: 'https://example.invalid/operacao-negada',
      afirmacao_sustentada: 'Uma tentativa sintética de escrita fora do escopo do ator.', consultada_em: new Date(Date.now()-60_000).toISOString(),
    }});
    expect([403, 404]).toContain(denied.status());
    expect(await denied.text()).not.toContain(report);
    expect((await readRecord(owner)).evidencias).toHaveLength(2);
    const deniedRead = await person.request.get(recordApi);
    expect([403, 404]).toContain(deniedRead.status());

    await owner.goto(activityPage);
    await expect(owner.getByRole('region', {name: 'Registro privado'})).toContainText(privateReference);
    await visitor.goto(`/perfil/${organization.subject}`);
    const card = visitor.locator('.portfolio-evidence-card').filter({hasText: title});
    await expect(card).toContainText(report);
    await expect(card).toContainText(publicReference);
    await expect(card.getByRole('link', {name: 'Abrir referência original'}))
      .toHaveAttribute('href', 'https://example.invalid/ata-oficina');
    await expect(visitor.locator('main')).not.toContainText(privateReference);
    await visitor.evaluate(() => { window.print = () => { document.body.dataset.printRequested = 'yes'; }; });
    await visitor.getByRole('button', {name: 'Baixar Portfólio em PDF', exact: true}).click();
    await expect(visitor.locator('body')).toHaveAttribute('data-print-requested', 'yes');
    await visitor.emulateMedia({media: 'print'});
    await expect(visitor.getByRole('banner')).toBeHidden();
    await expect(card).toBeVisible();
    await capture(card, '04-registro-autorizado-impressao');
    await visitor.pdf({path: `${output}/da-oficina-a-proxima-acao.pdf`, format: 'A4', printBackground: true});
    writeFileSync(`${output}/verificacoes.json`, JSON.stringify({
      projetoCompartilhado: true, referenciasPrivadasDoTitular: 2, referenciasNaImpressao: 1,
      interesseRecebido: true, vinculoAutomatico: false, escritaAlheia: denied.status(), leituraPrivadaAlheia: deniedRead.status(),
    }, null, 2) + '\n');

    // A composição deve permitir seguir do registro diretamente à próxima ação.
    const projectNeeds = owner.getByRole('link', {name: 'Gerenciar necessidades do projeto'});
    await expect(projectNeeds).toHaveAttribute('href', needsPage);
    await projectNeeds.click();
    await expect(owner).toHaveURL(origin + needsPage);
    await expect(owner.locator('article').filter({hasText: needText})).toBeVisible();
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});

test('AFLORA-02: titular registra oficina retrospectiva com o início e a data efetiva originais', async ({browser}) => {
  const ownerContext = await browser.newContext({baseURL: origin, serviceWorkers: 'block'});
  const anonymous = await browser.newContext({baseURL: origin, serviceWorkers: 'block'});
  const observations = [];
  const fields = {
    descricao: 'Oficina sintética de troca de sementes concluída durante o encontro.',
    orientacao_acesso: 'Cenário fictício, sem dados pessoais.',
  };
  const cases = [
    {start: '2026-11-17T09:30', instant: '2026-11-17T12:30:00.000Z', realized: '2026-11-17'},
    {start: '2026-11-18T14:15', instant: '2026-11-18T17:15:00.000Z', realized: '2026-11-18'},
    {start: '2026-11-19T10:45', instant: '2026-11-19T13:45:00.000Z', realized: '2026-11-19'},
  ];
  try {
    await ownerContext.route('**/*', route => {
      const url = new URL(route.request().url());
      return ['http://127.0.0.1:3215', 'http://127.0.0.1:56151'].includes(url.origin)
        ? route.continue() : route.abort();
    });
    const page = await ownerContext.newPage();
    await login(page, organization);
    const future = new Date(Date.now() + 2 * 86_400_000);
    const futureLocal = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
    }).format(future).replace(' ', 'T');

    async function openDraft(title, start, retrospective = false) {
      await page.goto('/dashboard/nova-atividade');
      const form = page.getByRole('form', {name: 'Nova atividade', exact: true});
      await form.getByLabel('Título', {exact: true}).fill(title);
      await form.getByLabel('Descrição', {exact: true}).fill(fields.descricao);
      await form.getByLabel('Orientação de acesso').fill(fields.orientacao_acesso);
      if (retrospective) await form.getByRole('checkbox', {name: 'Esta atividade já aconteceu'}).check({timeout: 5000});
      const input = form.locator('#inicio_previsto');
      await input.fill(start);
      await expect(input).toHaveValue(start);
      const click = form.getByRole('button', {name: 'Salvar rascunho', exact: true});
      const posts = [];
      const onRequest = request => {
        if (request.method() === 'POST' && request.url() === origin + '/api/atividades') posts.push(request);
      };
      page.on('request', onRequest);
      try {
        await click.click();
        const alert = form.getByRole('alert');
        await expect(alert.or(page.getByRole('heading', {name: title, exact: true}))).toBeVisible();
        if (await alert.isVisible()) {
          const response = posts.length ? await posts[0].response() : null;
          return {
            status: response?.status() ?? null, posts: posts.length,
            detail: await form.locator('#inicio_previsto-error').textContent({timeout: 1000}).catch(() => null),
            alert: await alert.innerText(),
          };
        }
        expect(posts).toHaveLength(1);
        const response = await posts[0].response();
        await expect(page).toHaveURL(/\/dashboard\/atividade\/[0-9a-f-]{36}$/);
        const id = page.url().split('/').at(-1);
        const stored = await page.request.get('/api/atividades/' + id);
        expect(stored.status()).toBe(200);
        return {status: response.status(), posts: posts.length, activity: (await stored.json()).atividade};
      } finally {
        page.off('request', onRequest);
      }
    }

    const missing = await openDraft('Controle sintético de preenchimento AFLORA-02', '');
    observations.push({categoria: 'preenchimento', ...missing});
    expect(missing).toMatchObject({status: null, posts: 0, detail: 'Informe data e horário válidos.'});

    const unauthenticated = await anonymous.request.post('/api/atividades', {
      headers: {origin}, data: {...fields, titulo: 'Controle sintético sem sessão AFLORA-02', inicio_previsto: future.toISOString()},
    });
    observations.push({categoria: 'autorização', status: unauthenticated.status()});
    expect(unauthenticated.status()).toBe(401);

    const control = await openDraft('Controle sintético futuro AFLORA-02', futureLocal);
    observations.push({categoria: 'controle técnico positivo', status: control.status, posts: control.posts});
    expect(control.status, 'Falha técnica ou de autorização no controle com titular e data futura').toBe(200);
    expect(control.activity.estado_editorial).toBe('rascunho');

    for (const scenario of cases) {
      const title = 'Oficina retrospectiva sintética AFLORA-02 ' + scenario.realized;
      const result = await openDraft(title, scenario.start, true);
      if (!result.activity) {
        const probe = await ownerContext.request.post('/api/atividades', {
          headers: {origin}, data: {...fields, titulo: title + ' — sonda', inicio_previsto: scenario.instant},
        });
        const server = await probe.json().catch(() => ({}));
        const category = result.status === 401 || result.status === 403 ? 'autorização'
          : result.detail === 'Escolha uma data futura.' ? 'regra de domínio'
          : result.detail ? 'preenchimento' : 'falha técnica ou resposta inesperada';
        observations.push({
          inicioLocal: scenario.start, categoria: category, interface: result,
          sondaDiretaDoServidor: {status: probe.status(), campoInicio: server.fields?.inicio_previsto ?? null},
        });
        if (category === 'regra de domínio') {
          expect(probe.status()).toBe(422);
          expect(server.fields?.inicio_previsto).toBe('Escolha uma data futura.');
        }
        expect.soft(result.activity, `${scenario.start}: ${category}; interface: ${result.detail ?? result.alert}`).toBeDefined();
        continue;
      }

      const {id} = result.activity;
      expect(result.status).toBe(200);
      expect(result.activity).toMatchObject({inicio_previsto: scenario.instant, estado_editorial: 'rascunho'});
      const form = page.getByRole('form', {name: 'Registro de realização'});
      await form.getByLabel('Data efetiva', {exact: true}).fill(scenario.realized);
      await form.getByLabel('Descrição factual').fill('A oficina sintética separou sementes e registrou cuidados de cultivo.');
      await form.getByLabel('Origem da informação').fill('Declaração sintética do titular da organização.');
      await form.getByRole('button', {name: 'Salvar declaração privada'}).click();
      await expect(page.getByRole('region', {name: 'Registro privado'})).toContainText(scenario.realized);
      await page.reload();
      await expect(page.getByRole('region', {name: 'Registro privado'})).toContainText(scenario.realized);
      await expect(page.getByRole('checkbox', {name: 'Esta atividade já aconteceu'})).toBeChecked();
      await expect(page.locator('#inicio_previsto')).toHaveValue(scenario.start);
      const reference = 'A ata fictícia documenta a realização declarada.';
      await page.getByLabel('Tipo da fonte').fill('Ata sintética');
      await page.getByLabel('Referência pública').fill('https://example.invalid/ata-aflora-02');
      await page.getByLabel('Afirmação sustentada').fill(reference);
      const consulted = await page.evaluate(() => {
        const date = new Date(Date.now() - 60_000);
        return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
      });
      await page.getByLabel('Data da consulta (horário deste navegador)').fill(consulted);
      await page.getByRole('button', {name: 'Salvar referência privada'}).click();
      await expect(page.getByRole('region', {name: 'Registro privado'})).toContainText(reference);
      const stored = (await db.query(`
        select a.inicio_previsto, a.estado_editorial, a.versao_publicada,
               r.data_realizacao::text, r.estado_editorial as estado_registro,
               (select count(*)::int from public.evidencias e where e.registro_id=r.id and not e.aprovada_publicacao) as referencias_privadas
        from public.atividades a join public.registros_realizacao r on r.atividade_id=a.id
        where a.id=$1 and a.sujeito_id=$2
      `, [id, organization.subject])).rows[0];
      expect(stored.inicio_previsto.toISOString()).toBe(scenario.instant);
      expect(stored).toMatchObject({
        estado_editorial: 'rascunho', versao_publicada: null,
        data_realizacao: scenario.realized, estado_registro: 'rascunho', referencias_privadas: 1,
      });
      expect((await anonymous.request.get('/api/public/atividades/' + id)).status()).toBe(404);
      expect((await anonymous.request.get('/api/public/atividades/' + id + '/registro')).status()).toBe(404);
      observations.push({inicioLocal: scenario.start, dataEfetiva: scenario.realized, categoria: 'registro retrospectivo privado salvo'});
    }
  } finally {
    writeFileSync(`${output}/aflora-02-observacoes.json`, JSON.stringify(observations, null, 2) + '\n');
    await Promise.all([ownerContext.close(), anonymous.close()]);
  }
});

test('AUT-ORG-01: titular e representante enviam pela interface e só a curadoria publica', async ({browser}) => {
  const representative = await fixture('representative');
  const contexts = [];
  try {
    for (const identity of [organization, representative, editor, null]) {
      const context = await browser.newContext({baseURL: origin, serviceWorkers: 'block'});
      contexts.push(context);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        return ['http://127.0.0.1:3215', 'http://127.0.0.1:56151'].includes(url.origin)
          ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      if (identity) await login(page, identity);
    }
    const [owner, delegate, reviewer, visitor] = contexts.map(context => context.pages()[0]);
    const title = 'AUT-ORG-01 atividade titular fictícia';
    const delegateTitle = 'AUT-ORG-01 atividade representante fictícia';
    const start = new Date(Date.now() + 2 * 86_400_000);
    const localStart = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
    }).format(start).replace(' ', 'T');
    await owner.goto('/dashboard/nova-atividade');
    await owner.getByLabel('Título', {exact: true}).fill(title);
    await owner.getByLabel('Descrição', {exact: true}).fill('Atividade de teste criada pelo titular sintético.');
    await owner.getByLabel('Orientação de acesso').fill('Acesso fictício de teste.');
    await owner.getByLabel('Data e horário (America/Sao_Paulo)').fill(localStart);
    await owner.getByRole('button', {name: 'Salvar rascunho', exact: true}).click();
    await expect(owner).toHaveURL(/\/dashboard\/atividade\/[0-9a-f-]{36}$/);
    const id = owner.url().split('/').at(-1);
    expect((await db.query("select id from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=$1", [id])).rowCount).toBe(0);
    const publicPath = `/api/public/atividades/${id}`;
    expect((await visitor.request.get(publicPath)).status()).toBe(404);

    async function send(page, activity) {
      const consent = page.getByRole('checkbox', {name: /Autorizo a divulgação desta versão/});
      const button = page.getByRole('button', {name: 'Enviar atividade', exact: true});
      await expect(consent).not.toBeChecked();
      await expect(button).toBeDisabled();
      await consent.check();
      await expect(button).toBeEnabled();
      const response = page.waitForResponse(result => result.url().endsWith(`/api/atividades/${activity}/enviar`) && result.request().method() === 'POST');
      await button.click();
      expect((await response).status()).toBe(200);
    }

    await send(owner, id);
    await expect(owner.getByText('Enviada — continua privada', {exact: true})).toBeVisible();
    await activityConsentId(id);
    expect((await visitor.request.get(publicPath)).status()).toBe(404);
    await reviewer.goto('/admin/atividades');
    const card = reviewer.getByRole('article', {name: title, exact: true});
    await card.getByRole('button', {name: 'Aprovar Publicação', exact: true}).click();
    await expect(card).toHaveCount(0);
    const published = await visitor.request.get(publicPath);
    expect(published.status()).toBe(200);
    expect(await published.json()).toMatchObject({atividade: {titulo: title, versao: 1}});
    expect(await published.text()).not.toMatch(/comprovante|consentimento-organizacao|conta_id|conteudo_sha256/);

    const response = await post(owner, '/api/atividades', {
      titulo: delegateTitle, descricao: 'Atividade sintética para testar representação sem edição.',
      orientacao_acesso: 'Acesso fictício.', inicio_previsto: start.toISOString(),
    });
    const delegatedId = response.atividade.id;
    await delegate.goto(`/dashboard/atividade/${delegatedId}`);
    await expect(delegate.getByRole('heading', {name: delegateTitle})).toBeVisible();
    await expect(delegate.getByRole('button', {name: 'Salvar alterações'})).toHaveCount(0);
    await expect(delegate.getByLabel('Título', {exact: true})).toHaveCount(0);
    await expect(delegate.getByRole('form', {name: 'Registro de realização'})).toHaveCount(0);
    await send(delegate, delegatedId);
    const delegatedGrant = await activityConsentId(delegatedId);
    const result = await db.query(`
      select c.auth_user_id
      from public.autorizacoes_publicacao a
      join public.contas_acesso c on c.id=(a.comprovante_restrito::jsonb->>'conta_id')::uuid
      where a.id=$1
    `, [delegatedGrant]);
    expect(result.rows).toEqual([{auth_user_id: representative.id}]);
    expect((await visitor.request.get(`/api/public/atividades/${delegatedId}`)).status()).toBe(404);

    // A freshly created draft makes the test independent of the edit lock on sent versions.
    const untouched = (await post(owner, '/api/atividades', {
      titulo: 'AUT-ORG-01 rascunho isolado para sondar edição',
      descricao: 'Rascunho sintético reservado ao titular com escopo de edição.',
      orientacao_acesso: 'Acesso fictício.', inicio_previsto: start.toISOString(),
    })).atividade;
    const patch = await delegate.request.patch(`/api/atividades/${untouched.id}`, {
      headers: {origin},
      data: {
        titulo: 'Tentativa sintética de edição por representante',
        descricao: untouched.descricao,
        orientacao_acesso: untouched.orientacao_acesso,
        inicio_previsto: untouched.inicio_previsto,
        versao_esperada: 1,
      },
    });
    const persisted = (await db.query('select titulo,versao_submetida from public.atividades where id=$1', [untouched.id])).rows[0];
    writeFileSync(`${output}/aut-org-01-browser.json`, JSON.stringify({
      consentimentoTitularPelaInterface: true, publicacaoSomenteEditorial: true,
      representanteEnviouSemControlesDeEdicao: true, patchDoRepresentante: patch.status(),
      versaoDepoisDoPatch: persisted.versao_submetida, tituloPreservado: persisted.titulo === untouched.titulo,
    }, null, 2) + '\n', {flag: 'wx'});
    expect([403, 404], 'Representante com enviar/publicar e sem editar deve ser recusado pela API').toContain(patch.status());
    expect(persisted).toEqual({titulo: untouched.titulo, versao_submetida: 1});
  } finally {
    await Promise.all(contexts.map(context => context.close()));
  }
});
