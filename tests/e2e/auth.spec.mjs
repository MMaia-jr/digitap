import { test,expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

test.describe.configure({mode:'serial'});
let db,admin,local,a,b;const fixtures=[];const observations=[];const consoles=[];const requests=[];
const origin='http://127.0.0.1:3215';
function note(id,layer,description){observations.push({id,layer,description,status:'PASS'});}
async function post(page,path,body){
  return page.evaluate(async({path,body})=>{
    const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};
  },{path,body});
}
async function login(f,password=f.password){
  await f.page.goto('/login');await f.page.getByLabel('E-mail',{exact:true}).fill(f.email);
  await f.page.getByLabel('Senha',{exact:true}).fill(password);
  await f.page.getByRole('button',{name:'Entrar',exact:true}).click();
}
async function mail(f,type){
  for(let i=0;i<30;i++){
    const list=await (await fetch('http://127.0.0.1:56154/api/v1/search?query='+encodeURIComponent('to:'+f.email))).json();
    for(const m of list.messages??[]){
      const detail=await (await fetch('http://127.0.0.1:56154/api/v1/message/'+encodeURIComponent(m.ID))).json();
      const text=String(detail.HTML??detail.Text??'').replaceAll('&amp;','&');
      const match=text.match(/http:\/\/127\.0\.0\.1:3215\/auth\/confirm\?[^"<>\s]+/);
      if(match){const url=new URL(match[0]);if(url.searchParams.get('type')===type&&!f.used.has(url.href)){f.used.add(url.href);return url.href;}}
    }
    await new Promise(r=>setTimeout(r,300));
  }
  throw new Error('E-mail fictício não recebido no Mailpit local.');
}
async function fixture(browser){
  const tag=randomUUID();const f={email:`e2e-${tag}@example.invalid`,password:randomUUID()+'aA1!',name:'Organização Fictícia '+tag,used:new Set()};
  f.context=await browser.newContext({baseURL:origin});
  // Refuse any browser request outside this project's loopback endpoints.
  await f.context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='127.0.0.1'&&['3215','56151','56154'].includes(u.port))return route.continue();
    return route.abort();
  });
  f.page=await f.context.newPage();
  f.page.on('response',r=>{const u=new URL(r.url());if(u.origin===origin&&(u.pathname.startsWith('/api/')||r.request().isNavigationRequest()))requests.push({method:r.request().method(),path:u.pathname,status:r.status()});});
  f.page.on('pageerror',()=>consoles.push({kind:'pageerror',message:'Erro JS: detalhes omitidos'}));
  f.page.on('console',m=>{if(m.type()==='error')consoles.push({kind:'console.error',message:m.text().startsWith('Failed to load resource')?'HTTP não-2xx no browser (inclui negativas esperadas)':'Detalhes omitidos'});});
  fixtures.push(f);return f;
}
async function signup(f){
  await f.page.goto('/cadastro');await f.page.getByLabel('E-mail',{exact:true}).fill(f.email);
  await f.page.getByLabel('Senha',{exact:true}).fill(f.password);
  await f.page.getByRole('button',{name:'Criar acesso',exact:true}).click();
  await expect(f.page.getByRole('status')).toContainText('Se o cadastro puder ser concluído');
  const q=await db.query('select id,email_confirmed_at from auth.users where email=$1',[f.email]);
  expect(q.rowCount).toBe(1);f.id=q.rows[0].id;expect(q.rows[0].email_confirmed_at).toBeNull();
  return await mail(f,'signup');
}
async function confirm(f,url){await f.page.goto(url);await f.page.getByRole('button',{name:'Confirmar meu e-mail'}).click();await expect(f.page).toHaveURL(origin+'/dashboard/organizacao');}
async function link(f){
  await f.page.getByLabel('Nome público da organização').fill(f.name);
  await f.page.getByRole('button',{name:'Vincular organização'}).click();
  await expect(f.page).toHaveURL(origin+'/dashboard');await expect(f.page.getByRole('heading',{name:f.name,exact:true})).toBeVisible();
  f.org=(await db.query('select organizacao_id from public.contas_acesso where auth_user_id=$1',[f.id])).rows[0].organizacao_id;
}
test.beforeAll(async()=>{
  local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
  db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
});
test.afterAll(async()=>{
  for(const f of fixtures){
    await f.context.close();
    if(!f.id)f.id=(await db.query('select id from auth.users where email=$1',[f.email])).rows[0]?.id;
    if(f.id){
      // Somente fixtures desta execução; respeitar as FKs aditivas do COMPAT.
      await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[f.id]);
      await db.query('delete from public.sujeitos_publicadores where organizacao_legada_id in (select organizacao_id from public.contas_acesso where auth_user_id=$1)',[f.id]);
      const linked=await db.query('delete from public.contas_acesso where auth_user_id=$1 returning organizacao_id',[f.id]);
      for(const row of linked.rows)await db.query('delete from public.organizacoes where id=$1',[row.organizacao_id]);
      const removed=await admin.auth.admin.deleteUser(f.id);if(removed.error)throw new Error('Limpeza da fixture Auth falhou.');
    }
  }
  const out=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/incremento-2c';
  if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out))throw new Error('Diretório inválido.');
  await db?.end();mkdirSync(out,{recursive:true});
  writeFileSync(out+'/auth-observations.json',JSON.stringify({observations,consoles,requests,cleanup:'Contas e organizações fictícias desta execução removidas; mensagens locais podem permanecer.'},null,2)+'\n');
});

