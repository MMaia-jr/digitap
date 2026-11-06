import { test,expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

test.describe.configure({mode:'serial'});
const origin='http://127.0.0.1:3215';
const email=`pf-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!',name='Pessoa Fictícia '+randomUUID();
let db,admin,user;
test.beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures locais não autorizadas.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
 db=new Client(local.DB_URL);await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
});
test.afterAll(async()=>{
 try{
  if(!user&&db)user=(await db.query('select id from auth.users where email=$1',[email])).rows[0]?.id;
  if(user){
   await db.query('begin');
   try{
    await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[user]);
    await db.query('delete from public.pessoas_fisicas where conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[user]);
    await db.query('delete from public.sujeitos_publicadores where criado_por_conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[user]);
    await db.query('delete from public.contas_acesso where auth_user_id=$1',[user]);await db.query('commit');
   }catch(e){await db.query('rollback');throw e;}
   const removed=await admin.auth.admin.deleteUser(user);if(removed.error)throw new Error('Limpeza da fixture Auth PF falhou.');
  }
 }finally{await db?.end();}
});
test('PF-07: GET cadastro PF retorna 200 e formulário próprio',async({page})=>{
 const response=await page.goto('/cadastro/pessoa-fisica');expect(response.status()).toBe(200);
 await expect(page.getByLabel('Nome público',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Criar acesso como pessoa física',exact:true})).toBeVisible();
});
test('PF-08: cadastro organizacional preservado oferece link Sou pessoa física',async({page})=>{
 await page.goto('/cadastro');await expect(page.getByRole('button',{name:'Criar acesso',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Sou pessoa física',exact:true})).toHaveAttribute('href','/cadastro/pessoa-fisica');
});
test('PF-09/PF-10/PF-11: confirmação cria PF pendente, login retoma e publicação é negada',async({page})=>{
 await page.goto('/cadastro/pessoa-fisica');await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByLabel('Nome público',{exact:true}).fill(name);
 await page.getByRole('button',{name:'Criar acesso como pessoa física',exact:true}).click();await expect(page.getByRole('status')).toContainText('Se o cadastro puder ser concluído');
 const row=(await db.query('select id,email_confirmed_at from auth.users where email=$1',[email])).rows[0];expect(row).toBeTruthy();user=row.id;expect(row.email_confirmed_at).toBeNull();
 expect((await db.query('select count(*)::int n from public.contas_acesso where auth_user_id=$1',[user])).rows[0].n).toBe(0);
 let link;
 for(let i=0;i<30&&!link;i++){
  const list=await(await fetch('http://127.0.0.1:56154/api/v1/search?query='+encodeURIComponent('to:'+email))).json();
  for(const m of list.messages??[]){const detail=await(await fetch('http://127.0.0.1:56154/api/v1/message/'+encodeURIComponent(m.ID))).json();const text=String(detail.HTML??detail.Text??'').replaceAll('&amp;','&');const match=text.match(/http:\/\/127\.0\.0\.1:3215\/auth\/confirm\?[^"<>\s]+/);if(match&&new URL(match[0]).searchParams.get('type')==='signup'){link=match[0];break;}}
  if(!link)await new Promise(resolve=>setTimeout(resolve,300));
 }
 if(!link)throw new Error('Confirmação PF não recebida no Mailpit local.');
 await page.goto(link);await page.getByRole('button',{name:'Confirmar meu e-mail',exact:true}).click();await expect(page).toHaveURL(origin+'/dashboard/pessoa-fisica');
 await expect(page.getByText('Seu cadastro está pendente de curadoria',{exact:true})).toBeVisible();await expect(page.getByText(name,{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'muralitaperuna@gmail.com',exact:true})).toHaveAttribute('href','mailto:muralitaperuna@gmail.com');
 expect(await page.getByRole('button',{name:/Publicar/}).count()).toBe(0);
 const actual=(await db.query("select c.papel,c.organizacao_id,s.tipo,s.estado,s.modo_publicacao,s.risco,v.escopos from public.contas_acesso c join public.pessoas_fisicas p on p.conta_id=c.id join public.sujeitos_publicadores s on s.id=p.sujeito_id join public.vinculos_publicadores v on v.conta_id=c.id and v.sujeito_id=s.id where c.auth_user_id=$1",[user])).rows;
 expect(actual).toEqual([{papel:'publicador',organizacao_id:null,tipo:'pessoa_fisica',estado:'pendente',modo_publicacao:'curadoria_previa',risco:'medio',escopos:['ler_privado','editar','enviar']}]);
 const denied=await page.request.post('/api/admin/atividades/'+randomUUID()+'/publicar',{headers:{origin},data:{versao_esperada:1,pedido_id:randomUUID()}});expect(denied.status()).toBe(403);
 await page.getByRole('button',{name:'Sair',exact:true}).click();await expect(page).toHaveURL(origin+'/login');
 await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(origin+'/dashboard/pessoa-fisica');
 await expect(page.getByText('Seu cadastro está pendente de curadoria',{exact:true})).toBeVisible();
});
