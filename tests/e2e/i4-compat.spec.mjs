import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

test('CMP-07/CMP-08: POST mantém contrato e cria sujeito/vínculo sem drift', async ({page}) => {
  if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures não autorizadas.');
  const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
  const db=new Client(local.DB_URL); await db.connect();
  const admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const email=`compat-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!',name='Organização Fictícia COMPAT '+randomUUID();
  let user;
  try {
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
    if(created.error)throw new Error('Fixture Auth falhou.'); user=created.data.user.id;
    await page.goto('/login'); await page.getByLabel('E-mail',{exact:true}).fill(email); await page.getByLabel('Senha',{exact:true}).fill(password);
    await page.getByRole('button',{name:'Entrar',exact:true}).click(); await expect(page).toHaveURL(/\/dashboard\/organizacao$/);
    const post=()=>page.evaluate(async nome=>{
      const r=await fetch('/api/organizacoes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome_publico:nome})});
      return {status:r.status,body:await r.json()};
    },name);
    const before=(await db.query(`select (select count(*) from public.atividades) atividades,(select count(*) from public.eventos_editoriais) eventos`)).rows;
    const response=await post();
    expect(response).toEqual({status:200,body:{message:'Organização vinculada. Validação institucional pendente.',next:'/dashboard'}});
    const rows=(await db.query(`select s.id,s.organizacao_legada_id,s.criado_por_conta_id,c.id conta,c.organizacao_id,v.sujeito_id,v.conta_id,v.escopos
      from public.contas_acesso c join public.sujeitos_publicadores s on s.organizacao_legada_id=c.organizacao_id
      join public.vinculos_publicadores v on v.sujeito_id=s.id and v.conta_id=c.id where c.auth_user_id=$1`,[user])).rows;
    expect(rows).toHaveLength(1); const s=rows[0];
    expect(s.organizacao_legada_id).toBe(s.organizacao_id); expect(s.sujeito_id).toBe(s.id); expect(s.conta_id).toBe(s.conta); expect(s.criado_por_conta_id).toBe(s.conta);
    expect(s.escopos).toEqual(['ler_privado','editar','enviar','publicar','gerir_vinculo']);
    expect(await post()).toEqual(response);
    expect((await db.query('select count(*)::int n from public.sujeitos_publicadores where organizacao_legada_id=$1',[s.organizacao_id])).rows[0].n).toBe(1);
    expect((await db.query(`select (select count(*) from public.atividades) atividades,(select count(*) from public.eventos_editoriais) eventos`)).rows).toEqual(before);
  } finally {
    if(user){
      await db.query('begin');
      try {
        const orgs=(await db.query('select organizacao_id from public.contas_acesso where auth_user_id=$1',[user])).rows.map(r=>r.organizacao_id);
        await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[user]);
        await db.query('delete from public.sujeitos_publicadores where organizacao_legada_id=any($1::uuid[])',[orgs]);
        await db.query('delete from public.contas_acesso where auth_user_id=$1',[user]);
        await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]); await db.query('commit');
      } catch(e){await db.query('rollback');throw e;}
      const removed=await admin.auth.admin.deleteUser(user);if(removed.error)throw new Error('Limpeza Auth falhou.');
    }
    await db.end();
  }
});
