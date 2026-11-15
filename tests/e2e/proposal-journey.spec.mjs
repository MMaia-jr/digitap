import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';

const origin='http://127.0.0.1:3215',endpoint='/api/propostas/interpretar';
const out=process.env.A_PRACA_EVIDENCE_DIR;
const fixtures=[];let db,admin;
const proposal=marker=>`${marker} — Pessoa fictícia propõe uma oficina no projeto comunitário. Pode ensinar. Relação proposta: colaboração. Fonte: relato. Data pendente.`;
const calls=()=>existsSync(out+'/gateway-mock.jsonl')?readFileSync(out+'/gateway-mock.jsonl','utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)):[];
test.describe.configure({mode:'serial'});
test.beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1'||process.env.DIGITAP_E1_GATEWAY_MOCK!=='1'||!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out??''))throw new Error('E1 exige fixtures e mock externo locais autorizados.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
 db=new Client(local.DB_URL);await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
});
test.afterAll(async()=>{
 let failure=false;
 try{
  for(const f of fixtures){
   await f.context?.close();
   const row=(await db.query('select id from auth.users where email=$1',[f.email])).rows[0];if(!row)continue;
   await db.query('begin');
   try{
    // Only the identities generated in this execution, using existing FK order.
    await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[row.id]);
    await db.query('delete from public.pessoas_fisicas where conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[row.id]);
    await db.query('delete from public.sujeitos_publicadores where criado_por_conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[row.id]);
    await db.query('delete from public.contas_acesso where auth_user_id=$1',[row.id]);await db.query('commit');
   }catch{await db.query('rollback');failure=true;continue;}
   if((await admin.auth.admin.deleteUser(row.id)).error)failure=true;
  }
  const remaining=(await db.query('select count(*)::int n from auth.users where email=any($1::text[])',[fixtures.map(f=>f.email)])).rows[0].n;
  writeFileSync(out+'/e1-cleanup.json',JSON.stringify({generated_accounts:fixtures.length,remaining_auth:remaining,cleanup_failed:failure})+'\n');
  if(failure||remaining!==0)throw new Error('Limpeza das fixtures E1 incompleta.');
 }finally{await db?.end();}
});
async function mail(f){
 for(let i=0;i<30;i++){
  const list=await(await fetch('http://127.0.0.1:56154/api/v1/search?query='+encodeURIComponent('to:'+f.email))).json();
  for(const m of list.messages??[]){
   const detail=await(await fetch('http://127.0.0.1:56154/api/v1/message/'+encodeURIComponent(m.ID))).json();
   const text=String(detail.HTML??detail.Text??'').replaceAll('&amp;','&');const match=text.match(/http:\/\/127\.0\.0\.1:3215\/auth\/confirm\?[^"<>\s]+/);
   if(match&&new URL(match[0]).searchParams.get('type')==='signup')return match[0];
  }
  await new Promise(resolve=>setTimeout(resolve,300));
 }
 throw new Error('Confirmação fictícia não recebida no e-mail local.');
}
async function login(f){
 await f.page.goto('/login');await f.page.getByLabel('E-mail',{exact:true}).fill(f.email);await f.page.getByLabel('Senha',{exact:true}).fill(f.password);await f.page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(f.page).toHaveURL(origin+'/');
}
async function profileCount(f){return (await db.query(`select
 (select count(*)::int from public.contas_acesso where auth_user_id=$1) contas,
 (select count(*)::int from public.pessoas_fisicas p join public.contas_acesso c on c.id=p.conta_id where c.auth_user_id=$1) pessoas,
 (select count(*)::int from public.vinculos_publicadores v join public.contas_acesso c on c.id=v.conta_id where c.auth_user_id=$1 and v.atual and v.situacao='ativo' and v.papel_vinculo='titular') titulares`,[f.id])).rows[0];}
async function snapshot(){
 // Aggregates only: do not read preexisting account content.
 const names=['contas_acesso','pessoas_fisicas','sujeitos_publicadores','vinculos_publicadores','projetos','atividades','registros_realizacao','evidencias','eventos_editoriais'];const result={};
 for(const name of names)result[name]=(await db.query('select count(*)::int n from public.'+name)).rows[0].n;
 return result;
}
async function post(f,text,extra={}){return f.page.request.post(endpoint,{headers:{origin},data:{texto:text,...extra}});}
async function newPerson(browser,marker){
 const f={email:`e1-${randomUUID()}@example.invalid`,password:randomUUID()+'aA1!',name:'Pessoa Fictícia E1 '+randomUUID(),marker};fixtures.push(f);
 f.context=await browser.newContext({baseURL:origin});
 await f.context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'&&['3215','56151','56154'].includes(u.port)?route.continue():route.abort();});
 f.page=await f.context.newPage();
 await f.page.goto('/cadastro');await f.page.getByLabel('E-mail',{exact:true}).fill(f.email);await f.page.getByLabel('Senha',{exact:true}).fill(f.password);await f.page.getByRole('button',{name:'Criar acesso como pessoa física',exact:true}).click();await expect(f.page.getByRole('status')).toContainText('Se o cadastro puder ser concluído');
 const user=(await db.query('select id,email_confirmed_at from auth.users where email=$1',[f.email])).rows;expect(user).toHaveLength(1);f.id=user[0].id;expect(user[0].email_confirmed_at).toBeNull();expect(await profileCount(f)).toEqual({contas:0,pessoas:0,titulares:0});
 const before=calls().length;
 const deniedLogin=await f.page.request.post('/api/auth/login',{headers:{origin},data:{email:f.email,password:f.password}});expect(deniedLogin.status()).toBe(401);
 expect((await post(f,proposal(marker))).status()).toBe(401);expect(calls()).toHaveLength(before);
 await f.page.goto(await mail(f));await f.page.getByRole('button',{name:'Confirmar meu e-mail',exact:true}).click();await expect(f.page).toHaveURL(origin+'/login');
 await login(f);await f.page.getByRole('banner').getByRole('link',{name:'Meu espaço',exact:true}).click();await expect(f.page).toHaveURL(origin+'/meu-espaco');
 await f.page.getByRole('link',{name:'Continuar como pessoa física',exact:true}).click();await f.page.getByLabel('Nome público',{exact:true}).fill(f.name);await f.page.getByRole('button',{name:'Concluir cadastro',exact:true}).click();await expect(f.page).toHaveURL(origin+'/dashboard/pessoa-fisica');await f.page.reload();
 expect(await profileCount(f)).toEqual({contas:1,pessoas:1,titulares:1});
 await f.page.getByRole('banner').getByRole('link',{name:'Descreva sua ideia',exact:true}).click();await expect(f.page).toHaveURL(origin+'/meu-espaco/ideia');
 const baseline=await snapshot();await f.page.getByLabel('Sua proposta').fill(proposal(marker));await f.page.getByRole('button',{name:'Interpretar proposta',exact:true}).click();await expect(f.page.getByRole('heading',{name:'Prévia para revisão humana',exact:true})).toBeVisible();
 for(const label of ['Possíveis sujeitos','Possíveis projetos','Atividades propostas','Capacidades declaradas','Relações alegadas','Fontes citadas','Informações não verificadas'])await expect(f.page.getByRole('heading',{name:label,exact:true})).toBeVisible();
 await expect(f.page.getByText('Oficina '+marker,{exact:true})).toBeVisible();await expect(f.page.getByText(/^Interpretação não verificada\./)).toBeVisible();expect(await snapshot()).toEqual(baseline);
 expect(calls().length).toBe(before+1);
 await f.page.getByRole('banner').getByRole('button',{name:'Sair',exact:true}).click();await expect(f.page).toHaveURL(origin+'/login');
 expect((await post(f,proposal(marker))).status()).toBe(401);await login(f);
 const cookies=await f.context.cookies();expect(cookies.some(c=>c.name.startsWith('ap-auth')&&c.httpOnly&&c.sameSite==='Lax')).toBe(true);expect(await f.page.evaluate(()=>document.cookie.includes('ap-auth'))).toBe(false);
 await f.page.getByRole('banner').getByRole('link',{name:'Meu espaço',exact:true}).click();await expect(f.page).toHaveURL(origin+'/dashboard/pessoa-fisica');
 const retry=await f.page.request.post('/api/auth/completar-pf',{headers:{origin},data:{nome_publico:f.name}});expect(retry.status()).toBe(200);expect(await profileCount(f)).toEqual({contas:1,pessoas:1,titulares:1});
 return f;
}
test('E1-01: primeira identidade, confirmação, Praça, perfil, HTTP real, prévia e reentrada',async({browser})=>{test.setTimeout(180000);await newPerson(browser,'IDEIA-UM');});
test('E1-02: segunda identidade repete percurso e não recebe proposta privada da primeira',async({browser})=>{
 test.setTimeout(180000);const f=await newPerson(browser,'IDEIA-DOIS');await f.page.getByRole('banner').getByRole('link',{name:'Descreva sua ideia',exact:true}).click();await expect(f.page.getByText('Oficina IDEIA-UM',{exact:true})).toHaveCount(0);expect(await profileCount(fixtures[0])).toEqual({contas:1,pessoas:1,titulares:1});
});
test('E1-03: origem, payload privilegiado, bloqueio e visitante não chegam ao Gateway',async({browser})=>{
 const f=fixtures[0],before=calls().length,baseline=await snapshot();
 for(const headers of [{origin:'https://evil.invalid'},{origin:'null'},{origin,'sec-fetch-site':'cross-site'},{origin:'https://evil.invalid','x-forwarded-host':'127.0.0.1:3215'}])expect((await f.page.request.post(endpoint,{headers,data:{texto:proposal(f.marker)}})).status()).toBe(403);
 expect((await post(f,proposal(f.marker),{auth_user_id:fixtures[1].id})).status()).toBe(422);
 expect((await post(f,proposal(f.marker),{publicar:true})).status()).toBe(422);expect((await post(f,'x'.repeat(2001))).status()).toBe(422);
 await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1",[f.id]);
 try{expect((await post(f,proposal(f.marker))).status()).toBe(403);}finally{await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1",[f.id]);}
 const visitor=await browser.newContext({baseURL:origin});try{expect((await visitor.request.post(origin+endpoint,{headers:{origin},data:{texto:proposal(f.marker)}})).status()).toBe(401);}finally{await visitor.close();}
 expect(calls()).toHaveLength(before);expect(await snapshot()).toEqual(baseline);
});
test('E1-04: concorrência, quota, falha segura e nenhuma mutação pela interpretação',async()=>{
 const [a,b]=fixtures,baseline=await snapshot();const n=calls().length;
 const slow=post(a,proposal(a.marker)+' E1-LENTO');await expect.poll(()=>calls().length).toBe(n+1);expect((await post(a,proposal(a.marker))).status()).toBe(429);expect((await slow).status()).toBe(200);
 expect((await post(a,proposal(a.marker))).status()).toBe(200);expect((await post(a,proposal(a.marker))).status()).toBe(429);
 await b.page.getByRole('banner').getByRole('link',{name:'Descreva sua ideia',exact:true}).click();await b.page.getByLabel('Sua proposta').fill(proposal(b.marker)+' E1-FALHA');await b.page.getByRole('button',{name:'Interpretar proposta',exact:true}).click();await expect(b.page.getByRole('alert').filter({hasText:'Não foi possível interpretar agora'})).toContainText('Não foi possível interpretar agora');await expect(b.page.getByText('SENSITIVE_PROVIDER_MARKER',{exact:false})).toHaveCount(0);
 expect((await post(b,proposal(b.marker))).status()).toBe(200);expect((await post(b,proposal(b.marker))).status()).toBe(429);
 expect(await snapshot()).toEqual(baseline);expect(calls()).toHaveLength(6);expect(calls().every(c=>c.provider==='bedrock'&&c.mock===true)).toBe(true);
 writeFileSync(out+'/e1-observations.json',JSON.stringify({two_journeys:true,real_auth_mail_database_http:true,only_external_gateway_mocked:true,profile_uniqueness:true,logout_and_second_login:true,origin_and_permissions:true,concurrency_and_quota:true,gateway_failure_safe:true,domain_counts_unchanged_by_ai:true,mock_calls:calls().length})+'\n');
});