test('A01: cadastro, confirmação, vínculo pendente e sessão SSR',async({browser})=>{
  a=await fixture(browser);const url=await signup(a);
  await a.page.goto('/dashboard');await expect(a.page).toHaveURL(origin+'/login');
  await confirm(a,url);
  // Failure between Auth and onboarding is recoverable after a fresh login.
  await a.page.getByRole('button',{name:'Sair',exact:true}).click();await expect(a.page).toHaveURL(origin+'/login');
  await login(a);await expect(a.page).toHaveURL(origin+'/dashboard/organizacao');
  await link(a);
  const state=await db.query('select c.papel,c.situacao,o.estado_validacao from public.contas_acesso c join public.organizacoes o on o.id=c.organizacao_id where c.auth_user_id=$1',[a.id]);
  expect(state.rows).toEqual([{papel:'organizacao',situacao:'ativa',estado_validacao:'pendente'}]);
  await a.page.reload();await expect(a.page.getByRole('heading',{name:a.name,exact:true})).toBeVisible();
  await a.page.goto('/');await a.page.goto('/dashboard');await expect(a.page.getByRole('heading',{name:a.name,exact:true})).toBeVisible();
  expect((await a.page.locator('body').innerText()).includes(a.email)).toBe(false);
  const cookies=await a.context.cookies();expect(cookies.some(c=>c.name.startsWith('ap-auth')&&c.httpOnly&&c.sameSite==='Lax')).toBe(true);
  expect((await a.page.evaluate(()=>document.cookie)).includes('ap-auth')).toBe(false);
  const response=await a.page.request.get('/dashboard');expect(response.headers()['cache-control']).toContain('no-store');
  await a.page.goto(url);await a.page.getByRole('button',{name:'Confirmar meu e-mail'}).click();
  await expect(a.page.locator('form [role=alert]')).toContainText('Link inválido ou expirado');
  await login(a);await expect(a.page).toHaveURL(origin+'/dashboard');
  note('A01','UI+Next API+Auth+Mailpit+SQL','Cadastro e confirmação reais; retomada de Auth sem vínculo; organização pendente; cookies HttpOnly; SSR em navegação/reload; e-mail não exibido no dashboard.');
});
test('A02: validação e cadastro duplicado sem enumeração',async()=>{
  const invalid=await post(a.page,'/api/auth/cadastro',{email:'invalido',password:a.password});expect(invalid.status).toBe(422);
  const duplicate=await post(a.page,'/api/auth/cadastro',{email:a.email,password:a.password});expect(duplicate.status).toBe(200);expect(duplicate.body.message).toContain('Se o cadastro puder ser concluído');
  expect((await db.query('select count(*)::int n from auth.users where email=$1',[a.email])).rows[0].n).toBe(1);
  note('A02','Next API+SQL','Payload inválido negado; duplicata usa resposta genérica e não duplica usuário.');
});
test('A03: login incorreto negado e login válido restaura SSR',async()=>{
  await a.page.getByRole('button',{name:'Sair',exact:true}).click();await expect(a.page).toHaveURL(origin+'/login');
  await login(a,'SenhaFicticiaErrada123!');await expect(a.page.locator('form [role=alert]')).toContainText('Não foi possível entrar');
  await a.page.goto('/dashboard');await expect(a.page).toHaveURL(origin+'/login');
  await login(a);await expect(a.page).toHaveURL(origin+'/dashboard');
  note('A03','UI+Next API+Auth+SSR','Senha incorreta não libera dashboard; login válido estabelece sessão.');
});
test('A04: recuperação, token expirado e replay negados',async()=>{
  await a.page.goto('/recuperar-acesso');await a.page.getByLabel('E-mail',{exact:true}).fill(a.email);
  await a.page.getByRole('button',{name:'Enviar link de recuperação'}).click();await expect(a.page.getByRole('status')).toContainText('Se houver uma conta elegível');
  const url=await mail(a,'recovery');const previousPassword=a.password;a.password=randomUUID()+'aA2!';
  await a.page.goto(url);await a.page.getByLabel('Nova senha',{exact:true}).fill(a.password);await a.page.getByRole('button',{name:'Atualizar senha'}).click();
  await expect(a.page).toHaveURL(origin+'/login?status=senha-atualizada');
  await a.page.goto(url);await a.page.getByLabel('Nova senha',{exact:true}).fill(randomUUID()+'aA3!');await a.page.getByRole('button',{name:'Atualizar senha'}).click();await expect(a.page.locator('form [role=alert]')).toContainText('Link inválido ou expirado');
  await login(a,previousPassword);await expect(a.page.locator('form [role=alert]')).toContainText('Não foi possível entrar');
  await login(a);await expect(a.page).toHaveURL(origin+'/dashboard');
  // Use a second fixture for expiry without waiting hours or modifying global Auth config.
  // The genuine issued token is expired by backdating only its user's sent_at fixture.
  note('A04','UI+Next API+Mailpit+Auth','Recuperação real, mudança de senha e token consumido negado. Expiração será exercitada em A08 com fixture temporal controlada.');
});
test('A05: duas organizações isoladas e vínculo concorrente idempotente',async({browser})=>{
  b=await fixture(browser);await confirm(b,await signup(b));
  const results=await Promise.all(Array.from({length:6},()=>post(b.page,'/api/organizacoes',{nome_publico:b.name})));
  expect(results.map(r=>r.status)).toEqual([200,200,200,200,200,200]);
  await b.page.goto('/dashboard');await expect(b.page.getByRole('heading',{name:b.name,exact:true})).toBeVisible();
  b.org=(await db.query('select organizacao_id from public.contas_acesso where auth_user_id=$1',[b.id])).rows[0].organizacao_id;
  expect(b.org===a.org).toBe(false);
  expect((await db.query('select count(*)::int n from public.organizacoes where nome_publico=$1',[b.name])).rows[0].n).toBe(1);
  await a.page.goto('/dashboard?organizacao_id='+b.org);await expect(a.page.getByRole('heading',{name:a.name,exact:true})).toBeVisible();
  expect((await a.page.locator('body').innerText()).includes(b.name)).toBe(false);
  const attack=await post(a.page,'/api/organizacoes',{nome_publico:'Tentativa fictícia',organizacao_id:b.org});expect(attack.status).toBe(400);
  const repeat=await post(b.page,'/api/organizacoes',{nome_publico:'Alteração que não deve ocorrer'});expect(repeat.status).toBe(200);
  expect((await db.query('select nome_publico from public.organizacoes where id=$1',[b.org])).rows[0].nome_publico).toBe(b.name);
  note('A05','Browser contexts+Next API+SQL','Duas sessões distintas; query string não troca tenant; payload alheio negado; 6 vínculos concorrentes e retry preservam uma organização.');
});
test('A06: cliente não promove papel',async()=>{
  for(const path of ['/api/organizacoes','/api/auth/cadastro']){
    const body=path.includes('cadastro')?{email:a.email,password:a.password,papel:'administrador'}:{nome_publico:a.name,papel:'administrador'};
    expect((await post(a.page,path,body)).status).toBe(400);
  }
  expect((await db.query('select papel from public.contas_acesso where auth_user_id=$1',[a.id])).rows[0].papel).toBe('organizacao');
  note('A06','Next API+SQL','Payload privilegiado negado em cadastro e vínculo; papel permanece organizacao.');
});
test('A07: organização pendente não publica nem acessa administração',async()=>{
  const status=await db.query('select estado_validacao from public.organizacoes where id=$1',[a.org]);expect(status.rows[0].estado_validacao).toBe('pendente');
  await a.page.goto('/dashboard');await expect(a.page.getByText('Pendente de revisão',{exact:true})).toBeVisible();
  const invalid=await a.page.request.post('/api/atividades',{headers:{origin},data:{organizacao_id:b.org}});expect(invalid.status()).toBe(400);
  const publish=await a.page.request.post('/api/admin/atividades/'+randomUUID()+'/publicar',{headers:{origin},data:{versao_esperada:1,pedido_id:randomUUID()}});expect(publish.status()).toBe(403);
  await a.page.goto('/admin');expect((await a.page.locator('body').innerText()).includes(a.name)).toBe(false);
  note('A07','UI+Next HTTP+SQL','Rota real de publicação com payload válido nega organização por papel (403); organização segue pendente. Prova complementar em publication.spec.mjs usa atividade real aprovada e testa organização pendente sob editor.');
});
test('A08: suspensão, bloqueio, logout, sessão inválida e expiração controlada',async()=>{
  await db.query("update public.organizacoes set estado_validacao='suspensa' where id=$1",[b.org]);
  await b.page.goto('/dashboard');await expect(b.page.getByRole('heading',{name:'Acesso indisponível',exact:true})).toBeVisible();
  await db.query("update public.organizacoes set estado_validacao='pendente' where id=$1",[b.org]);
  await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1",[b.id]);
  await b.page.reload();await expect(b.page.getByRole('heading',{name:'Acesso indisponível',exact:true})).toBeVisible();
  expect((await post(b.page,'/api/organizacoes',{nome_publico:b.name})).status).toBe(403);
  await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1",[b.id]);
  await b.page.goto('/dashboard');await b.page.getByRole('button',{name:'Sair',exact:true}).click();await expect(b.page).toHaveURL(origin+'/login');
  await b.page.goto('/dashboard');await expect(b.page).toHaveURL(origin+'/login');
  await b.context.addCookies([{name:'ap-auth',value:'base64-invalido',domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
  await b.page.goto('/dashboard');await expect(b.page).toHaveURL(origin+'/login');await b.context.clearCookies();
  await login(b);await expect(b.page).toHaveURL(origin+'/dashboard');
  // Expire the real server session for this fictitious user, then force a refresh
  // by expiring only the browser's cached session timestamp (no forged JWT).
  const changed=await db.query('update auth.sessions set not_after=now()-interval \'1 day\' where user_id=$1 returning id',[b.id]);expect(changed.rowCount>0).toBe(true);
  const authCookies=(await b.context.cookies()).filter(c=>c.name==='ap-auth'||/^ap-auth\.\d+$/.test(c.name)).sort((x,y)=>x.name.localeCompare(y.name));
  const encoded=authCookies.map(c=>c.value).join('');expect(encoded.startsWith('base64-')).toBe(true);
  const session=JSON.parse(Buffer.from(encoded.slice(7),'base64url').toString());session.expires_at=1;session.expires_in=0;
  await b.context.clearCookies();await b.context.addCookies([{name:'ap-auth',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
  await b.page.goto('/dashboard');await expect(b.page).toHaveURL(origin+'/login');
  await b.context.clearCookies();await b.page.goto('/recuperar-acesso');await b.page.getByLabel('E-mail',{exact:true}).fill(b.email);await b.page.getByRole('button',{name:'Enviar link de recuperação'}).click();await expect(b.page.getByRole('status')).toContainText('Se houver uma conta elegível');
  const expired=await mail(b,'recovery');await db.query("update auth.users set recovery_sent_at=now()-interval '30 days' where id=$1",[b.id]);
  await b.page.goto(expired);await b.page.getByLabel('Nova senha',{exact:true}).fill(randomUUID()+'aA4!');await b.page.getByRole('button',{name:'Atualizar senha'}).click();await expect(b.page.locator('form [role=alert]')).toContainText('Link inválido ou expirado');
  note('A08','UI+Next API+SQL fixture+Auth','Suspensão/bloqueio negados, logout e cookie inválido sem acesso. Expiração real de sessão/token via timestamps da fixture: não simula SDK nem altera relógio/config global; não é espera de tempo natural.');
});
test('A09: visitante não acessa área restrita/editorial',async({browser})=>{
  const visitor=await fixture(browser);await visitor.page.goto('/dashboard');await expect(visitor.page).toHaveURL(origin+'/login');
  expect((await post(visitor.page,'/api/organizacoes',{nome_publico:'Visitante fictício'})).status).toBe(401);
  const admin=await visitor.page.goto('/admin');expect(admin.status()).toBe(404);
  note('A09','UI+Next API','Visitante redirecionado; vínculo exige autenticação; editorial ausente responde 404.');
});
