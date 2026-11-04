import { test,expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync,mkdirSync } from 'node:fs';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
test.describe.configure({mode:'serial'});
const origin='http://127.0.0.1:3215';const fixtures=[],routes=[],consoleErrors=[];let db,admin,activity;
const future=new Date(Date.now()+86400000*3).toISOString().slice(0,10)+'T15:30';
async function api(page,path,body,method='POST'){
 return page.evaluate(async({path,body,method})=>{const r=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};},{path,body,method});
}
const content=()=>({titulo:'Atividade Fictícia E2E '+randomUUID(),descricao:'Descrição inteiramente fictícia para testes.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Acesso fictício gratuito.'});
test.beforeAll(async({browser})=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures reais e limpeza requerem autorização.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
 db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<3;i++){
  const f={email:`activity-e2e-${randomUUID()}@example.invalid`,password:randomUUID()+'aA1!'};fixtures.push(f);
  const created=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');f.id=created.data.user.id;
  const linked=await admin.rpc('criar_organizacao_pendente',{p_auth_user_id:f.id,p_nome_publico:'Organização Fictícia E2E '+randomUUID()});if(linked.error)throw new Error('Fixture de organização falhou.');f.org=linked.data;
  f.context=await browser.newContext({baseURL:origin,timezoneId:i===0?'Asia/Tokyo':'America/Sao_Paulo'});
  await f.context.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname==='127.0.0.1'&&['3215','56151'].includes(url.port)?route.continue():route.abort();});
  f.page=await f.context.newPage();
  f.page.on('pageerror',()=>consoleErrors.push({type:'pageerror',details:'omitidos'}));
  f.page.on('response',r=>{const u=new URL(r.url());if(u.origin===origin&&(u.pathname.startsWith('/api/')||r.request().isNavigationRequest()))routes.push({method:r.request().method(),path:u.pathname,status:r.status()});});
  f.page.on('console',m=>{if(m.type()==='error')consoleErrors.push({type:'console.error',category:m.text().startsWith('Failed to load resource')?'HTTP negative':'other omitted'});});
  await f.page.goto('/login');await f.page.getByLabel('E-mail',{exact:true}).fill(f.email);await f.page.getByLabel('Senha',{exact:true}).fill(f.password);await f.page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(f.page).toHaveURL(origin+'/dashboard');
 }
 // Grant editor explicitly to this fixture after a real organization login;
 // this tests server-side role re-reading, not a new editor login feature.
 await db.query("update public.contas_acesso set papel='editor' where auth_user_id=$1",[fixtures[2].id]);
},60000);
test.afterAll(async()=>{
 for(const f of fixtures)await f.context?.close();
 if(db){
  const users=fixtures.map(f=>f.id).filter(Boolean),orgs=fixtures.map(f=>f.org).filter(Boolean);
  const ids=(await db.query('select a.id from public.atividades a join public.contas_acesso c on c.id=a.criada_por_conta_id where c.auth_user_id=any($1::uuid[])',[users])).rows.map(r=>r.id);
  await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
  await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
  for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');await db.end();
 }
 const dir=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/incremento-3-b01-b04';if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(dir))throw new Error('Diretório inválido.');mkdirSync(dir,{recursive:true});writeFileSync(dir+'/activities-observations.json',JSON.stringify({routes,consoleErrors,cleanup:'Somente fixtures desta execução removidas',editor:'Papel atribuído manualmente em SQL apenas à fixture já autenticada; sem novo fluxo de login editorial.'},null,2)+'\n');
});
test('B01: rascunho privado, edição própria, visitante e tenant alheio negados; editor lê',async({browser})=>{
 const [a,b,e]=fixtures;
 await a.page.goto('/dashboard/nova-atividade');await expect(a.page.getByRole('heading',{name:'Nova atividade'})).toBeVisible();
 await a.page.getByLabel('Título',{exact:true}).fill('Atividade Fictícia Privada E2E');await a.page.getByLabel('Descrição',{exact:true}).fill('Descrição fictícia de rascunho privado.');
 await a.page.getByLabel('Data e horário (America/Sao_Paulo)',{exact:true}).fill(future);await a.page.getByLabel('Orientação de acesso',{exact:true}).fill('Entrada fictícia gratuita.');
 await a.page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(a.page).toHaveURL(/\/dashboard\/atividade\/[0-9a-f-]+$/);
 activity=a.page.url().split('/').pop();await a.page.reload();await expect(a.page.getByLabel('Título',{exact:true})).toHaveValue('Atividade Fictícia Privada E2E');
 const row=(await db.query('select inicio_previsto,versao_publicada from public.atividades where id=$1',[activity])).rows[0];expect(row.versao_publicada).toBeNull();expect(row.inicio_previsto.toISOString()).toBe(new Date(future+':00-03:00').toISOString());
 await a.page.getByLabel('Título',{exact:true}).fill('Atividade Fictícia Editada E2E');await a.page.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(a.page.getByLabel('Título',{exact:true})).toHaveValue('Atividade Fictícia Editada E2E');
 await b.page.goto('/dashboard/atividade/'+activity);expect((await b.page.locator('body').innerText()).includes('Atividade Fictícia Editada E2E')).toBe(false);
 const foreign=await b.page.request.get('/api/atividades/'+activity);expect(foreign.status()).toBe(404);
 expect((await api(b.page,'/api/atividades/'+activity,{...content(),versao_esperada:2},'PATCH')).status).toBe(404);
 await e.page.goto('/dashboard/atividade/'+activity);await expect(e.page.getByRole('heading',{name:'Atividade Fictícia Editada E2E',exact:true})).toBeVisible();expect(await e.page.getByRole('button',{name:'Enviar atividade',exact:true}).count()).toBe(0);
 const visitor=await browser.newContext({baseURL:origin});const page=await visitor.newPage();await page.goto('/dashboard/atividade/'+activity);await expect(page).toHaveURL(origin+'/login');expect((await page.request.get('/api/atividades/'+activity)).status()).toBe(401);await visitor.close();
});
test('B02: campos obrigatórios ausentes impedem salvar/enviar por UI/API',async()=>{
 const a=fixtures[0];await a.page.goto('/dashboard/nova-atividade');await a.page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(a.page.locator('form [role=alert]')).toBeVisible();
 expect((await api(a.page,'/api/atividades',{titulo:'Só título'})).status).toBe(422);
 expect((await api(a.page,'/api/atividades/'+activity+'/enviar',{})).status).toBe(422);
 expect((await db.query('select estado_editorial from public.atividades where id=$1',[activity])).rows[0].estado_editorial).toBe('rascunho');
});
test('B03: API rejeita datas/URL/HTML e IDs de organização forjados',async()=>{
 const a=fixtures[0];
 for(const patch of [{inicio_previsto:'2020-01-01T12:00:00Z'},{inicio_previsto:'2030-02-30T10:00:00-03:00'},{referencia_oficial:'javascript:alert(1)'},{descricao:'<script>alert(1)</script>'}])expect((await api(a.page,'/api/atividades',{...content(),...patch})).status).toBe(422);
 expect((await api(a.page,'/api/atividades',{...content(),organizacao_id:fixtures[1].org})).status).toBe(400);
});
test('B04: envio real permanece privado, audita uma vez e retry é idempotente',async({browser})=>{
 const a=fixtures[0];await a.page.goto('/dashboard/atividade/'+activity);await a.page.getByRole('button',{name:'Enviar atividade',exact:true}).click();await expect(a.page.getByText('Enviada — continua privada',{exact:true})).toBeVisible();
 const version=(await db.query('select versao_submetida from public.atividades where id=$1',[activity])).rows[0].versao_submetida;
 const retries=await Promise.all(Array.from({length:4},()=>api(a.page,'/api/atividades/'+activity+'/enviar',{versao_esperada:version})));expect(retries.every(r=>r.status===200&&r.cache.includes('no-store'))).toBe(true);
 expect((await db.query('select count(*)::int n from public.eventos_editoriais where objeto_id=$1',[activity])).rows[0].n).toBe(1);
 const stored=(await db.query('select estado_editorial,versao_publicada,publicada_em,apoios_abertos from public.atividades where id=$1',[activity])).rows[0];expect(stored).toEqual({estado_editorial:'enviada',versao_publicada:null,publicada_em:null,apoios_abertos:false});
 const visitor=await browser.newContext({baseURL:origin});const page=await visitor.newPage();const publicResponse=await page.goto('/atividade/'+activity);expect(publicResponse.status()).toBe(404);expect((await page.locator('body').innerText()).includes('Atividade Fictícia Editada E2E')).toBe(false);
 await page.goto('/');expect((await page.locator('body').innerText()).includes('Atividade Fictícia Editada E2E')).toBe(false);expect((await page.request.get('/api/atividades')).status()).toBe(401);await visitor.close();
});
