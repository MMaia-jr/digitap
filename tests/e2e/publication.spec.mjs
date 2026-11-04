import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
test.describe.configure({mode:'serial'});
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
  const f={email:`publish-e2e-${randomUUID()}@example.invalid`,password:randomUUID()+'aA1!'};fixtures.push(f);
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
 const out=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/incremento-3-b07';if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out))throw new Error('Diretório inválido.');mkdirSync(out,{recursive:true});writeFileSync(out+'/publication-observations.json',JSON.stringify({routes,consoleErrors,cleanup:'Somente fixtures próprias desta execução removidas',role_setup:'Papel editorial explícito em SQL antes de login real pela UI; nenhum papel real/institucional criado.'},null,2)+'\n');
});
const publishCommand=()=>({versao_esperada:1,pedido_id:randomUUID()});
async function publish(page,id,body){return page.evaluate(async({id,body})=>{const r=await fetch('/api/admin/atividades/'+id+'/publicar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};},{id,body});}
async function approved(owner=0){const id=await submitted(owner),editor=fixtures[2].page;expect((await api(editor,id,cmd())).status).toBe(200);const auth=await authorization(id);expect((await api(editor,id,cmd('aprovar','em_revisao',{autorizacao_id:auth}))).status).toBe(200);return {id,auth};}
async function visitor(browser){const context=await browser.newContext({baseURL:origin});await context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'&&['3215','56151'].includes(u.port)?route.continue():route.abort();});const page=await context.newPage();page.on('pageerror',()=>consoleErrors.push({type:'pageerror',details:'omitidos'}));page.on('console',m=>{if(m.type()==='error')consoleErrors.push({type:'console.error',category:m.text().startsWith('Failed to load resource')?'HTTP negative':'other omitted'});});page.on('response',r=>{const u=new URL(r.url());if(u.origin===origin&&(u.pathname.startsWith('/api/')||r.request().isNavigationRequest()))routes.push({method:r.request().method(),path:u.pathname,status:r.status()});});return {context,page};}
test('A07/B07: rota real nega visitante, proprietário, terceiro e papéis forjados',async({browser})=>{
 const {id}=await approved(),request=publishCommand();
 for(const f of fixtures.slice(0,2))expect((await publish(f.page,id,request)).status).toBe(403);
 expect((await publish(fixtures[0].page,id,{...request,papel:'administrador'})).status).toBe(400);
 const v=await visitor(browser);try{await v.page.goto('/login');expect((await publish(v.page,id,request)).status).toBe(401);expect((await v.page.request.get('/api/public/atividades/'+id)).status()).toBe(404);expect((await v.page.goto('/atividade/'+id)).status()).toBe(404);}finally{await v.context.close();}
 expect((await db.query('select versao_publicada from public.atividades where id=$1',[id])).rows[0].versao_publicada).toBeNull();
});
test('A07/B07: organização pendente não publica; editor bloqueado perde acesso sem trocar JWT',async()=>{
 const {id}=await approved(1),editor=fixtures[2];await editor.page.goto('/dashboard/atividade/'+id);await editor.page.getByRole('button',{name:'Publicar versão aprovada',exact:true}).click();await expect(editor.page.locator('section[aria-label="Publicação"] [role=alert]')).toContainText('Organização não está validada');
 await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1",[editor.id]);try{expect((await publish(editor.page,id,publishCommand())).status).toBe(403);}finally{await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1",[editor.id]);}
});
test('B07: autorizações revogadas, expiradas e incompatíveis bloqueiam inclusive com alternativa válida',async()=>{
 for(const patch of [{situacao:'revogada',revogada_em:new Date()},{validade_ate:new Date(0)},{escopo_autorizado:['divulgacao','atividade:versao:2']},{objeto_id:randomUUID()}]){
  const {id,auth}=await approved();const columns=Object.keys(patch);await db.query('update public.autorizacoes_publicacao set '+columns.map((c,i)=>c+'=$'+(i+2)).join(',')+' where id=$1',[auth,...Object.values(patch)]);await authorization(id);expect((await publish(fixtures[2].page,id,publishCommand())).status).toBe(422);
 }
});
test('B07: publicação explícita pela interface mostra somente o snapshot autorizado ao visitante',async({browser})=>{
 const {id,auth}=await approved(),editor=fixtures[2];await editor.page.goto('/admin/atividades');await editor.page.getByRole('link',{name:/Publicação Fictícia E2E/}).filter({hasText:(await db.query('select titulo from public.atividades where id=$1',[id])).rows[0].titulo}).click();
 await expect(editor.page.getByText('Aprovada — continua privada',{exact:true})).toBeVisible();await editor.page.getByRole('button',{name:'Publicar versão aprovada',exact:true}).click();await expect(editor.page.getByText('Publicada',{exact:true})).toBeVisible();await expect(editor.page.getByRole('button',{name:'Publicar versão aprovada',exact:true})).toHaveCount(0);
 const snapshot=(await db.query('select versao_publicada,apoios_abertos from public.atividades where id=$1',[id])).rows[0];expect(snapshot.apoios_abertos).toBe(false);
 const v=await visitor(browser);try{
  const r=await v.page.goto('/atividade/'+id);expect(r.status()).toBe(200);await expect(v.page.getByRole('heading',{name:snapshot.versao_publicada.titulo,exact:true})).toBeVisible();await expect(v.page.getByText('Por '+snapshot.versao_publicada.organizacao.nome_publico,{exact:true})).toBeVisible();await v.page.reload();await expect(v.page.getByRole('heading',{name:snapshot.versao_publicada.titulo,exact:true})).toBeVisible();
  const api=await v.page.request.get('/api/public/atividades/'+id);expect(api.status()).toBe(200);expect(api.headers()['cache-control']).toContain('no-store');expect((await api.json()).atividade).toEqual(snapshot.versao_publicada);
  const html=await v.page.content();for(const privateValue of [auth,'Comprovação fictícia exclusiva E2E',fixtures[0].email,fixtures[2].id])expect(html.includes(privateValue)).toBe(false);expect(html).not.toMatch(/comprovante_restrito|auth_user_id|justificativa_restrita|SUPABASE_SECRET_KEY|APOIO_HMAC_SECRET/);
  expect((await v.page.request.get('/api/atividades/'+id)).status()).toBe(401);await v.page.goto('/atividades');await v.page.getByRole('link',{name:snapshot.versao_publicada.titulo,exact:true}).click();await expect(v.page).toHaveURL(origin+'/atividade/'+id);expect((await fixtures[1].page.request.get('/api/atividades/'+id)).status()).toBe(404);
 }finally{await v.context.close();}
});
test('B07: API concorrente é idempotente; outra chave, autor ou versão não republica',async()=>{
 const {id}=await approved(),editor=fixtures[2].page,request=publishCommand();const result=await Promise.all(Array.from({length:6},()=>publish(editor,id,request)));expect(result.every(r=>r.status===200&&r.cache.includes('no-store'))).toBe(true);expect(result.filter(r=>!r.body.atividade.repetida)).toHaveLength(1);
 expect((await publish(editor,id,{...request,pedido_id:randomUUID()})).status).toBe(409);expect((await publish(fixtures[3].page,id,request)).status).toBe(409);expect((await publish(editor,id,{...request,versao_esperada:2})).status).toBe(409);
 expect(Number((await db.query("select count(*) n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_publicada'",[id])).rows[0].n)).toBe(1);
});
test('B07: retry revalida autorização original e a consulta pública deixa de expor a atividade',async({browser})=>{
 const {id,auth}=await approved(),request=publishCommand();expect((await publish(fixtures[2].page,id,request)).status).toBe(200);await db.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=now() where id=$1",[auth]);await authorization(id);expect((await publish(fixtures[2].page,id,request)).status).toBe(422);
 const v=await visitor(browser);try{expect((await v.page.goto('/atividade/'+id)).status()).toBe(404);const r=await v.page.request.get('/api/public/atividades');expect((await r.json()).atividades.some(a=>a.id===id)).toBe(false);}finally{await v.context.close();}
});
test('B07: snapshot permanece a fonte pública; edição é privada (B08)',async({browser})=>{
 const {id}=await approved(),request=publishCommand();expect((await publish(fixtures[3].page,id,request)).status).toBe(200);const snapshot=(await db.query('select versao_publicada from public.atividades where id=$1',[id])).rows[0].versao_publicada;
 await db.query("update public.atividades set titulo='Título privado divergente fictício',descricao='Descrição privada divergente fictícia',versao_publicada=versao_publicada||'{\"comprovante_restrito\":\"SEGREDO_FICTICIO_E2E\"}'::jsonb where id=$1",[id]);
 const v=await visitor(browser);try{await v.page.goto('/atividade/'+id);await expect(v.page.getByRole('heading',{name:snapshot.titulo,exact:true})).toBeVisible();expect((await v.page.content())).not.toMatch(/Título privado divergente|Descrição privada divergente|SEGREDO_FICTICIO_E2E/);expect((await (await v.page.request.get('/api/public/atividades/'+id)).json()).atividade).toEqual(snapshot);}finally{await v.context.close();}
 await fixtures[0].page.goto('/dashboard/atividade/'+id);await expect(fixtures[0].page.getByText('Publicada',{exact:true})).toBeVisible();await expect(fixtures[0].page.getByRole('form',{name:'Editar atividade publicada'})).toBeVisible();await expect(fixtures[0].page.getByRole('button',{name:'Enviar atividade',exact:true})).toHaveCount(0);
});
test('B07: versão divergente ou conteúdo alterado após aprovação não gera snapshot',async()=>{
 const {id}=await approved();expect((await publish(fixtures[2].page,id,{...publishCommand(),versao_esperada:2})).status).toBe(409);await db.query("update public.atividades set descricao='Conteúdo fictício divergente da versão aprovada.' where id=$1",[id]);expect((await publish(fixtures[2].page,id,publishCommand())).status).toBe(409);expect((await db.query('select versao_publicada from public.atividades where id=$1',[id])).rows[0].versao_publicada).toBeNull();
});
