import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
const origin='http://127.0.0.1:3215',email='cookie-'+randomUUID()+'@example.invalid',password=randomUUID()+'aA1!',name='Pessoa fictícia — sessão SSR';
let db,admin,user,subject;
test.beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures locais não autorizadas.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
 db=new Client(local.DB_URL);await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');user=created.data.user.id;
 const registered=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:user,p_nome_publico:name});if(registered.error)throw new Error('Fixture PF falhou.');subject=registered.data;
});
test.afterAll(async()=>{
 try{if(user){await db.query('begin');try{
  await db.query('delete from public.vinculos_publicadores where sujeito_id=$1',[subject]);await db.query('delete from public.pessoas_fisicas where sujeito_id=$1',[subject]);await db.query('delete from public.sujeitos_publicadores where id=$1',[subject]);await db.query('delete from public.contas_acesso where auth_user_id=$1',[user]);await db.query('commit');
 }catch(e){await db.query('rollback');throw e;}if((await admin.auth.admin.deleteUser(user)).error)throw new Error('Limpeza Auth falhou.');}}finally{await db?.end();}
});
const sessionCookies=cookies=>cookies.filter(c=>c.name==='ap-auth'||/^ap-auth\.\d+$/.test(c.name)).sort((a,b)=>a.name.localeCompare(b.name));
const decode=cookies=>JSON.parse(Buffer.from(sessionCookies(cookies).map(c=>c.value).join('').slice(7),'base64url').toString());
test('COOKIE-01: Home renova sessão antes do layout; navegação e logout sem erro de cookies',async({page,context})=>{
 const cookieErrors=[];const observe=message=>{if(/Cookies can only be modified/.test(message))cookieErrors.push('Erro de escrita de cookie durante renderização.');};
 page.on('pageerror',error=>observe(error.message));page.on('console',message=>observe(message.text()));
 await page.goto('/login');await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(origin+'/dashboard/pessoa-fisica');
 // Keep the genuine JWT/refresh token. Expire only the SDK's cached expiry
 // timestamp so the next request must refresh the real, valid Auth session.
 const session=decode(await context.cookies());session.expires_at=1;session.expires_in=0;
 await context.clearCookies();await context.addCookies([{name:'ap-auth',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
 const response=await page.goto('/');expect(response.status()).toBe(200);expect(response.headers()['cache-control']).toContain('no-store');
 expect((await response.headersArray()).some(h=>h.name.toLowerCase()==='set-cookie'&&h.value.startsWith('ap-auth'))).toBe(true);
 await expect(page.getByRole('banner').getByRole('link',{name:'Olá, '+name,exact:true})).toBeVisible();
 const refreshed=decode(await context.cookies());expect(refreshed.expires_at>Math.floor(Date.now()/1000)).toBe(true);
 expect(sessionCookies(await context.cookies()).every(c=>c.httpOnly&&c.sameSite==='Lax')).toBe(true);expect(await page.evaluate(()=>document.cookie.includes('ap-auth'))).toBe(false);
 expect((await page.goto('/governanca')).status()).toBe(200);await expect(page.getByRole('banner').getByRole('link',{name:'Olá, '+name,exact:true})).toBeVisible();
 await page.getByRole('banner').getByRole('button',{name:'Sair',exact:true}).click();await expect(page).toHaveURL(origin+'/login');
 await context.addCookies([{name:'ap-auth',value:'base64-invalido',domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Lax'}]);
 expect((await page.goto('/')).status()).toBe(200);await expect(page.getByRole('banner').getByRole('link',{name:'Entrar',exact:true})).toBeVisible();
 expect(cookieErrors).toEqual([]);
});
