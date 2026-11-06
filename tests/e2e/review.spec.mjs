import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
test.describe.configure({mode:'serial'});
const origin='http://127.0.0.1:3215',fixtures=[],ids=[],auths=[],routes=[],consoleErrors=[];let db,admin,reviewed;
const cmd=(acao='iniciar',estado_esperado='enviada',extra={})=>({acao,estado_esperado,versao_esperada:1,pedido_id:randomUUID(),...extra});
async function api(page,id,body){return page.evaluate(async({id,body})=>{const r=await fetch('/api/admin/atividades/'+id+'/revisar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};},{id,body});}
async function submitted(){
 const page=fixtures[0].page;
 const result=await page.evaluate(async()=>{
  const r=await fetch('/api/atividades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({titulo:'Revisão Fictícia E2E '+crypto.randomUUID(),descricao:'Descrição fictícia para testar revisão.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Entrada fictícia gratuita.'})});return {status:r.status,body:await r.json()};
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
  const f={email:`review-e2e-${randomUUID()}@example.invalid`,password:randomUUID()+'aA1!'};fixtures.push(f);
  const created=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true,user_metadata:{papel:'administrador'}});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');f.id=created.data.user.id;
  if(i<2){const linked=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:f.id,p_nome_publico:'Organização Fictícia Editorial '+randomUUID(),p_canal_publico:null});if(linked.error)throw new Error('Fixture organização falhou.');f.org=linked.data;}
  else await db.query('insert into public.contas_acesso(auth_user_id,papel) values($1,$2)',[f.id,i===2?'editor':'administrador']);
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
  await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))',[users]);await db.query('delete from public.sujeitos_publicadores where organizacao_legada_id=any($1::uuid[])',[orgs]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');await db.end();
 }
 const out=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/incremento-3-b05-b06';if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out))throw new Error('Diretório inválido.');mkdirSync(out,{recursive:true});writeFileSync(out+'/review-observations.json',JSON.stringify({routes,consoleErrors,cleanup:'Somente fixtures próprias desta execução removidas',role_setup:'Papel editorial explícito em SQL antes de login real pela UI; nenhum papel real/institucional criado.'},null,2)+'\n');
});
test('B05a: login editorial real, revisão privada e papéis forjados/visitantes negados',async({browser})=>{
 reviewed=await submitted();const [,other,editor]=fixtures;
 await editor.page.goto('/admin/atividades');await expect(editor.page.getByRole('heading',{name:'Revisão editorial',exact:true})).toBeVisible();
 for(const f of fixtures.slice(0,2))expect((await api(f.page,reviewed,cmd())).status).toBe(403);
 expect((await api(other.page,reviewed,{...cmd(),papel:'editor'})).status).toBe(400);
 const visitor=await browser.newContext({baseURL:origin});const page=await visitor.newPage();await page.goto('/login');expect((await api(page,reviewed,cmd())).status).toBe(401);await visitor.close();
 await editor.page.goto('/dashboard/atividade/'+reviewed);await editor.page.getByRole('button',{name:'Iniciar revisão',exact:true}).click();await expect(editor.page.getByText('Em revisão — continua privada',{exact:true})).toBeVisible();
});
test('B05b: autorização compatível permite aprovação; inválidas bloqueiam sem snapshot',async()=>{
 const editor=fixtures[2];await editor.page.getByRole('button',{name:'Aprovar versão',exact:true}).click();await expect(editor.page.locator('form [role=alert]')).toBeVisible();
 for(const patch of [{situacao:'revogada'},{validade_ate:new Date(0)},{objeto_id:randomUUID()},{escopo_autorizado:['divulgacao']},{escopo_autorizado:['divulgacao','atividade:versao:2']}]){
  const auth=await authorization(reviewed,patch);expect((await api(editor.page,reviewed,cmd('aprovar','em_revisao',{autorizacao_id:auth}))).status).toBe(422);
 }
 const auth=await authorization(reviewed);await editor.page.getByLabel('ID da autorização para esta versão',{exact:true}).fill(auth);await editor.page.getByRole('button',{name:'Aprovar versão',exact:true}).click();await expect(editor.page.getByText('Aprovada — continua privada',{exact:true})).toBeVisible();
 await editor.page.getByRole('link',{name:'Voltar à área restrita'}).click();await expect(editor.page).toHaveURL(origin+'/admin/atividades');
 const own=await fixtures[0].page.request.get('/api/atividades/'+reviewed);expect(own.status()).toBe(200);expect((await own.text()).includes(auth)).toBe(false);
});
test('B06a: devolução motivada visível ao dono; terceiro e público não recebem motivo',async({browser})=>{
 const id=await submitted(),editor=fixtures[2],motivo='Corrigir a orientação fictícia de acesso.';
 await editor.page.goto('/dashboard/atividade/'+id);await editor.page.getByRole('button',{name:'Devolver atividade'}).click();await expect(editor.page.locator('form [role=alert]')).toBeVisible();
 await editor.page.getByLabel('Motivo (devolução ou rejeição)',{exact:true}).fill(motivo);await editor.page.getByRole('button',{name:'Devolver atividade'}).click();await expect(editor.page.getByText('Devolvida — continua privada',{exact:true})).toBeVisible();
 await fixtures[0].page.goto('/dashboard/atividade/'+id);await expect(fixtures[0].page.getByRole('region',{name:'Motivo editorial'})).toContainText(motivo);
 const other=await fixtures[1].page.request.get('/api/atividades/'+id);expect(other.status()).toBe(404);expect((await other.text()).includes(motivo)).toBe(false);
 const guest=await browser.newContext({baseURL:origin});const page=await guest.newPage();const response=await page.goto('/atividade/'+id);expect(response.status()).toBe(404);expect((await page.locator('body').innerText()).includes(motivo)).toBe(false);await guest.close();
});
test('B06b: rejeição concorrente, idempotência e conflitos preservam o motivo inicial',async()=>{
 const id=await submitted(),editor=fixtures[2],motivo='Conteúdo fictício sem informação suficiente.',request=cmd('rejeitar','enviada',{motivo});
 const results=await Promise.all(Array.from({length:5},()=>api(editor.page,id,request)));expect(results.every(r=>r.status===200&&r.cache.includes('no-store'))).toBe(true);
 expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and estado_novo='rejeitada'",[id])).rows[0].n).toBe(1);
 expect((await api(editor.page,id,{...request,motivo:'Outro motivo fictício.'})).status).toBe(409);expect((await api(editor.page,id,{...request,pedido_id:randomUUID(),versao_esperada:2})).status).toBe(409);
 await fixtures[0].page.goto('/dashboard/atividade/'+id);await expect(fixtures[0].page.getByText('Rejeitada — continua privada',{exact:true})).toBeVisible();await expect(fixtures[0].page.getByRole('region',{name:'Motivo editorial'})).toContainText(motivo);
});
test('B05c: editor bloqueado perde acesso com sessão existente; admin ativo revisa',async()=>{
 const id=await submitted(),editor=fixtures[2];await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1",[editor.id]);
 try{expect((await api(editor.page,id,cmd())).status).toBe(403);await editor.page.goto('/admin/atividades');await expect(editor.page.getByRole('heading',{name:'Acesso editorial indisponível'})).toBeVisible();}finally{await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1",[editor.id]);}
 const administrator=fixtures[3];await administrator.page.goto('/dashboard/atividade/'+id);await administrator.page.getByRole('button',{name:'Iniciar revisão'}).click();await expect(administrator.page.getByText('Em revisão — continua privada',{exact:true})).toBeVisible();
});
test('B05/B06: todas as decisões continuam privadas e sem apoio/snapshot',async({browser})=>{
 const rows=(await db.query('select estado_editorial,versao_publicada,numero_versao_publicada,publicada_em,apoios_abertos from public.atividades where id=any($1::uuid[])',[ids])).rows;
 expect(rows.length).toBe(4);expect(rows.every(r=>r.versao_publicada===null&&r.numero_versao_publicada===null&&r.publicada_em===null&&!r.apoios_abertos)).toBe(true);
 const guest=await browser.newContext({baseURL:origin});const page=await guest.newPage();for(const id of ids){expect((await page.request.get('/api/atividades/'+id)).status()).toBe(401);expect((await page.goto('/atividade/'+id)).status()).toBe(404);}
 await page.goto('/');expect((await page.locator('body').innerText()).includes('Revisão Fictícia E2E')).toBe(false);await guest.close();
});
