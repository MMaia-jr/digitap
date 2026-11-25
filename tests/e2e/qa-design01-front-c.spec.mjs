import { test, expect, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const origin = 'http://127.0.0.1:3215';
const supabaseOrigin = 'http://127.0.0.1:56151';
test.use({ ...devices['iPhone 13'], defaultBrowserType: 'chromium', actionTimeout: 15000, launchOptions: { chromiumSandbox: true } });

test('DESIGN-01 QA independente: One Tap e acompanhamento', async ({ browser }, testInfo) => {
  test.setTimeout(160_000);
  const id = process.env.AI_BETA_AUTH_USER_ID;
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1' || process.env.DIGITAP_G4_03B_GATEWAY_MOCK !== '1' ||
    process.env.AI_GATEWAY_API_KEY !== 'g4-03b-synthetic-only' ||
    !/^[0-9a-f-]{36}$/.test(id ?? '')) throw new Error('DESIGN-01 QA exige fixture Auth local e Gateway simulado.');
  const env = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const dbUrl = new URL(env.DB_URL);
  if (env.API_URL !== supabaseOrigin || dbUrl.hostname !== '127.0.0.1' || dbUrl.port !== '56152' || dbUrl.pathname !== '/postgres') {
    throw new Error('DESIGN-01 QA exige Supabase exclusivamente local.');
  }
  const db = new Client(env.DB_URL);
  const admin = createClient(supabaseOrigin, env.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const fixtures = [];
  const bucket = process.env.SUPABASE_PRIVATE_EVIDENCE_BUCKET;
  if (!/^oss01d-private-design01-[a-z0-9]+$/.test(bucket ?? '')) throw new Error('Bucket sintético ausente.');
  let bucketCreated = false;
  const observations = [];
  const contexts = [];
  const network = [];
  const pageErrors = [];
  const consoleDiagnostics = [];
  const capture = async (name, locator) => {
    const image = await locator.screenshot({ path: testInfo.outputPath(name + '.png') });
    await testInfo.attach(name, { body: image, contentType: 'image/png' });
  };
  const privateSession = async (label, fixtureId, variant = 'person') => {
    const email = 'design-01-' + randomUUID() + '@example.invalid';
    const password = randomUUID() + 'aA1!';
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, ...(fixtureId ? { id: fixtureId } : {}) });
    expect(created.error).toBeNull();
    const actor = { id: created.data.user.id, subject: null, email, password };
    fixtures.push(actor);
    if (variant === 'person') {
      const profile = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: actor.id, p_nome_publico: 'Pessoa sintética ' + label });
      expect(profile.error).toBeNull();
      actor.subject = profile.data;
    } else if (variant === 'organization') {
      const profile = await admin.rpc('criar_organizacao_com_sujeito', {
        p_auth_user_id: actor.id, p_nome_publico: 'Organização cultural sintética', p_canal_publico: null,
      });
      expect(profile.error).toBeNull();
      actor.organization = profile.data;
      actor.subject = (await db.query('select id from public.sujeitos_publicadores where organizacao_legada_id=$1', [actor.organization])).rows[0].id;
    }
    return actor;
  };
  const isolate = async context => context.route('**/*', route => [origin, supabaseOrigin].includes(new URL(route.request().url()).origin)
    ? route.continue() : route.abort());
  const signIn = async (p, fixture) => {
    await p.goto('/login');
    await p.getByLabel('E-mail', { exact: true }).fill(fixture.email);
    await p.getByLabel('Senha', { exact: true }).fill(fixture.password);
    await p.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(p).toHaveURL(origin + '/');
  };
  await db.connect();
  try {
    const buckets = await admin.storage.listBuckets();
    expect(buckets.error).toBeNull();
    expect(buckets.data.some(found => found.name === bucket)).toBe(false);
    const createdBucket = await admin.storage.createBucket(bucket, { public:false, fileSizeLimit:25*1024*1024, allowedMimeTypes:['image/png'] });
    expect(createdBucket.error).toBeNull();
    bucketCreated = true;
    const owner = await privateSession('Rosana', id);
    const ordinary = await privateSession('Lia');
    const unlinked = await privateSession('sem perfil', undefined, 'unlinked');
    const organization = await privateSession('Oficinas', undefined, 'organization');
    const visit = async (actor, path) => {
      const context = await browser.newContext({ ...devices['iPhone 13'], baseURL: origin, deviceScaleFactor: 1 });
      contexts.push(context);
      await isolate(context);
      const browserPage = await context.newPage();
      browserPage.on('pageerror', e => pageErrors.push(e.name));
      await signIn(browserPage, actor);
      await browserPage.goto(path);
      return browserPage;
    };
    const visual = async (name, browserPage, block) => {
      for (const viewport of [{width: 1440, height: 1000}, {width: 390, height: 844}]) {
        await browserPage.setViewportSize(viewport);
        await browserPage.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        const label = viewport.width === 1440 ? 'desktop' : 'mobile';
        const styles = await block.evaluate(node => {
          const cs = getComputedStyle(node);
          const header = document.querySelector('.app-header');
          const info = element => ({
            text: element.textContent?.trim().slice(0, 100),
            color: getComputedStyle(element).color,
            background: getComputedStyle(element).backgroundColor,
            fontSize: getComputedStyle(element).fontSize,
          });
          return {viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, blockWidth: node.getBoundingClientRect().width,
            headerClearanceAtTop: scrollY === 0 && header ? Math.round(node.getBoundingClientRect().top - header.getBoundingClientRect().bottom) : null,
            background: cs.backgroundColor, font: cs.fontFamily, headings: [...node.querySelectorAll('h1,h2,h3')].slice(0, 8).map(info)};
        });
        expect(styles.scrollWidth).toBeLessThanOrEqual(styles.viewport);
        if (name.startsWith('umtap')) expect(styles.headerClearanceAtTop).toBeGreaterThanOrEqual(0);
        observations.push({ checkpoint: name, mode: label, ...styles });
        await browserPage.evaluate(() => scrollTo(0, 0));
        await capture(name + '-' + label, block);
        if (name === 'umtap-pf-beta') {
          await browserPage.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          await browserPage.screenshot({ path: testInfo.outputPath(name + '-pagina-' + label + '.png'), animations: 'disabled', style: 'nextjs-portal { display: none; }' });
        }
      }
    };
    const beta = await visit(owner, '/dashboard/pessoa-fisica');
    const pf = await visit(ordinary, '/dashboard/pessoa-fisica');
    const org = await visit(organization, '/dashboard');
    const basic = await visit(unlinked, '/meu-espaco');
    const workspace = page => page.getByRole('region', {name:'Por onde começamos?',exact:true});
    const navigation = page => workspace(page).getByRole('navigation', {name:'Taps para participar'});
    for (const browserPage of [beta, pf, org, basic]) {
      await expect(navigation(browserPage).getByRole('listitem')).toHaveCount(6);
      await expect(navigation(browserPage).getByRole('link', {name:'Acompanhar compromissos e evidências'})).toHaveCount(0);
      const anchors = await navigation(browserPage).getByRole('link').evaluateAll(links => links
        .map(link => link.getAttribute('href')).filter(href => href.startsWith('#')));
      for (const anchor of anchors) await expect(browserPage.locator(anchor)).toHaveCount(1);
    }
    const discover = navigation(pf).getByRole('link', {name:'Descobrir atividades e encontros'});
    await pf.keyboard.press('Tab');
    const review = navigation(pf).getByRole('link', {name:'Revisar meu perfil'});
    await review.focus();
    await pf.keyboard.press('Tab');
    const capacity = navigation(pf).getByRole('link', {name:'Apresentar minhas capacidades'});
    await expect(capacity).toBeFocused();
    const focusStyle = await capacity.evaluate(node => {
      const style = getComputedStyle(node);
      return {visible: node.matches(':focus-visible'), outline: style.outlineStyle, shadow: style.boxShadow};
    });
    expect(focusStyle.visible).toBe(true);
    expect(focusStyle.outline !== 'none' || focusStyle.shadow !== 'none').toBe(true);
    await pf.keyboard.press('Enter');
    await expect(pf).toHaveURL(origin + '/meu-espaco/capacidades');
    await pf.goto('/dashboard/pessoa-fisica');
    await discover.click();
    await expect(pf).toHaveURL(/#descobrir-publicamente$/);
    await expect(pf.getByRole('link', {name:'Ver atividades publicadas'})).toBeVisible();
    await navigation(basic).getByRole('link', {name:'Preparar uma atividade'}).click();
    await expect(basic).toHaveURL(/#preparar-atividade$/);
    await expect(basic.getByRole('link', {name:'Começar como pessoa física'})).toBeVisible();
    await expect(basic.getByRole('link', {name:'Começar como organização'})).toBeVisible();
    await expect(navigation(org).getByRole('link', {name:'Preparar uma atividade'})).toHaveAttribute('href','/dashboard/nova-atividade');
    const intelligence = browserPage => workspace(browserPage).getByRole('region', {name:'Ou conte sua ideia'});
    for (const browserPage of [pf, org, basic]) await expect(intelligence(browserPage)).toHaveCount(0);
    await expect(intelligence(beta).getByText(/^Exemplo:/)).toBeVisible();
    await expect(intelligence(beta).getByRole('textbox')).toHaveCount(0);
    observations.push({checkpoint:'workspace-actions',focusStyle, sixTiles:true, noEmptyResume:true, betaOnly:true, localAnchors:true});
    await visual('umtap-pf-beta', beta, workspace(beta));
    await visual('umtap-pf-comum', pf, workspace(pf));
    await visual('umtap-organizacao', org, workspace(org));
    await visual('umtap-sem-perfil', basic, workspace(basic));
    await intelligence(beta).getByRole('link',{name:'Começar'}).click();
    await expect(beta).toHaveURL(origin + '/meu-espaco/ideia#editor-ideia');
    await expect(beta.locator('#editor-ideia')).toBeVisible();
    await beta.getByLabel('Título do rascunho').fill('Oficinas de Cultura Comunitária — fixture');
    await beta.getByLabel('Sua proposta').fill('Organizar uma oficina gratuita de leitura para a vizinhança.');
    await beta.getByLabel('Usar contexto autorizado').check();
    await beta.getByLabel('Sujeito do contexto').selectOption(owner.subject);
    await beta.getByLabel('Autorizo o envio do contexto selecionado ao provedor de IA').check();
    await beta.getByRole('button', { name: 'Interpretar proposta', exact: true }).click();
    await expect(beta.getByRole('heading', { name: 'Prévia para revisão humana' })).toBeVisible();
    await beta.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
    await expect(beta.getByRole('status').filter({ hasText: 'Rascunho privado salvo' })).toBeVisible();
    await beta.getByRole('button', { name: 'Consultar decisões' }).click();
    const editor = beta.getByRole('region', { name: 'Decisões da ideia' });
    const decisions = [
      ['gratuidade','DEFINIDO','Oferecer a oficina gratuitamente'],
      ['modalidade','PROVISÓRIO','Realizar encontros presenciais'],
      ['espaco','PENDENTE','Encontrar um espaço disponível'],
      ['inscricao','EXCLUÍDO','Cobrar inscrição dos participantes'],
    ];
    for (const [key, state, description] of decisions) {
      await editor.getByLabel('Chave da decisão').fill(key);
      await editor.getByLabel('Estado da decisão').selectOption(state);
      await editor.getByLabel('Descrição da decisão').fill(description);
      await editor.getByRole('button', {name:'Confirmar decisão',exact:true}).click();
      await expect(editor).toContainText(description);
    }
    await beta.getByRole('link', {name:'Usar esta ideia para criar uma atividade'}).click();
    await beta.getByLabel('Título', {exact:true}).fill('Oficinas de Cultura Comunitária — atividade sintética');
    await beta.getByLabel('Descrição', {exact:true}).fill('Ensaio local de acompanhamento cultural, sem pessoas reais.');
    await beta.getByLabel('Orientação de acesso', {exact:true}).fill('Ensaio privado.');
    const formatter = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo', dateStyle:'short', timeStyle:'short', hourCycle:'h23'});
    const begins = new Date(Math.ceil((Date.now() + 8_000) / 60_000) * 60_000);
    await beta.getByLabel('Data e horário (America/Sao_Paulo)', {exact:true}).fill(formatter.format(begins).replace(' ', 'T'));
    await beta.getByRole('button', {name:'Criar rascunho privado a partir desta ideia'}).click();
    const title = 'Oficinas de Cultura Comunitária — atividade sintética';
    await expect(beta.getByRole('heading', {name:title, exact:true})).toBeVisible();
    await beta.getByRole('link', {name:'Acompanhar '+title,exact:true}).click();
    await expect(beta).toHaveURL(/#acompanhamento$/);
    await beta.reload();
    const followUp = beta.getByRole('region', {name:'Acompanhamento da atividade'});
    const resource = followUp.getByLabel('Descrição do recurso');
    await expect(async () => {
      await resource.fill('Papel e tinta sintéticos');
      await expect(followUp.getByText('Alterações ainda não salvas.')).toBeVisible({timeout:1000});
    }).toPass({timeout:12_000});
    await followUp.getByLabel('Valor previsto (R$)').fill('24,50');
    await expect(followUp.getByText('Total previsto: R$ 24,50')).toBeVisible();
    await followUp.getByRole('button', {name:'Salvar planejamento'}).click();
    await expect(followUp.getByText('Planejamento privado salvo.', {exact:false})).toBeVisible();
    const declaration = followUp.getByRole('form', {name:'Registro de realização'});
    await expect.poll(() => Date.now() >= begins.getTime(), {timeout:100_000, intervals:[1000]}).toBe(true);
    const day = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo', dateStyle:'short'}).format(begins);
    await declaration.getByLabel('Data efetiva').fill(day);
    await declaration.getByLabel('Descrição factual').fill('A oficina sintética utilizou tinta e papel.');
    await declaration.getByLabel('Origem da informação').fill('Declaração sintética da titular.');
    await declaration.getByRole('button', {name:'Salvar declaração privada'}).click();
    await expect(followUp.getByRole('region', {name:'Registro privado'})).toBeVisible();
    const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII=', 'base64');
    const input = followUp.getByLabel('Arquivo de evidência privada');
    await expect(input).toBeEnabled();
    await input.setInputFiles({name:'ensaio-design01.png',mimeType:'image/png',buffer:imageBytes});
    await expect(followUp.getByRole('button',{name:'Enviar evidência privada'})).toBeEnabled();
    await followUp.getByRole('button',{name:'Enviar evidência privada'}).click();
    const attachment = followUp.getByRole('link',{name:'Abrir anexo privado'});
    await expect(attachment).toBeVisible();
    await beta.reload();
    await expect(followUp.getByRole('region', {name:'Registro privado'})).toContainText('A oficina sintética utilizou tinta e papel.');
    await expect(followUp.getByLabel('Descrição do recurso')).toHaveValue('Papel e tinta sintéticos');
    await expect(attachment).toBeVisible();
    const location = await attachment.getAttribute('href');
    expect(location).toMatch(/^\/api\/registros\/[a-z0-9-]+\/arquivos\/[a-z0-9-]+$/);
    const signedResponse = await beta.request.get(origin + location, {maxRedirects:0});
    expect(signedResponse.status()).toBe(302);
    const signed = new URL(signedResponse.headers().location);
    expect(signed.origin).toBe(supabaseOrigin);
    expect(await (await beta.request.get(signed.href, {maxRedirects:0})).body()).toEqual(imageBytes);
    const thirdPartyResponse = await pf.request.get(origin + location, {maxRedirects:0});
    expect([403,404]).toContain(thirdPartyResponse.status());
    const decisionsSnapshot = followUp.getByRole('region', {name:'Decisões na origem da atividade'});
    for (const [, , description] of decisions.slice(0,3)) await expect(decisionsSnapshot.getByText(description,{exact:false})).toBeVisible();
    const excluded = decisionsSnapshot.getByText(decisions[3][2],{exact:false});
    await expect(excluded).toBeHidden();
    await decisionsSnapshot.getByText('Alternativas excluídas',{exact:true}).click();
    await expect(excluded).toBeVisible();
    await visual('continuidade', beta, decisionsSnapshot);
    await visual('acompanhamento', beta, followUp);
    const tracking = followUp.getByRole('navigation',{name:'Seções do acompanhamento'});
    for (const href of await tracking.getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')))) {
      expect(href).toMatch(/^#/);
      await expect(beta.locator(href)).toHaveCount(1);
    }
    const activityId = new URL(beta.url()).pathname.split('/').at(-1);
    await pf.goto('/dashboard/atividade/' + activityId + '#acompanhamento');
    await expect(pf.getByText(title,{exact:true})).toHaveCount(0);
    await expect(pf.getByText(decisions[0][2],{exact:false})).toHaveCount(0);
    await beta.goto('/dashboard/pessoa-fisica');
    await expect(navigation(beta).getByRole('link',{name:'Acompanhar compromissos e evidências'})).toHaveAttribute('href','#minhas-atividades');
    await navigation(beta).getByRole('link',{name:'Acompanhar compromissos e evidências'}).click();
    await beta.getByRole('link',{name:'Acompanhar '+title,exact:true}).click();
    await expect(beta).toHaveURL(new RegExp('/dashboard/atividade/' + activityId + '#acompanhamento$'));
    observations.push({checkpoint:'continuity-roundtrip',manualDecisionStates:4,activeExcludedSeparated:true,
      privatePlanDeclarationAndAttachment:true,otherPersonDenied:true,resumePastActivity:true});
    expect(pageErrors).toEqual([]);
  } finally {
    try {
      for (const context of contexts) await context.close();
      for (const f of fixtures) {
        await db.query('begin');
        try {
          await db.query("delete from public.eventos_editoriais where objeto_id=$1 or (objeto_tipo='atividade' and objeto_id in (select id from public.atividades where sujeito_id=$1))", [f.subject]);
          const activities = 'select id from public.atividades where sujeito_id=$1';
          const records = 'select id from public.registros_realizacao where atividade_id in (' + activities + ')';
          await db.query("delete from public.eventos_editoriais where objeto_tipo='registro' and objeto_id in (" + records + ')', [f.subject]);
          const files = await db.query('select object_key from public.evidencias_arquivos_privados where registro_id in (' + records + ')', [f.subject]);
          if (files.rowCount) expect((await admin.storage.from(bucket).remove(files.rows.map(file => file.object_key))).error).toBeNull();
          await db.query('delete from public.evidencias_arquivos_privados where registro_id in (' + records + ')', [f.subject]);
          await db.query('delete from public.evidencias where registro_id in (' + records + ')', [f.subject]);
          await db.query('delete from public.registros_realizacao where atividade_id in (' + activities + ')', [f.subject]);
          await db.query('delete from public.itens_planejamento_execucao where plano_id in (select id from public.planos_execucao where atividade_id in (' + activities + '))', [f.subject]);
          await db.query('delete from public.planos_execucao where atividade_id in (' + activities + ')', [f.subject]);
          await db.query('delete from public.atividades where sujeito_id=$1', [f.subject]);
          await db.query('delete from public.ideias_privadas where owner_id=$1', [f.id]);
          await db.query('delete from public.capacidades where sujeito_id=$1', [f.subject]);
          await db.query('delete from public.vinculos_publicadores where sujeito_id=$1', [f.subject]);
          await db.query('delete from public.pessoas_fisicas where sujeito_id=$1', [f.subject]);
          await db.query('delete from public.sujeitos_publicadores where id=$1', [f.subject]);
          await db.query('delete from public.contas_acesso where auth_user_id=$1', [f.id]);
          if (f.organization) await db.query('delete from public.organizacoes where id=$1', [f.organization]);
          await db.query('commit');
        } catch (error) { await db.query('rollback'); throw error; }
        expect((await admin.auth.admin.deleteUser(f.id)).error).toBeNull();
        expect((await db.query('select exists(select 1 from auth.users where id=$1) as residual', [f.id])).rows[0].residual).toBe(false);
      }
      if (bucketCreated) {
        const contents = await admin.storage.from(bucket).list('');
        expect(contents.error).toBeNull();
        expect(contents.data).toEqual([]);
        expect((await admin.storage.deleteBucket(bucket)).error).toBeNull();
      }
      observations.push({ checkpoint: 'cleanup', fixtures: fixtures.length, bucketRemoved: bucketCreated });
    } finally {
      await db.end();
      await testInfo.attach('observacoes-sanitizadas', { body: JSON.stringify({ observations, network, pageErrors, consoleDiagnostics }, null, 2), contentType: 'application/json' });
    }
  }
});
