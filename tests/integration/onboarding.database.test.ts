// Prepared for the isolated real stack. NOT RUN while Docker networking is blocked.
import { beforeAll,afterAll,it,expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient,type SupabaseClient } from '@supabase/supabase-js';
let db:Client;let admin:SupabaseClient;let publicClient:SupabaseClient;let userId:string;
beforeAll(async()=>{
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).port!=='56152'||new URL(local.DB_URL).hostname!=='127.0.0.1')throw new Error('Alvo não autorizado.');
 db=new Client({connectionString:local.DB_URL});await db.connect();
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 admin=createClient(local.API_URL,local.SECRET_KEY,options);publicClient=createClient(local.API_URL,local.PUBLISHABLE_KEY,options);
 const password=randomUUID()+'aA1!';const email=`onboarding-${randomUUID()}@example.invalid`;
 const result=await admin.auth.admin.createUser({email,password,email_confirm:true});if(result.error||!result.data.user)throw new Error('Fixture Auth falhou.');userId=result.data.user.id;
 const session=await publicClient.auth.signInWithPassword({email,password});if(session.error)throw new Error('Login de fixture falhou.');
},30000);
afterAll(async()=>{
 if(db&&userId){const linked=await db.query('select organizacao_id from public.contas_acesso where auth_user_id=$1',[userId]);await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=$1)',[userId]);await db.query('delete from public.sujeitos_publicadores where organizacao_legada_id in (select organizacao_id from public.contas_acesso where auth_user_id=$1)',[userId]);await db.query('delete from public.contas_acesso where auth_user_id=$1',[userId]);for(const row of linked.rows)await db.query('delete from public.organizacoes where id=$1',[row.organizacao_id]);}
 if(userId)await admin.auth.admin.deleteUser(userId);if(db)await db.end();
});
async function requireRpcExists() {
 const result=await db.query("select to_regprocedure('public.criar_organizacao_com_sujeito(uuid,text,text)') is not null as exists");
 expect(result.rows[0].exists, 'A RPC deve existir antes de interpretar erros como autorização ou rollback.').toBe(true);
}
it('RPC idempotente concorrente cria exatamente uma organização pendente e uma conta organizacional',async()=>{
 await requireRpcExists();
 const results=await Promise.all(Array.from({length:8},()=>admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:userId,p_nome_publico:'Organização Fictícia RPC',p_canal_publico:null})));
 expect(results.every(r=>!r.error)).toBe(true);const ids=new Set(results.map(r=>r.data));expect(ids.size).toBe(1);
 const result=await db.query('select c.papel,c.situacao,o.estado_validacao from public.contas_acesso c join public.organizacoes o on o.id=c.organizacao_id where c.auth_user_id=$1',[userId]);
 expect(result.rows).toEqual([{papel:'organizacao',situacao:'ativa',estado_validacao:'pendente'}]);
});
it('RPC não pode ser executada por authenticated com identidade de outro usuário',async()=>{
 await requireRpcExists();
 const privilege=await db.query("select has_function_privilege('authenticated','public.criar_organizacao_com_sujeito(uuid,text,text)','EXECUTE') as allowed");
 expect(privilege.rows[0].allowed).toBe(false);
 const result=await publicClient.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:randomUUID(),p_nome_publico:'Fictícia',p_canal_publico:null});expect(result.error).toBeTruthy();expect(['42501','PGRST202']).toContain(result.error?.code);
});
it('RPC não pode ser executada por anon e não aceita mudança de papel de conta existente',async()=>{
 await requireRpcExists();
 const privilege=await db.query("select has_function_privilege('anon','public.criar_organizacao_com_sujeito(uuid,text,text)','EXECUTE') as allowed");
 expect(privilege.rows[0].allowed).toBe(false);
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const anon=createClient(local.API_URL,local.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 expect((await anon.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:userId,p_nome_publico:'Fictícia',p_canal_publico:null})).error).toBeTruthy();
 const changed=await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1 returning id",[userId]);
 expect(changed.rowCount).toBe(1);
 expect((await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:userId,p_nome_publico:'Fictícia',p_canal_publico:null})).error?.code).toBe('42501');
});
it('falha no segundo insert reverte organização (sem órfã)',async()=>{
 await requireRpcExists();
 const before=await db.query('select count(*)::int as n from public.organizacoes');
 // A nonexistent Auth UUID violates the account FK after the organization INSERT.
 const failed=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:randomUUID(),p_nome_publico:'Fictícia a reverter',p_canal_publico:null});
 expect(failed.error?.code).toBe('23503');expect((await db.query('select count(*)::int as n from public.organizacoes')).rows).toEqual(before.rows);
});
