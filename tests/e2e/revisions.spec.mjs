import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
test.describe.configure({mode:'default'});
const origin='http://127.0.0.1:3215',fixtures=[],ids=[],auths=[],routes=[],consoleErrors=[];let db,admin;
const cmd=(acao='iniciar',estado_esperado='enviada',extra={})=>({acao,estado_esperado,versao_esperada:1,pedido_id:randomUUID(),...extra});
async function api(page,id,body){return page.evaluate(async({id,body})=>{const r=await fetch('/api/admin/atividades/'+id+'/revisar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};},{id,body});}
async function submitted(owner=0){
 const page=fixtures[owner].page;
 const result=await page.evaluate(async()=>{
  const r=await fetch('/api/atividades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({titulo:'Publicação Fictícia E2E '+crypto.randomUUID(),descricao:'Descrição fictícia para testar revisão.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Entrada fictícia gratuita.'})});return {status:r.status,body:await r.json()};
 });expect(result.status).toBe(200);const id=result.body.atividade.id;ids.push(id);
 const sent=await page.evaluate(async id=>{const r=await fetch('/api/atividades/'+id+'/enviar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({versao_esperada:1})});return r.status;},id);expect(sent).toBe(200);return id;
}
async function authorization(id,patch={}){
 const record={id:randomUUID(),objeto_tipo:'atividade',objeto_id:id,escopo_autorizado:['divulgacao','atividade:versao:1'],papel_autorizante:'Responsável fictício',comprovante_restrito:'Comprovação fictícia exclusiva E2E',autorizada_em:new Date(Date.now()-10000),situacao:'vigente',validade_ate:new Date(Date.now()+3600000),revogada_em:null,...patch};
 await db.query('insert into public.autorizacoes_publicacao(id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em,situacao,validade_ate,revogada_em) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',Object.values(record));auths.push(record.id);return record.id;
}
test.beforeAll(async({browser})=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures e limpeza requerem autorização específica.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
 db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<4;i++){
  const f={email:`revision-e2e-${randomUUID()}@example.invalid`,password:randomUUID()+'aA1!'};fixtures.push(f);
  const created=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true,user_metadata:{papel:'administrador'}});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');f.id=created.data.user.id;
  if(i<2){const linked=await admin.rpc('criar_organizacao_pendente',{p_auth_user_id:f.id,p_nome_publico:'Organização Fictícia Publicação '+randomUUID()});if(linked.error)throw new Error('Fixture organização falhou.');f.org=linked.data;}
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
  await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[activities]);await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[auths]);await db.query('delete from public.atividades where id=any($1::uuid[])',[activities]);
  await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');await db.end();
 }
 const out=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/incremento-3-b08-b09';if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out))throw new Error('Diretório inválido.');mkdirSync(out,{recursive:true});writeFileSync(out+'/revisions-observations.json',JSON.stringify({routes,consoleErrors,cleanup:'Somente fixtures próprias desta execução removidas',role_setup:'Papel editorial explícito em SQL antes de login real pela UI; nenhum papel real/institucional criado.'},null,2)+'\n');
});
const publishCommand=()=>({versao_esperada:1,pedido_id:randomUUID()});
async function publish(page,id,body){return page.evaluate(async({id,body})=>{const r=await fetch('/api/admin/atividades/'+id+'/publicar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};},{id,body});}
async function approved(owner=0){const id=await submitted(owner),editor=fixtures[2].page;expect((await api(editor,id,cmd())).status).toBe(200);const auth=await authorization(id);expect((await api(editor,id,cmd('aprovar','em_revisao',{autorizacao_id:auth}))).status).toBe(200);return {id,auth};}
async function visitor(browser){const context=await browser.newContext({baseURL:origin});await context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'&&['3215','56151'].includes(u.port)?route.continue():route.abort();});const page=await context.newPage();page.on('pageerror',()=>consoleErrors.push({type:'pageerror',details:'omitidos'}));page.on('console',m=>{if(m.type()==='error')consoleErrors.push({type:'console.error',category:m.text().startsWith('Failed to load resource')?'HTTP negative':'other omitted'});});page.on('response',r=>{const u=new URL(r.url());if(u.origin===origin&&(u.pathname.startsWith('/api/')||r.request().isNavigationRequest()))routes.push({method:r.request().method(),path:u.pathname,status:r.status()});});return {context,page};}
async function published(){const v=await approved();expect((await publish(fixtures[2].page,v.id,publishCommand())).status).toBe(200);return v;}
async function mutation(page,path,body,method='POST'){return page.evaluate(async({path,body,method})=>{const r=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};},{path,body,method});}
test('B08 RED Chromium: edição pendente não aparece em HTML, metadata, lista ou API; aprovação troca versão',async({browser})=>{
 const {id}=await published(),owner=fixtures[0].page,editor=fixtures[2].page,v=await visitor(browser);
 try{const snapshot=(await (await v.page.request.get('/api/public/atividades/'+id)).json()).atividade;await owner.goto('/dashboard/atividade/'+id);const title='PENDENTE_FICTICIO_'+randomUUID();await owner.getByLabel('Título',{exact:true}).fill(title);await owner.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(owner.getByText('Rascunho privado',{exact:true})).toBeVisible();
 for(const path of ['/atividade/'+id,'/atividades']){await v.page.goto(path);expect(await v.page.content()).not.toContain(title);}const r=await v.page.request.get('/api/public/atividades/'+id);expect((await r.json()).atividade).toEqual(snapshot);expect(await (await v.page.request.get('/api/public/atividades')).text()).not.toContain(title);
 await owner.getByRole('button',{name:'Enviar atividade',exact:true}).click();await expect(owner.getByText('Enviada — continua privada',{exact:true})).toBeVisible();expect((await api(editor,id,cmd('iniciar','enviada',{versao_esperada:2}))).status).toBe(200);const auth=await authorization(id,{escopo_autorizado:['divulgacao','atividade:versao:2']});await editor.goto('/dashboard/atividade/'+id);await editor.getByLabel('ID da autorização para esta versão',{exact:true}).fill(auth);await editor.getByRole('button',{name:'Aprovar versão',exact:true}).click();await expect(editor.getByText('Publicada',{exact:true})).toBeVisible();await v.page.goto('/atividade/'+id);await expect(v.page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 }finally{await v.context.close();}
});
test('B09 RED Chromium: editor retira com motivo, visitante perde acesso e API nega republicação',async({browser})=>{
 const {id}=await published(),editor=fixtures[2].page,v=await visitor(browser);try{await editor.goto('/dashboard/atividade/'+id);await editor.getByLabel('Motivo da retirada',{exact:true}).fill('Motivo fictício restrito da retirada.');await editor.getByRole('button',{name:'Retirar publicação',exact:true}).click();await expect(editor.getByText('Retirada — não está pública',{exact:true})).toBeVisible();expect((await v.page.goto('/atividade/'+id)).status()).toBe(404);expect((await (await v.page.request.get('/api/public/atividades')).json()).atividades.some(a=>a.id===id)).toBe(false);expect((await publish(editor,id,publishCommand())).status).toBe(409);expect((await db.query('select apoios_abertos from public.atividades where id=$1',[id])).rows[0].apoios_abertos).toBe(false);}finally{await v.context.close();}
});
test('B09: permissões reais, idempotência e motivo restrito na UI/API',async({browser})=>{
 const {id}=await published(),editor=fixtures[2].page,request={...publishCommand(),motivo:'MOTIVO_RESTRITO_FICTICIO_'+randomUUID()},path='/api/admin/atividades/'+id+'/retirar',v=await visitor(browser);
 try{await v.page.goto('/login');expect((await mutation(v.page,path,request)).status).toBe(401);for(const f of fixtures.slice(0,2))expect((await mutation(f.page,path,request)).status).toBe(403);expect((await mutation(editor,path,{...request,papel:'editor'})).status).toBe(400);expect((await mutation(editor,path,{...request,motivo:''})).status).toBe(422);expect((await mutation(editor,path,{...request,versao_esperada:2})).status).toBe(409);
 const result=await Promise.all(Array.from({length:6},()=>mutation(editor,path,request)));expect(result.every(r=>r.status===200)).toBe(true);expect(result.filter(r=>!r.body.atividade.repetida)).toHaveLength(1);expect((await mutation(editor,path,{...request,pedido_id:randomUUID()})).status).toBe(409);
 await fixtures[0].page.goto('/dashboard/atividade/'+id);await expect(fixtures[0].page.getByRole('region',{name:'Motivo da retirada'})).toContainText(request.motivo);const other=await fixtures[1].page.request.get('/api/atividades/'+id);expect(other.status()).toBe(404);expect(await other.text()).not.toContain(request.motivo);const pub=await v.page.request.get('/api/public/atividades/'+id);expect(pub.status()).toBe(404);expect(await pub.text()).not.toContain(request.motivo);await v.page.goto('/atividade/'+id);expect(await v.page.content()).not.toContain(request.motivo);
 }finally{await v.context.close();}
});
