import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
test.describe.configure({mode:'default'});
const origin='http://127.0.0.1:3215',fixtures=[],ids=[],auths=[],routes=[],consoleErrors=[];let db,admin;
async function submitted(owner=0){
 const page=fixtures[owner].page;
 const result=await page.evaluate(async()=>{
  const r=await fetch('/api/atividades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({titulo:'Publicação Fictícia E2E '+crypto.randomUUID(),descricao:'Descrição fictícia para testar revisão.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Entrada fictícia gratuita.'})});return {status:r.status,body:await r.json()};
 });expect(result.status).toBe(200);const id=result.body.atividade.id;ids.push(id);
 const sent=await page.evaluate(async id=>{const r=await fetch('/api/atividades/'+id+'/enviar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({versao_esperada:1})});return r.status;},id);expect(sent).toBe(200);return id;
}
test.beforeAll(async({browser})=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures e limpeza requerem autorização específica.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
 db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<4;i++){
  const f={email:`record-e2e-${randomUUID()}@example.invalid`,password:randomUUID()+'aA1!'};fixtures.push(f);
  const created=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true,user_metadata:{papel:'administrador'}});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');f.id=created.data.user.id;
  if(i<2){const linked=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:f.id,p_nome_publico:'Organização Fictícia Publicação '+randomUUID(),p_canal_publico:null});if(linked.error)throw new Error('Fixture organização falhou.');f.org=linked.data;}
  else await db.query('insert into public.contas_acesso(auth_user_id,papel) values($1,$2)',[f.id,i===2?'editor':'administrador']);
  if(i===0)await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[f.org]);
  f.context=await browser.newContext({baseURL:origin});await f.context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'&&['3215','56151'].includes(u.port)?route.continue():route.abort();});f.page=await f.context.newPage();
  f.page.on('pageerror',()=>consoleErrors.push({type:'pageerror',details:'omitidos'}));f.page.on('console',m=>{if(m.type()==='error')consoleErrors.push({type:'console.error',category:m.text().startsWith('Failed to load resource')?'HTTP negative':'other omitted'});});
  f.page.on('response',r=>{const u=new URL(r.url());if(u.origin===origin&&(u.pathname.startsWith('/api/')||r.request().isNavigationRequest()))routes.push({method:r.request().method(),path:u.pathname,status:r.status()});});
  await f.page.goto('/login');await f.page.getByLabel('E-mail',{exact:true}).fill(f.email);await f.page.getByLabel('Senha',{exact:true}).fill(f.password);await f.page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(f.page).toHaveURL(origin+(i<2?'/dashboard':'/admin/atividades'));
 }
},60000);
test.afterAll(async()=>{
 for(const f of fixtures)await f.context?.close();
 if(db){
  const users=fixtures.map(f=>f.id).filter(Boolean),orgs=fixtures.map(f=>f.org).filter(Boolean);
  const activities=(await db.query('select a.id from public.atividades a join public.contas_acesso c on c.id=a.criada_por_conta_id where c.auth_user_id=any($1::uuid[])',[users])).rows.map(r=>r.id);
  await db.query("delete from public.eventos_editoriais where objeto_tipo='registro' and objeto_id in (select id from public.registros_realizacao where atividade_id=any($1::uuid[]))",[activities]);await db.query('delete from public.evidencias where registro_id in (select id from public.registros_realizacao where atividade_id=any($1::uuid[]))',[activities]);await db.query('delete from public.registros_realizacao where atividade_id=any($1::uuid[])',[activities]);
  await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[activities]);await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[auths]);await db.query('delete from public.atividades where id=any($1::uuid[])',[activities]);
  await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))',[users]);await db.query('delete from public.sujeitos_publicadores where organizacao_legada_id=any($1::uuid[])',[orgs]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');await db.end();
 }
 const out=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/incremento-3-b10-b12-c01-c08';if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out))throw new Error('Diretório inválido.');mkdirSync(out,{recursive:true});writeFileSync(out+'/records-observations.json',JSON.stringify({routes,consoleErrors,cleanup:'Somente fixtures próprias desta execução removidas',role_setup:'Papel editorial explícito em SQL antes de login real pela UI; nenhum papel real/institucional criado.'},null,2)+'\n');
});
async function visitor(browser){const context=await browser.newContext({baseURL:origin});await context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'&&['3215','56151'].includes(u.port)?route.continue():route.abort();});const page=await context.newPage();page.on('pageerror',()=>consoleErrors.push({type:'pageerror',details:'omitidos'}));page.on('console',m=>{if(m.type()==='error')consoleErrors.push({type:'console.error',category:m.text().startsWith('Failed to load resource')?'HTTP negative':'other omitted'});});page.on('response',r=>{const u=new URL(r.url());if(u.origin===origin&&(u.pathname.startsWith('/api/')||r.request().isNavigationRequest()))routes.push({method:r.request().method(),path:u.pathname,status:r.status()});});return {context,page};}
test('C01 Chromium: data futura recusada; declaração efetiva fica privada e isolada',async({browser})=>{
 const id=await submitted(),owner=fixtures[0].page,other=fixtures[1].page,v=await visitor(browser);
 try{
  await owner.goto('/dashboard/atividade/'+id);await owner.getByLabel('Data efetiva',{exact:true}).fill('2099-01-01');await owner.getByLabel('Descrição factual',{exact:true}).fill('RELATO_PRIVADO_FICTICIO_C01');await owner.getByLabel('Origem da informação',{exact:true}).fill('Declaração fictícia da organização.');await owner.getByRole('button',{name:'Salvar declaração privada',exact:true}).click();await expect(owner.getByRole('form',{name:'Registro de realização'}).getByRole('alert')).toBeVisible();await expect(owner.getByLabel('Data efetiva',{exact:true})).toHaveAttribute('aria-invalid','true');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());await owner.getByLabel('Data efetiva',{exact:true}).fill(today);const response=owner.waitForResponse(r=>r.url().endsWith('/api/atividades/'+id+'/registro')&&r.request().method()==='POST');await owner.getByRole('button',{name:'Salvar declaração privada',exact:true}).click();expect((await response).status()).toBe(200);await expect(owner.getByRole('region',{name:'Registro privado'})).toContainText('RELATO_PRIVADO_FICTICIO_C01');
  expect((await other.request.get('/api/atividades/'+id+'/registro')).status()).toBe(404);expect((await v.page.request.get('/api/atividades/'+id+'/registro')).status()).toBe(401);await v.page.goto('/atividade/'+id);expect(await v.page.content()).not.toContain('RELATO_PRIVADO_FICTICIO_C01');
 }finally{await v.context.close();}
});
test('C02–C04 Chromium: declaração permanece declarada; referência parcial privada e referência sensível bloqueada',async()=>{
 const id=await submitted(),owner=fixtures[0].page;
 const result=await owner.evaluate(async id=>{const r=await fetch('/api/atividades/'+id+'/registro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pedido_id:crypto.randomUUID(),versao_esperada:1,data_realizacao:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()),descricao_factual:'Declaração fictícia sem corroboração.',origem_informacao:'Declaração da organização fictícia.'})});return {status:r.status,body:await r.json()};},id);expect(result.status).toBe(200);expect(result.body.registro.estado_apuracao).toBe('declarado');
 await owner.goto('/dashboard/atividade/'+id);await owner.getByLabel('Tipo da fonte',{exact:true}).fill('Relato público fictício');await owner.getByLabel('Referência pública',{exact:true}).fill('https://example.invalid/relato?email=fixture%40example.invalid');await owner.getByLabel('Afirmação sustentada',{exact:true}).fill('A fonte documenta somente a abertura fictícia.');const consulted=await owner.evaluate(()=>{const d=new Date(Date.now()-60000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);});await owner.getByLabel('Data da consulta (horário deste navegador)',{exact:true}).fill(consulted);await owner.getByRole('button',{name:'Salvar referência privada',exact:true}).click();await expect(owner.getByLabel('Referência pública',{exact:true})).toHaveAttribute('aria-invalid','true');
 await owner.getByLabel('Referência pública',{exact:true}).fill('https://example.invalid/relato');const response=owner.waitForResponse(r=>r.url().endsWith('/registro/evidencias')&&r.request().method()==='POST');await owner.getByRole('button',{name:'Salvar referência privada',exact:true}).click();expect((await response).status()).toBe(200);await expect(owner.getByRole('region',{name:'Registro privado'})).toContainText('A fonte documenta somente a abertura fictícia.');const record=(await (await owner.request.get('/api/atividades/'+id+'/registro')).json()).registro;expect(record.estado_apuracao).toBe('declarado');expect(record.evidencias).toHaveLength(1);expect(record.evidencias[0].aprovada_publicacao).toBe(false);
});
