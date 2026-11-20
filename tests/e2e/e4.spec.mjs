import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

test.describe.configure({ mode: 'serial' });
const base = 'http://127.0.0.1:3215';
const fixtures = [];
const subjects = [];
let db, admin, local, projectId, coordinatorSubject, participantSubject, editor;
const runId = randomUUID();
const projectTitle = `E4 Projeto fictício ${runId.slice(0, 8)}`;
const participantActivity = `E4 atividade PF ${runId.slice(0, 8)}`;
const coordinatorActivity = `E4 atividade coordenação ${runId.slice(0, 8)}`;
const actionLibraryActivity = `E4.1 boletim adaptado ${runId.slice(0, 8)}`;
const capacityText = `E4 capacidade declarada ${runId.slice(0, 8)}`;
const needText = `E4 necessidade de oficina ${runId.slice(0, 8)}`;

async function fixtureAccount(label, kind = 'pf') {
  const email = `e4-flow-${label}-${runId}@example.invalid`;
  const password = `${randomUUID()}aA1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error('Fixture Auth local não foi criada.');
  const item = { id: created.data.user.id, email, password, subject: null, org: null };
  fixtures.push(item);
  if (kind === 'pf') {
    const result = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: item.id, p_nome_publico: `E4 pessoa fictícia ${label} ${runId.slice(0, 6)}` });
    if (result.error) throw new Error('Fixture PF local não foi criada.');
    item.subject = result.data;
  } else if (kind === 'org') {
    const result = await admin.rpc('criar_organizacao_com_sujeito', { p_auth_user_id: item.id, p_nome_publico: `E4 coordenação fictícia ${runId.slice(0, 6)}`, p_canal_publico: null });
    if (result.error) throw new Error('Fixture de coordenação local não foi criada.');
    item.org = result.data;
    item.subject = (await db.query('select id from public.sujeitos_publicadores where organizacao_legada_id=$1', [item.org])).rows[0]?.id;
    subjects.push(item.subject);
    await db.query("update public.organizacoes set estado_validacao='validada' where id=$1", [item.org]);
  } else {
    await db.query("insert into public.contas_acesso(auth_user_id,papel) values($1,'editor') on conflict(auth_user_id) do update set papel='editor'", [item.id]);
  }
  if (item.subject) subjects.push(item.subject);
  return item;
}

test.beforeAll(async () => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') throw new Error('Fixtures E4 exigem autorização local explícita.');
  local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', process.cwd(), '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const api = new URL(local.API_URL), database = new URL(local.DB_URL);
  if (api.origin !== 'http://127.0.0.1:56151' || database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') throw new Error('Destino fora da stack Supabase local autorizada.');
  db = new Client(local.DB_URL);
  await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const participant = await fixtureAccount('participante');
  participantSubject = participant.subject;
  const coordinator = await fixtureAccount('coordenacao', 'org');
  coordinatorSubject = coordinator.subject;
  editor = await fixtureAccount('curadoria', 'editor');
  projectId = (await db.query('insert into public.projetos(sujeito_id,titulo,descricao,ano) values($1,$2,$3,2026) returning id', [coordinatorSubject, projectTitle, 'Projeto sintético para o teste integrado E4.'])).rows[0].id;
});

test.afterAll(async () => {
  if (!db) return;
  try {
    const userIds = fixtures.map(item => item.id);
    const activityIds = (await db.query('select id from public.atividades where titulo=any($1::text[])', [[participantActivity, coordinatorActivity, actionLibraryActivity]])).rows.map(row => row.id);
    await db.query('begin');
    try {
      await db.query('delete from public.interesses_necessidade where owner_auth_user_id=any($1::uuid[]) or necessidade_id in (select id from public.necessidades_projeto where projeto_id=$2 or atividade_id=any($3::uuid[]))', [userIds, projectId, activityIds]);
      await db.query('delete from public.necessidades_projeto where projeto_id=$1 or atividade_id=any($2::uuid[])', [projectId, activityIds]);
      await db.query('delete from public.capacidades where sujeito_id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.eventos_editoriais where objeto_id=any($1::uuid[]) or objeto_id=any($2::uuid[])', [activityIds, subjects]);
      await db.query('delete from public.casos_moderacao where sujeito_id=any($1::uuid[])', [subjects]);
      await db.query("delete from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=any($1::uuid[])", [activityIds]);
      await db.query('delete from public.atividades where id=any($1::uuid[])', [activityIds]);
      await db.query('delete from public.vinculos_colaboracao where projeto_id=$1 or sujeito_id=any($2::uuid[])', [projectId, subjects]);
      await db.query('delete from public.projetos where id=$1', [projectId]);
      await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])', [userIds]);
      await db.query('delete from public.organizacoes where id=any($1::uuid[])', [fixtures.map(item => item.org).filter(Boolean)]);
      await db.query('commit');
    } catch (error) { await db.query('rollback'); throw error; }
    for (const item of fixtures) {
      await admin.auth.signOut({ scope: 'local' });
      if ((await admin.auth.admin.deleteUser(item.id)).error) throw new Error('Limpeza de fixture sintética falhou.');
    }
    const remaining = await db.query('select (select count(*)::int from public.capacidades where sujeito_id=any($1::uuid[])) capacities,(select count(*)::int from public.necessidades_projeto where projeto_id=$2 or atividade_id=any($4::uuid[])) needs,(select count(*)::int from public.interesses_necessidade where owner_auth_user_id=any($3::uuid[])) interests,(select count(*)::int from auth.users where id=any($3::uuid[])) auth_users', [subjects, projectId, userIds, activityIds]);
    if (Object.values(remaining.rows[0]).some(value => value !== 0)) throw new Error('Fixtures sintéticas E4 permaneceram após a limpeza.');
    console.log('E4 fixtures cleanup: zero capacity, need, interest and auth rows.');
  } finally { await db.end(); }
});

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(base + '/');
}

async function publishActivity(owner, ownerPath, title, description, reviewer) {
  console.log('E4 trace: abrir formulário de atividade.');
  await owner.goto(ownerPath);
  await owner.getByLabel('A atividade está acontecendo agora', { exact: true }).check();
  await owner.getByLabel('Título', { exact: true }).fill(title);
  await owner.getByLabel('Descrição', { exact: true }).fill(description);
  await owner.getByLabel('Orientação de acesso', { exact: true }).fill('Condições fictícias; nenhum encontro real está sendo anunciado.');
  await owner.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
  console.log('E4 trace: rascunho salvo.');
  if (ownerPath === '/dashboard/pessoa-fisica/nova') {
    const card = owner.locator('article').filter({ has: owner.getByRole('heading', { name: title, exact: true }) });
    await card.getByRole('checkbox', { name: /Autorizo divulgar meu nome público/ }).check();
    await card.getByRole('button', { name: 'Enviar atividade para revisão', exact: true }).click();
    await expect(card.getByText('Enviada para revisão', { exact: true })).toBeVisible();
  } else {
    await expect(owner).toHaveURL(/\/dashboard\/atividade\/[0-9a-f-]{36}$/);
    await owner.getByRole('button', { name: 'Enviar atividade', exact: true }).click();
    await expect(owner.getByText('Enviada — continua privada', { exact: true })).toBeVisible();
  }
  console.log('E4 trace: atividade enviada para curadoria.');
  if (ownerPath !== '/dashboard/pessoa-fisica/nova') {
    const row = (await db.query('select id,versao_submetida from public.atividades where titulo=$1', [title])).rows[0];
    if (!row) throw new Error('Fixture sintética da atividade organizacional não foi localizada.');
    await db.query("insert into public.autorizacoes_publicacao(objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em) values('atividade',$1,$2,'Coordenação fictícia E4',$3,clock_timestamp())", [row.id, ['divulgacao', `atividade:versao:${row.versao_submetida}`], JSON.stringify({ tipo: 'consentimento-fixture-e4.v1', titular_sintetico: true })]);
  }
  await reviewer.goto('/admin/atividades');
  console.log('E4 trace: fila editorial carregada.');
  const review = reviewer.getByRole('article', { name: title, exact: true });
  await expect(review).toBeVisible();
  await review.getByRole('button', { name: 'Aprovar Publicação', exact: true }).click();
  await expect(review).toHaveCount(0);
}

test('E4-01: declaração pública, necessidade, compatibilidade, interesse e convite aceito', async ({ browser }) => {
  test.setTimeout(240000);
  const participant = fixtures.find(item => item.subject === participantSubject);
  const coordinator = fixtures.find(item => item.subject === coordinatorSubject);
  const [participantContext, coordinatorContext, editorContext, visitorContext] = await Promise.all(Array.from({ length: 4 }, () => browser.newContext({ baseURL: base })));
  try {
    const [person, org, reviewer, visitor] = await Promise.all([participantContext.newPage(), coordinatorContext.newPage(), editorContext.newPage(), visitorContext.newPage()]);
    for (const context of [participantContext, coordinatorContext, editorContext, visitorContext]) await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.hostname === '127.0.0.1' && ['3215', '56151', '56154'].includes(url.port) ? route.continue() : route.abort();
    });
    await Promise.all([login(person, participant), login(org, coordinator), login(reviewer, editor)]);
    console.log('E4 trace: participantes autenticados.');
    await org.goto(`/dashboard/projetos/${projectId}/colaboradores`);
    await expect(org.getByRole('link', { name: 'Gerenciar necessidades', exact: true })).toBeVisible();
    console.log('E4 trace: link de necessidades disponível.');

    await publishActivity(person, '/dashboard/pessoa-fisica/nova', participantActivity, 'Atividade pública sintética que habilita a apresentação pública de uma declaração de capacidade.', reviewer);
    console.log('E4 trace: curadoria PF concluída.');
    await publishActivity(org, '/dashboard/nova-atividade', coordinatorActivity, 'Atividade pública sintética da coordenação que habilita a apresentação de uma necessidade.', reviewer);

    await person.goto('/meu-espaco/capacidades');
    await person.getByLabel('Descrição', { exact: true }).fill(capacityText);
    await person.getByLabel('Área de atuação declarada', { exact: true }).selectOption('cultura');
    await person.getByLabel('Condições de colaboração', { exact: true }).fill('Condições serão combinadas diretamente.');
    await person.getByRole('button', { name: 'Salvar capacidade privada', exact: true }).click();
    const capability = person.locator('article').filter({ hasText: capacityText });
    await expect(capability).toContainText('Privada');
    await capability.getByRole('button', { name: 'Editar', exact: true }).click();
    await person.getByRole('checkbox', { name: 'Autorizar apresentação pública' }).check();
    await person.getByRole('button', { name: 'Salvar capacidade', exact: true }).click();
    await expect(person.getByRole('status')).toContainText('Capacidade salva');
    await expect(person.locator('article').filter({ hasText: capacityText })).toContainText('Apresentação pública autorizada');

    const projectManagement = `/dashboard/projetos/${projectId}/colaboradores`;
    await org.goto(projectManagement);
    await org.getByRole('link', { name: 'Gerenciar necessidades', exact: true }).click();
    await expect(org).toHaveURL(`${base}/dashboard/projetos/${projectId}/necessidades`);
    await org.getByLabel('Descrição', { exact: true }).fill(needText);
    await org.getByLabel('Cultura', { exact: true }).check();
    await org.getByLabel('Condições', { exact: true }).fill('Coordenação combinará escopo e forma de participação.');
    await org.getByRole('button', { name: 'Salvar necessidade privada', exact: true }).click();
    const need = org.locator('article').filter({ hasText: needText });
    await expect(need).toContainText('privada');
    const visibleResponse = org.waitForResponse(response => response.url().endsWith('/api/e4') && response.request().method() === 'POST');
    await need.getByRole('button', { name: 'Tornar visível', exact: true }).click();
    const visibilityResult = await visibleResponse;
    expect(visibilityResult.status()).toBe(200);
    await expect(org.locator('article').filter({ hasText: needText })).toContainText('visivel');

    await visitor.goto('/encontros');
    const compatibility = visitor.locator('article').filter({ hasText: projectTitle });
    await expect(compatibility).toContainText(capacityText);
    await expect(compatibility).toContainText('Categoria declarada em comum: cultura.');
    await expect(compatibility).toContainText('não confirma colaboração');
    await person.goto('/encontros');
    const personCompatibility = person.locator('article').filter({ hasText: projectTitle });
    const beforeLinks = Number((await db.query('select count(*)::int as count from public.vinculos_colaboracao where projeto_id=$1 and sujeito_id=$2', [projectId, participantSubject])).rows[0].count);
    await personCompatibility.getByRole('button', { name: 'Manifestar interesse', exact: true }).click();
    await expect(person.getByRole('status')).toContainText('Interesse registrado');
    await expect(person.getByRole('heading', { name: 'Minhas manifestações' })).toBeVisible();
    expect(Number((await db.query('select count(*)::int as count from public.vinculos_colaboracao where projeto_id=$1 and sujeito_id=$2', [projectId, participantSubject])).rows[0].count)).toBe(beforeLinks);

    console.log('E4 trace: verificar CSRF rejeitado.');
    const forbidden = await visitorContext.request.post(`${base}/api/e4`, { timeout: 10000, headers: { origin: 'https://invalid.example', 'content-type': 'application/json' }, data: { action: 'manifest-interest', needId: randomUUID(), subjectId: participantSubject, requestId: randomUUID() } });
    expect(forbidden.status()).toBe(403);
    console.log('E4 trace: verificar isolamento de capacidade.');
    expect((await coordinatorContext.request.get(`${base}/api/e4?action=capabilities&subject_id=${participantSubject}`, { timeout: 10000 })).status()).toBe(403);

    console.log('E4 trace: consultar interesses da coordenação pela rota HTTP.');
    const projectInterestsResponse = await coordinatorContext.request.get(`${base}/api/e4?action=project-interests&project_id=${projectId}`, { timeout: 15000 });
    expect(projectInterestsResponse.status()).toBe(200);
    expect(await projectInterestsResponse.json()).toEqual({ interests: [expect.objectContaining({ sujeito_id: participantSubject, status: 'ativo' })] });
    console.log('E4 trace: abrir interesses na área privada do projeto.');
    org.setDefaultNavigationTimeout(30000);
    await org.goto(`/dashboard/projetos/${projectId}/necessidades`);
    console.log('E4 trace: gestão do projeto carregada.');
    const interest = org.locator('li').filter({ hasText: 'manifestou interesse' });
    await expect(interest).toBeVisible();
    console.log('E4 trace: interesse aparece para coordenação.');
    await org.getByRole('button', { name: /Convidar .* pelo fluxo existente/ }).click();
    console.log('E4 trace: Server Action do convite respondeu.');
    await expect(org).toHaveURL(new RegExp(`${projectManagement}\\?colaboracao=invite`));
    console.log('E4 trace: redirect do convite confirmado.');
    await expect(org.getByRole('status')).toContainText('Convite enviado');
    console.log('E4 trace: convite de colaboração enviado.');
    expect((await db.query("select status,origem from public.vinculos_colaboracao where projeto_id=$1 and sujeito_id=$2", [projectId, participantSubject])).rows).toEqual([{ status: 'pendente', origem: 'convite' }]);
    await person.goto('/dashboard/pessoa-fisica');
    console.log('E4 trace: verificar convite da participante.');
    const invitation = person.locator('.collaboration-invitations li').filter({ hasText: projectTitle });
    await expect(invitation).toContainText('Aguardando sua resposta');
    await invitation.getByRole('button', { name: 'Aceitar convite', exact: true }).click();
    await expect(person.locator('.feedback[role="status"]')).toContainText('Resposta ao convite registrada');
    expect((await db.query("select status from public.vinculos_colaboracao where projeto_id=$1 and sujeito_id=$2 and origem='convite'", [projectId, participantSubject])).rows).toEqual([{ status: 'ativo' }]);
    await person.goto('/meu-espaco/capacidades');
    const ownCapability = person.locator('article').filter({ hasText: capacityText });
    await ownCapability.getByRole('button', { name: 'Editar', exact: true }).click();
    await person.getByRole('checkbox', { name: 'Autorizar apresentação pública' }).uncheck();
    await person.getByRole('button', { name: 'Salvar capacidade', exact: true }).click();
    await expect(ownCapability).toContainText('Privada');
    expect((await db.query('select visibilidade from public.capacidades where sujeito_id=$1 and descricao=$2', [participantSubject, capacityText])).rows).toEqual([{ visibilidade: 'privada' }]);
    await visitor.goto('/encontros');
    await expect(visitor.locator('article').filter({ hasText: projectTitle })).toHaveCount(0);
    expect((await db.query('select count(*)::int as count from public.atividades where titulo=any($1::text[])', [[participantActivity, coordinatorActivity]])).rows[0].count).toBe(2);
  } finally {
    for (const context of [participantContext, coordinatorContext, editorContext, visitorContext]) {
      await Promise.all(context.pages().map(page => page.close()));
      await context.close();
    }
  }
});

test('E4.1: biblioteca adapta rascunho PF; pedido privado só aparece após publicação autorizada e recebe interesse sem vínculo', async ({ browser }) => {
  test.setTimeout(240000);
  const owner = fixtures.find(item => item.subject === participantSubject);
  const participant = await fixtureAccount('help-participante');
  let resumedOwnerContext;
  const helpOwnerContext = await browser.newContext({ baseURL: base });
  const participantContext = await browser.newContext({ baseURL: base });
  const reviewerContext = await browser.newContext({ baseURL: base });
  const visitorContext = await browser.newContext({ baseURL: base });
  for (const context of [helpOwnerContext, participantContext, reviewerContext, visitorContext]) await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' && ['3215', '56151', '56154'].includes(url.port) ? route.continue() : route.abort();
  });
  try {
    const helpOwner = await helpOwnerContext.newPage();
    const participantPage = await participantContext.newPage();
    const reviewer = await reviewerContext.newPage();
    const visitor = await visitorContext.newPage();
    await Promise.all([login(helpOwner, owner), login(participantPage, participant), login(reviewer, editor)]);

    await visitor.goto('/biblioteca-acoes');
    await expect(visitor.getByRole('heading', { name: 'Biblioteca de Ações' })).toBeVisible();
    await helpOwner.goto('/biblioteca-acoes');
    await helpOwner.getByRole('link', { name: 'Adaptar Produzir boletim de informação comunitária' }).click();
    await expect(helpOwner.getByText(/modelo sugerido; ainda não é uma atividade real/i)).toBeVisible();
    await helpOwner.getByLabel('A atividade está acontecendo agora', { exact: true }).check();
    await helpOwner.getByLabel('Título', { exact: true }).fill(actionLibraryActivity);
    await helpOwner.getByLabel('Descrição', { exact: true }).fill('Atividade sintética adaptada pela pessoa titular, sem data ou local fictícios.');
    await helpOwner.getByLabel('Orientação de acesso', { exact: true }).fill('Condições serão combinadas diretamente com participantes.');
    await helpOwner.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    const activityCard = helpOwner.locator('article').filter({ has: helpOwner.getByRole('heading', { name: actionLibraryActivity, exact: true }) });
    await expect(activityCard).toBeVisible();
    await activityCard.getByRole('checkbox', { name: /Autorizo divulgar meu nome público/ }).check();
    await activityCard.getByRole('button', { name: 'Enviar atividade para revisão', exact: true }).click();
    await expect(activityCard.getByText('Enviada para revisão', { exact: true })).toBeVisible();
    await reviewer.goto('/admin/atividades');
    const review = reviewer.getByRole('article', { name: actionLibraryActivity, exact: true });
    await expect(review).toBeVisible();
    await review.getByRole('button', { name: 'Aprovar Publicação', exact: true }).click();
    await expect(review).toHaveCount(0);

    const activityId = (await db.query('select id from public.atividades where titulo=$1 and criada_por_conta_id=(select id from public.contas_acesso where auth_user_id=$2)', [actionLibraryActivity, owner.id])).rows[0]?.id;
    expect(activityId).toBeTruthy();
    expect((await visitorContext.request.get(`${base}/api/public/atividades/${activityId}`)).status()).toBe(200);

    await helpOwner.goto(`/dashboard/pessoa-fisica/atividade/${activityId}/ajuda`);
    await helpOwner.getByLabel('Descrição da ajuda', { exact: true }).fill('Solicito ajuda para revisar este boletim comunitário.');
    await helpOwner.getByLabel('Comunicação', { exact: true }).check();
    await helpOwner.getByRole('button', { name: 'Salvar solicitação privada', exact: true }).click();
    await expect(helpOwner.getByRole('status')).toContainText('não cria colaboração, vínculo ou compromisso');
    const needId = (await db.query('select id from public.necessidades_projeto where atividade_id=$1', [activityId])).rows[0]?.id;
    expect(needId).toBeTruthy();
    const privateDiscovery = await visitorContext.request.get(`${base}/api/e4?action=activity-needs-public`);
    expect(privateDiscovery.status()).toBe(200);
    expect((await privateDiscovery.json()).needs.some(item => item.id === needId)).toBe(false);
    await visitor.goto('/encontros');
    await expect(visitor.getByRole('article').filter({ hasText: 'Solicito ajuda para revisar este boletim comunitário.' })).toHaveCount(0);

    const linkCountBefore = Number((await db.query('select count(*)::int n from public.vinculos_colaboracao where sujeito_id=$1', [participant.subject])).rows[0].n);
    await helpOwner.getByRole('button', { name: 'Tornar solicitação pública', exact: true }).click();
    await expect(helpOwner.getByRole('status')).toContainText('Solicitação visível para descoberta pública');
    const publicDiscovery = await visitorContext.request.get(`${base}/api/e4?action=activity-needs-public`);
    expect(publicDiscovery.headers()['cache-control']).toContain('no-store');
    expect((await publicDiscovery.json()).needs).toEqual([expect.objectContaining({ id: needId, atividade_id: activityId, atividade_titulo: actionLibraryActivity, certainty: 'solicitacao_declarada_nao_verificada' })]);

    await participantPage.goto('/encontros');
    const opportunity = participantPage.getByRole('article').filter({ hasText: 'Solicito ajuda para revisar este boletim comunitário.' });
    await expect(opportunity).toBeVisible();
    await opportunity.getByRole('button', { name: 'Manifestar interesse', exact: true }).click();
    await expect(participantPage.getByRole('status')).toContainText('Interesse registrado');
    await helpOwner.reload();
    await expect(helpOwner.getByRole('heading', { name: 'Interesses recebidos' })).toBeVisible();
    await expect(helpOwner.getByText(/E4 pessoa fictícia help-participante/)).toBeVisible();
    expect(Number((await db.query('select count(*)::int n from public.vinculos_colaboracao where sujeito_id=$1', [participant.subject])).rows[0].n)).toBe(linkCountBefore);
    expect((await db.query('select count(*)::int n from public.interesses_necessidade where necessidade_id=$1 and status=\'ativo\'', [needId])).rows[0].n).toBe(1);

    // INC-01-B: interesse próprio não concede acesso à lista privada do titular.
    const interestsUrl = `${base}/api/e4?action=activity-interests&activity_id=${activityId}`;
    const deniedInterests = await participantContext.request.get(interestsUrl);
    expect(deniedInterests.status()).toBe(403);
    expect(await deniedInterests.json()).toEqual({ message: expect.any(String) });
    const ownInterestsUrl = `${base}/api/e4?action=interests&subject_id=${participant.subject}`;
    const ownInterests = await participantContext.request.get(ownInterestsUrl);
    expect(ownInterests.status()).toBe(200);
    const ownInterest = (await ownInterests.json()).interests.find(item => item.necessidade_id === needId);
    expect(ownInterest).toMatchObject({ necessidade_id: needId, status: 'ativo' });

    // INC-01-A: logout real, perda do acesso anterior e login da mesma conta em contexto novo.
    await helpOwner.getByRole('banner').getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(helpOwner).toHaveURL(`${base}/login`);
    const loggedOutInterests = await helpOwnerContext.request.get(interestsUrl);
    expect(loggedOutInterests.status()).toBe(401);
    expect(await loggedOutInterests.json()).toEqual({ message: expect.any(String) });
    await helpOwner.goto(`/dashboard/pessoa-fisica/atividade/${activityId}/ajuda`);
    await expect(helpOwner).toHaveURL(`${base}/login`);

    resumedOwnerContext = await browser.newContext({ baseURL: base });
    await resumedOwnerContext.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.hostname === '127.0.0.1' && ['3215', '56151', '56154'].includes(url.port) ? route.continue() : route.abort();
    });
    // Não copiar cookies/storageState: o helper autentica novamente a mesma fixture A.
    expect((await resumedOwnerContext.request.get(interestsUrl)).status()).toBe(401);
    const resumedOwner = await resumedOwnerContext.newPage();
    await login(resumedOwner, owner);
    await resumedOwner.goto(`/dashboard/pessoa-fisica/atividade/${activityId}/ajuda`);
    await expect(resumedOwner.getByText(actionLibraryActivity, { exact: true })).toBeVisible();
    await expect(resumedOwner.getByRole('heading', { name: 'Solicito ajuda para revisar este boletim comunitário.', exact: true })).toBeVisible();
    await expect(resumedOwner.getByRole('heading', { name: 'Interesses recebidos', exact: true })).toBeVisible();
    await expect(resumedOwner.getByText(/E4 pessoa fictícia help-participante/)).toBeVisible();
    await expect(resumedOwner.getByText('Esta manifestação não cria colaboração, vínculo ou compromisso. Não há convite institucional para atividade independente.', { exact: true })).toBeVisible();
    const resumedInterests = await resumedOwnerContext.request.get(interestsUrl);
    expect(resumedInterests.status()).toBe(200);
    expect((await resumedInterests.json()).interests).toEqual([
      expect.objectContaining({ id: ownInterest.id, sujeito_id: participant.subject, status: 'ativo' }),
    ]);
    // A sessão antiga continua encerrada; B mantém somente a consulta da própria manifestação.
    expect((await helpOwnerContext.request.get(interestsUrl)).status()).toBe(401);
    const ownInterestsAfterLogin = await participantContext.request.get(ownInterestsUrl);
    expect(ownInterestsAfterLogin.status()).toBe(200);
    expect((await ownInterestsAfterLogin.json()).interests).toEqual([
      expect.objectContaining({ id: ownInterest.id, necessidade_id: needId, status: 'ativo' }),
    ]);
    expect(Number((await db.query('select count(*)::int n from public.vinculos_colaboracao where sujeito_id=$1', [participant.subject])).rows[0].n)).toBe(linkCountBefore);
    expect((await db.query('select count(*)::int n from public.interesses_necessidade where necessidade_id=$1 and status=\'ativo\'', [needId])).rows[0].n).toBe(1);

    const authorizationId = (await db.query("select id from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=$1 and situacao='vigente' and revogada_em is null order by autorizada_em desc,id desc limit 1", [activityId])).rows[0]?.id;
    expect(authorizationId).toBeTruthy();
    await db.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=now() where id=$1", [authorizationId]);
    const revokedDiscovery = await visitorContext.request.get(`${base}/api/e4?action=activity-needs-public`);
    expect((await revokedDiscovery.json()).needs.some(item => item.id === needId)).toBe(false);
    const staleRequestId = randomUUID();
    const staleInterestStatus = await participantPage.evaluate(async body => (await fetch('/api/e4', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).status, { action: 'manifest-interest', needId, subjectId: participant.subject, requestId: staleRequestId });
    expect(staleInterestStatus).toBe(403);
    expect((await db.query('select count(*)::int as count from public.interesses_necessidade where necessidade_id=$1 and request_id=$2', [needId, staleRequestId])).rows[0].count).toBe(0);
  } finally {
    await Promise.all([helpOwnerContext.close(), participantContext.close(), reviewerContext.close(), visitorContext.close(), resumedOwnerContext?.close()]);
  }
});
