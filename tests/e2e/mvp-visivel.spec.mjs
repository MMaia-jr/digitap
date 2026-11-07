import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
let db, admin, user;
const name='Ana — participante fictícia', email=`mvp-ui-${randomUUID()}@example.invalid`, password=randomUUID()+'aA1!';
test.beforeAll(async()=>{
  if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures não autorizadas.');
  const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
  db=new Client(local.DB_URL);await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');user=created.data.user.id;
  if((await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:user,p_nome_publico:name})).error)throw new Error('Fixture PF falhou.');
});
test.afterAll(async()=>{
  try{if(user){
    await db.query('begin');
    try{
      await db.query('delete from public.atividades where criada_por_conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[user]);
      await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[user]);
      await db.query('delete from public.pessoas_fisicas where conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[user]);
      await db.query('delete from public.sujeitos_publicadores where criado_por_conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[user]);
      await db.query('delete from public.contas_acesso where auth_user_id=$1',[user]);await db.query('commit');
    }catch(e){await db.query('rollback');throw e;}
    if((await admin.auth.admin.deleteUser(user)).error)throw new Error('Limpeza Auth falhou.');
  }}finally{await db?.end();}
});
test('MVP-01: home pública tem agenda e convite para publicar',async({page})=>{
  expect((await page.goto('/')).status()).toBe(200);
  await expect(page.getByRole('heading',{name:'Atividades na Praça',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Quero publicar uma atividade',exact:true})).toHaveAttribute('href','/login');
  await expect(page.getByRole('banner').getByRole('link',{name:'Entrar',exact:true})).toBeVisible();
  await page.screenshot({path:'operations/evidence/mvp-visivel/home.png',fullPage:true});
});
test('MVP-02: PF entra, cria rascunho, vê no painel e sai sem publicar',async({page})=>{
  const title='Oficina de horta comunitária — teste fictício';
  await page.goto('/login');await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL('http://127.0.0.1:3215/dashboard/pessoa-fisica');
  await expect(page.getByRole('banner').getByRole('link',{name:'Olá, '+name,exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Criar Atividade',exact:true}).click();await expect(page).toHaveURL('http://127.0.0.1:3215/dashboard/pessoa-fisica/nova');
  await page.getByLabel('Título',{exact:true}).fill(title);await page.getByLabel('Descrição',{exact:true}).fill('Oficina fictícia para testar o produto visível.');
  await page.getByLabel('Data e horário (America/Sao_Paulo)',{exact:true}).fill(new Date(Date.now()+86400000*3).toISOString().slice(0,16));
  await page.getByLabel('Orientação de acesso',{exact:true}).fill('Entrada gratuita fictícia.');await page.screenshot({path:'operations/evidence/mvp-visivel/form.png',fullPage:true});await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();
  await expect(page).toHaveURL('http://127.0.0.1:3215/dashboard/pessoa-fisica');await expect(page.getByRole('main').getByRole('heading',{name:title,exact:true})).toBeVisible();
  await expect(page.getByRole('main').getByText('Rascunho privado',{exact:true})).toBeVisible();
  await page.screenshot({path:'operations/evidence/mvp-visivel/dashboard.png',fullPage:true});
  const row=(await db.query('select a.id,a.estado_editorial,a.versao_publicada,a.organizacao_id from public.atividades a join public.contas_acesso c on c.id=a.criada_por_conta_id where c.auth_user_id=$1 and a.titulo=$2',[user,title])).rows[0];
  expect(row).toMatchObject({estado_editorial:'rascunho',versao_publicada:null,organizacao_id:null});
  expect((await page.request.get('/api/public/atividades/'+row.id)).status()).toBe(404);
  await page.goto('/');await expect(page.getByRole('link',{name:'Quero publicar uma atividade',exact:true})).toHaveAttribute('href','/dashboard/pessoa-fisica');await expect(page.getByRole('main').getByText(title,{exact:true})).toHaveCount(0);
  await page.getByRole('banner').getByRole('button',{name:'Sair',exact:true}).click();await expect(page).toHaveURL('http://127.0.0.1:3215/login');
});
