import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
const out='operations/evidence/isolamento-20261104T121252Z';
const network=JSON.parse(await readFile(out+'/network.json','utf8'));
if(network.status!=='LOCAL_EFFECTIVE_LOOPBACK_CONFIRMED')throw new Error('Isolamento não confirmado.');
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(local.API_URL!=='http://127.0.0.1:56151'||(local.MAILPIT_URL??local.INBUCKET_URL)!=='http://127.0.0.1:56154'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const userClient=createClient(local.API_URL,local.PUBLISHABLE_KEY,options);
const admin=createClient(local.API_URL,local.SECRET_KEY,options);
const db=new Client({connectionString:local.DB_URL});await db.connect();
const fixture=randomUUID();const email=`auth-real-${fixture}@example.invalid`;
const password=randomUUID()+'aA1!';const newPassword=randomUUID()+'aA2!';
const checks=[];let userId;let failure;let cleanup='NOT NEEDED';
class CheckFailure extends Error {}
function ok(value,name){if(!value)throw new CheckFailure(name);checks.push({name,status:'PASS'});}
async function emailToken(kind){
 for(let attempt=0;attempt<12;attempt++){
  const response=await fetch('http://127.0.0.1:56154/api/v1/search?query='+encodeURIComponent('to:'+email),{signal:AbortSignal.timeout(3000)});
  if(!response.ok)throw new CheckFailure('Busca local do e-mail de teste');
  const messages=(await response.json()).messages??[];
  for(const item of messages){
   const detail=await (await fetch('http://127.0.0.1:56154/api/v1/message/'+encodeURIComponent(item.ID),{signal:AbortSignal.timeout(3000)})).json();
   const html=String(detail.HTML??detail.Text??'').replaceAll('&amp;','&');
   if(!html.includes('type='+kind))continue;
   const token=html.match(/token_hash=([A-Za-z0-9_-]{20,512})/);
   if(token&&html.includes('http://127.0.0.1:3215/auth/confirm?'))return token[1];
  }
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 throw new CheckFailure('Recebimento local de e-mail '+kind+' com template correto');
}
try{
 const signup=await userClient.auth.signUp({email,password});
 if(signup.data.user?.email===email)userId=signup.data.user.id;
 ok(!signup.error&&!!userId&&!signup.data.session,'A01: signup real exige confirmação de e-mail');
 const before=await userClient.auth.signInWithPassword({email,password});
 ok(!!before.error&&!before.data.session,'A01/A07: login antes da confirmação negado');
 const confirmedToken=await emailToken('signup');ok(true,'A01: e-mail de confirmação recebido no Mailpit local');
 const confirmed=await userClient.auth.verifyOtp({token_hash:confirmedToken,type:'signup'});
 ok(!confirmed.error&&!!confirmed.data.session&&confirmed.data.user?.id===userId&&!!confirmed.data.user.email_confirmed_at,'A01: confirmação real estabelece identidade');
 const reused=await userClient.auth.verifyOtp({token_hash:confirmedToken,type:'signup'});
 ok(!!reused.error&&!reused.data.session,'A04 parcial: OTP de confirmação consumido não é reutilizado');
 await userClient.auth.signOut({scope:'local'});
 const wrong=await userClient.auth.signInWithPassword({email,password:'OutraSenhaFicticia123!'});
 ok(!!wrong.error&&!wrong.data.session,'A03: senha incorreta negada pelo Auth real');
 const login=await userClient.auth.signInWithPassword({email,password});
 ok(!login.error&&login.data.user?.id===userId&&!!login.data.session,'Login real confirmado');
 const oldRefresh=login.data.session.refresh_token;
 const ended=await userClient.auth.signOut({scope:'local'});
 const after=await userClient.auth.getUser();
 ok(!ended.error&&!after.data.user,'A08 parcial: logout remove sessão do cliente SDK');
 const refresh=await userClient.auth.refreshSession({refresh_token:oldRefresh});
 ok(!!refresh.error&&!refresh.data.session,'A08 parcial: refresh revogado não renova sessão');
 const recovery=await userClient.auth.resetPasswordForEmail(email);
 ok(!recovery.error,'A04: solicitação real de recuperação aceita');
 const recoveryToken=await emailToken('recovery');ok(true,'A04: e-mail de recuperação recebido no Mailpit local');
 const recovered=await userClient.auth.verifyOtp({token_hash:recoveryToken,type:'recovery'});
 ok(!recovered.error&&recovered.data.user?.id===userId&&!!recovered.data.session,'A04: token real de recuperação verificado');
 const updated=await userClient.auth.updateUser({password:newPassword});
 ok(!updated.error,'A04: senha atualizada no Auth real');
 await userClient.auth.signOut({scope:'local'});
 const replay=await userClient.auth.verifyOtp({token_hash:recoveryToken,type:'recovery'});
 ok(!!replay.error&&!replay.data.session,'A04 parcial: token de recuperação consumido não é reutilizado');
 const oldLogin=await userClient.auth.signInWithPassword({email,password});
 ok(!!oldLogin.error&&!oldLogin.data.session,'A04: senha anterior não autentica');
 const newLogin=await userClient.auth.signInWithPassword({email,password:newPassword});
 ok(!newLogin.error&&newLogin.data.user?.id===userId,'A04: nova senha autentica');
 const linked=await db.query('select count(*)::int as n from public.contas_acesso where auth_user_id=$1',[userId]);
 ok(linked.rows[0].n===0,'Falha parcial: identidade confirmada não cria vínculo/papel automaticamente');
}catch(error){failure=error instanceof CheckFailure?error.message:'Falha inesperada omitida para proteger credenciais.';}
finally{
 await userClient.auth.signOut({scope:'local'}).catch(()=>{});
 if(userId){
  const linked=await db.query('select count(*)::int as n from public.contas_acesso where auth_user_id=$1',[userId]);
  if(linked.rows[0].n===0){const removed=await admin.auth.admin.deleteUser(userId);cleanup=removed.error?'FAIL':'PASS';}else cleanup='PENDING: vínculo inesperado; nenhum dado de organização removido';
 }
 await db.end();
 const result={kind:'Auth real por SDK/API + Mailpit; NÃO é teste de navegador ou de cookies SSR da aplicação',fixture_tag:fixture,checks,pass:checks.length,fail:failure?1:0,failure,cleanup,limits:['Sem browser, Next UI, cookies SSR ou fluxo completo A01–A09.','Replay de token consumido foi testado; expiração por passagem de tempo não foi exercitada.','Somente dados fictícios locais; tokens, senhas e chaves mantidos em memória, sem serem impressos/gravados.','Mensagens de teste podem permanecer no Mailpit; usuário fictício removido conforme cleanup.']};
 await writeFile(out+'/auth-backend.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
if(failure||cleanup!=='PASS')process.exitCode=1;
