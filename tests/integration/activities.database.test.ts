import { beforeAll,afterAll,it,expect,vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient,type SupabaseClient } from '@supabase/supabase-js';
import { createActivityService } from '../../src/lib/activities/service.server';
import { withTransaction,closeDatabasePool,type Transaction,type Sql } from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
let db:Client,admin:SupabaseClient;const users:string[]=[],orgs:string[]=[],clients:SupabaseClient[]=[];
let a:ReturnType<typeof createActivityService>,b:ReturnType<typeof createActivityService>,editor:ReturnType<typeof createActivityService>;
const input=()=>({titulo:'Atividade Fictícia '+randomUUID(),descricao:'Descrição factual exclusivamente fictícia.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Acesso fictício para testes.',referencia_oficial:'https://exemplo.invalid/agenda'});
beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Execução real requer autorização de criação/limpeza das próprias fixtures.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
 process.env.SUPABASE_DB_URL=local.DB_URL;db=new Client({connectionString:local.DB_URL});await db.connect();
 admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<3;i++){
  const email=`b01-b04-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');users.push(created.data.user.id);
  const registered=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:users[i],p_nome_publico:'Organização Fictícia B01–B04 '+randomUUID(),p_canal_publico:null});if(registered.error)throw new Error('Fixture organização falhou.');orgs.push(registered.data);
  const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');clients.push(client);
 }
 await db.query("update public.contas_acesso set papel='editor' where auth_user_id=$1",[users[2]]);
 const service=(i:number)=>createActivityService({verifyUser:async()=>{const r=await clients[i].auth.getUser();if(r.error)throw new Error('Auth indisponível.');return r.data.user;}});
 a=service(0);b=service(1);editor=service(2);
},30000);
afterAll(async()=>{
 await closeDatabasePool();
 if(db&&users.length){
  // Only IDs whose author belongs to this run; never a name/prefix-wide DELETE.
  const ids=(await db.query('select a.id from public.atividades a join public.contas_acesso c on c.id=a.criada_por_conta_id where c.auth_user_id=any($1::uuid[])',[users])).rows.map(r=>r.id);
  await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);
  await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
  await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))',[users]);await db.query('delete from public.sujeitos_publicadores where organizacao_legada_id=any($1::uuid[])',[orgs]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);
  await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
  for(const client of clients)await client.auth.signOut({scope:'local'});
  for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza Auth da fixture falhou.');
 }
 await db?.end();
});
it('B01 real: rascunho tem proprietário do servidor e não tem snapshot/apoio público',async()=>{
 const row=await a.create(input());const state=(await db.query('select organizacao_id,estado_editorial,versao_publicada,numero_versao_publicada,publicada_em,apoios_abertos from public.atividades where id=$1',[row.id])).rows[0];
 expect(state).toEqual({organizacao_id:orgs[0],estado_editorial:'rascunho',versao_publicada:null,numero_versao_publicada:null,publicada_em:null,apoios_abertos:false});
 await expect(b.get(row.id)).rejects.toMatchObject({status:404});await expect(editor.get(row.id)).resolves.toMatchObject({id:row.id});
 await expect(editor.submit(row.id,{versao_esperada:1})).rejects.toMatchObject({status:403});
});
it('B01 real: edição própria, outro tenant negado e conflito de versão',async()=>{
 const row=await a.create(input());await expect(b.update(row.id,{...input(),versao_esperada:1})).rejects.toMatchObject({status:404});
 const result=await a.update(row.id,{...input(),versao_esperada:1});expect(result.versao_submetida).toBe(2);
 await expect(a.update(row.id,{...input(),versao_esperada:1})).rejects.toMatchObject({status:409});
});
it('B01 real: conta bloqueada não consulta/escreve e pode ser restaurada só pelo setup',async()=>{
 const row=await a.create(input());await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1",[users[0]]);
 try{await expect(a.get(row.id)).rejects.toMatchObject({status:403});await expect(a.submit(row.id,{versao_esperada:1})).rejects.toMatchObject({status:403});}
 finally{await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1",[users[0]]);}
});
it('B02 real: campos obrigatórios ausentes não criam atividade',async()=>{
 const before=(await a.list()).length;await expect(a.create({titulo:'Incompleta'})).rejects.toMatchObject({status:422});expect((await a.list()).length).toBe(before);
});
it('B03 real: URL/HTML/data inválidos negados sem persistência',async()=>{
 for(const patch of [{referencia_oficial:'javascript:alert(1)'},{descricao:'<script>indevido</script>'},{inicio_previsto:'2030-02-30T10:00:00-03:00'}])await expect(a.create({...input(),...patch})).rejects.toMatchObject({status:422});
});
it('B03/B04 real: envio revalida conteúdo persistido e não produz evento inválido',async()=>{
 const row=await a.create(input());await db.query('update public.atividades set referencia_oficial=$2 where id=$1',[row.id,'javascript:alert(1)']);
 await expect(a.submit(row.id,{versao_esperada:1})).rejects.toMatchObject({status:422});
 expect((await db.query('select count(*)::int n from public.eventos_editoriais where objeto_id=$1',[row.id])).rows[0].n).toBe(0);
});
it('B04 real: envio e auditoria confirmados juntos; retry sem evento duplicado',async()=>{
 const row=await a.create(input());const sent=await a.submit(row.id,{versao_esperada:1});expect(sent.estado_editorial).toBe('enviada');await a.submit(row.id,{versao_esperada:1});
 const events=await db.query('select acao,estado_anterior,estado_novo,executada_por_conta_id is not null as author from public.eventos_editoriais where objeto_id=$1',[row.id]);expect(events.rows).toEqual([{acao:'atividade_enviada',estado_anterior:'rascunho',estado_novo:'enviada',author:true}]);
 const data=(await db.query('select versao_publicada,numero_versao_publicada,publicada_em,apoios_abertos from public.atividades where id=$1',[row.id])).rows[0];expect(data).toEqual({versao_publicada:null,numero_versao_publicada:null,publicada_em:null,apoios_abertos:false});
 await expect(b.get(row.id)).rejects.toMatchObject({status:404});
});
it('B04 real: 6 envios concorrentes geram uma transição e um evento',async()=>{
 const row=await a.create(input());const results=await Promise.all(Array.from({length:6},()=>a.submit(row.id,{versao_esperada:1})));expect(results.every(r=>r.estado_editorial==='enviada')).toBe(true);
 expect((await db.query('select count(*)::int n from public.eventos_editoriais where objeto_id=$1',[row.id])).rows[0].n).toBe(1);
});
it('B04 real: falha PostgreSQL no INSERT de auditoria reverte UPDATE de envio',async()=>{
 const row=await a.create(input());let sqlstate='';
 const fault:Transaction=operation=>withTransaction(sql=>operation({query:async(text:string,values?:unknown[])=>{
  try{return await sql.query(text,text.includes('insert into public.eventos_editoriais')?[values![0],randomUUID()]:values);}catch(error){sqlstate=(error as {code:string}).code;throw error;}
 }} as Sql));
 const faulty=createActivityService({transaction:fault,verifyUser:async()=>{const r=await clients[0].auth.getUser();return r.data.user;}});
 await expect(faulty.submit(row.id,{versao_esperada:1})).rejects.toMatchObject({status:503});expect(sqlstate).toBe('23503');
 expect((await db.query('select estado_editorial from public.atividades where id=$1',[row.id])).rows[0].estado_editorial).toBe('rascunho');
 expect((await db.query('select count(*)::int n from public.eventos_editoriais where objeto_id=$1',[row.id])).rows[0].n).toBe(0);
});
it('B01/B04 real: duas edições concorrentes da versão 1 não sobrescrevem silenciosamente',async()=>{
 const row=await a.create(input());const results=await Promise.allSettled([a.update(row.id,{...input(),versao_esperada:1}),a.update(row.id,{...input(),versao_esperada:1})]);
 expect(results.filter(r=>r.status==='fulfilled').length).toBe(1);expect(results.filter(r=>r.status==='rejected'&&r.reason.status===409).length).toBe(1);expect((await a.get(row.id)).versao_submetida).toBe(2);
});
it('B01 real: nove tabelas continuam RLS/grants fechados; REST autenticado não lê atividade',async()=>{
 const tables=['organizacoes','contas_acesso','atividades','registros_realizacao','evidencias','autorizacoes_publicacao','apoios','parceiros','eventos_editoriais'];
 for(const table of tables){
  expect((await db.query('select relrowsecurity from pg_class where oid=$1::regclass',['public.'+table])).rows[0].relrowsecurity).toBe(true);
  for(const role of ['anon','authenticated'])for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])expect((await db.query('select has_table_privilege($1,$2,$3) allowed',[role,'public.'+table,privilege])).rows[0].allowed).toBe(false);
 }
 expect(Boolean((await clients[0].from('atividades').select('id')).error)).toBe(true);
});
