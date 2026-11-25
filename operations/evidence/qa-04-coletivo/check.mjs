import { chromium, devices } from 'playwright';
import { expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const origin = 'http://127.0.0.1:3215';
const api = 'http://127.0.0.1:56151';
const mode = process.env.QA04_MODE;
if (!['red', 'green'].includes(mode) || process.env.DIGITAP_G4_03B_GATEWAY_MOCK !== '1' || process.env.AI_GATEWAY_API_KEY !== 'g4-03b-synthetic-only') throw Error('Ambiente sintético exigido.');
const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const database = new URL(local.DB_URL);
if (local.API_URL !== api || database.hostname !== '127.0.0.1' || database.port !== '56152' || database.pathname !== '/postgres') throw Error('Destino local exigido.');
const admin = createClient(api, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const db = new Client(local.DB_URL);
const observation = { mode, cleanup: false };
const directory = 'operations/evidence/qa-04-coletivo';
const name = 'Coletivo sintético QA-04';
let browser, user, account, subject;
try {
  await db.connect();
  const email = 'qa04-' + randomUUID() + '@example.invalid';
  const password = randomUUID() + 'aA1!';
  const auth = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  user = auth.data.user?.id;
  if (auth.error || !user) throw Error('Fixture Auth não criada.');
  await db.query('begin');
  try {
    account = (await db.query("insert into public.contas_acesso(auth_user_id,papel,situacao,ativa_desde) values($1,'publicador','ativa',clock_timestamp()) returning id", [user])).rows[0].id;
    subject = (await db.query("insert into public.sujeitos_publicadores(tipo,nome_publico,estado,modo_publicacao,risco,origem,criado_por_conta_id) values('coletivo_informal',$1,'ativo','curadoria_previa','medio','cadastro',$2) returning id", [name, account])).rows[0].id;
    await db.query('insert into public.coletivos_informais(sujeito_id,nome_em_curadoria) values($1,$2)', [subject, name]);
    await db.query("insert into public.vinculos_publicadores(sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,ativada_em) values($1,$2,'titular',array['ler_privado','editar','enviar'],'ativo','cadastro',clock_timestamp())", [subject, account]);
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
  browser = await chromium.launch({ chromiumSandbox: true });
  const context = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1, serviceWorkers: 'block' });
  await context.route('**/*', route => [origin, api].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(origin + '/login');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(origin + '/');
  await page.goto(origin + '/meu-espaco');
  await expect(page).toHaveURL(origin + '/dashboard');
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByText('Coletivo informal', { exact: true })).toBeVisible();
  const taps = page.getByRole('navigation', { name: 'Taps para participar' });
  if (mode === 'red') {
    const link = taps.getByRole('link', { name: 'Acessar minha organização', exact: true });
    observation.label = await link.textContent();
    observation.destination = await link.getAttribute('href');
    await link.click();
    await expect(page).toHaveURL(origin + '/dashboard/organizacao');
    await expect(page.getByRole('heading', { name: 'Acesso indisponível' })).toBeVisible();
    observation.visibleResult = 'Acesso indisponível';
  } else {
    await expect(taps.getByRole('link', { name: 'Acessar minha organização', exact: true })).toHaveCount(0);
    await expect(taps.getByRole('link', { name: 'Revisar perfil do coletivo', exact: true })).toBeVisible();
    const mutations = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin === origin && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push(true);
    });
    const link = taps.getByRole('link', { name: 'Consultar meu coletivo', exact: true });
    observation.label = await link.textContent();
    observation.destination = await link.getAttribute('href');
    await link.click();
    await expect(page).toHaveURL(origin + '/dashboard#vinculo-coletivo');
    const target = page.locator('#vinculo-coletivo');
    await expect(target).toBeInViewport();
    await expect(target).toContainText('Coletivo informal');
    await page.reload();
    await expect(target).toContainText('Coletivo informal');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + '/dashboard');
    await link.click();
    await expect(target).toBeInViewport();
    await expect(target).toContainText('Coletivo informal');
    observation.viewports = ['iPhone 13', '1440 × 900'];
    const stored = await db.query(
      'select papel_vinculo, escopos, situacao from public.vinculos_publicadores where sujeito_id=$1 and conta_id=$2',
      [subject, account],
    );
    expect(stored.rows).toEqual([{ papel_vinculo: 'titular', escopos: ['ler_privado', 'editar', 'enviar'], situacao: 'ativo' }]);
    expect(mutations).toHaveLength(0);
    await page.goto(origin + '/dashboard/organizacao');
    await expect(page.getByRole('heading', { name: 'Acesso indisponível' })).toBeVisible();
    const guestContext = await browser.newContext({ serviceWorkers: 'block' });
    await guestContext.route('**/*', route => [origin, api].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
    const guest = await guestContext.newPage();
    await guest.goto(origin + '/dashboard');
    await expect(guest).toHaveURL(origin + '/login');
    await expect(guest.locator('#vinculo-coletivo')).toHaveCount(0);
    await guestContext.close();
    observation.visibleResult = 'Vínculo de coletivo consultável após recarga';
    observation.directOrganizationAccessDenied = true;
    observation.guestRedirectsToLogin = true;
    observation.writeRequests = mutations.length;
  }
} finally {
  await browser?.close();
  if (user) {
    await db.query('begin');
    await db.query('delete from public.vinculos_publicadores where conta_id=$1', [account]);
    await db.query('delete from public.coletivos_informais where sujeito_id=$1', [subject]);
    await db.query('delete from public.sujeitos_publicadores where id=$1', [subject]);
    await db.query('delete from public.contas_acesso where id=$1', [account]);
    await db.query('commit');
    if ((await admin.auth.admin.deleteUser(user)).error) throw Error('Fixture Auth não removida.');
    const { rows } = await db.query('select (select count(*) from auth.users where id=$1)::int + (select count(*) from public.sujeitos_publicadores where id=$2)::int as residual', [user, subject]);
    observation.cleanup = rows[0].residual === 0;
  }
  await db.end();
  writeFileSync(directory + '/' + mode + '.json', JSON.stringify(observation, null, 2) + '\n', { mode: 0o600 });
}
