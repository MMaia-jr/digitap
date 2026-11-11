// Requires the isolated Supabase stack and the new migration. No remote fallback.
import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {createActivityService} from '../../src/lib/activities/service.server';
import {closeDatabasePool} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
let db:Client,admin:SupabaseClient,anon:SupabaseClient;
const users:string[]=[],subjects:string[]=[],organizations:string[]=[],ids:string[]=[],authorizations:string[]=[],clients:SupabaseClient[]=[];
const services:ReturnType<typeof createActivityService>[]=[];
const input=()=>({titulo:'Confirmação Fictícia '+randomUUID(),descricao:'Atividade fictícia para testar participação privada.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Local fictício sem público real.',referencia_oficial:null});
async function published(){
 const row=await services[2].create(input());ids.push(row.id);
 await services[2].submit(row.id,{versao_esperada:1});
 const auth=randomUUID();authorizations.push(auth);
 await db.query("insert into public.autorizacoes_publicacao(id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em) values($1,'atividade',$2,$3,'Responsável fictício','Autorização fictícia restrita',now()-interval '1 minute')",[auth,row.id,['divulgacao','atividade:versao:1']]);
 await services[3].review(row.id,{acao:'iniciar',estado_esperado:'enviada',versao_esperada:1,pedido_id:randomUUID()});
 await services[3].review(row.id,{acao:'aprovar',estado_esperado:'em_revisao',versao_esperada:1,pedido_id:randomUUID(),autorizacao_id:auth});
 await services[3].publish(row.id,{versao_esperada:1,pedido_id:randomUUID()});
 return row.id;
}
function register(id:string,user=0,extra:Record<string,unknown>={}){return admin.rpc('registrar_confirmacao',{p_atividade_id:id,p_auth_user_id:users[user],p_tipo:'intencao',...extra});}
beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Criação e limpeza de fixtures precisam de autorização.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const target=new URL(local.DB_URL);
 if(local.API_URL!=='http://127.0.0.1:56151'||target.hostname!=='127.0.0.1'||target.port!=='56152')throw new Error('Somente stack local isolado.');
 process.env.SUPABASE_DB_URL=local.DB_URL;db=new Client(local.DB_URL);await db.connect();
 expect((await db.query("select to_regclass('public.confirmacoes') is not null as exists")).rows[0].exists,'Aplique a migration no banco local antes desta suíte.').toBe(true);
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 admin=createClient(local.API_URL,local.SECRET_KEY,options);anon=createClient(local.API_URL,local.PUBLISHABLE_KEY,options);
 for(let i=0;i<5;i++){
  const email=`confirmacao-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';
  const result=await admin.auth.admin.createUser({email,password,email_confirm:true});if(result.error||!result.data.user)throw new Error('Fixture Auth falhou.');
  const user=result.data.user;users.push(user.id);
  if(i<2){const result=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:user.id,p_nome_publico:'Pessoa Fictícia Participação '+i});if(result.error)throw new Error('Fixture PF falhou.');subjects.push(result.data);}
  else if(i===2){const result=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:user.id,p_nome_publico:'Organização Fictícia Participação',p_canal_publico:null});if(result.error)throw new Error('Fixture org falhou.');organizations.push(result.data);await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[result.data]);subjects.push((await db.query('select id from public.sujeitos_publicadores where organizacao_legada_id=$1',[result.data])).rows[0].id);}
  else if(i===3)await db.query("insert into public.contas_acesso(auth_user_id,papel) values($1,'editor')",[user.id]);
  else{
   const account=(await db.query("insert into public.contas_acesso(auth_user_id,papel,organizacao_id) values($1,'organizacao',$2) returning id",[user.id,organizations[0]])).rows[0].id;
   await db.query("insert into public.vinculos_publicadores(sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,versao,atual,ativada_em) values($1,$2,'titular',array['ler_privado'],'ativo','cadastro',1,true,now())",[subjects[2],account]);
  }
  const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,options);if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');clients.push(client);
  services.push(createActivityService({verifyUser:async()=>user}));
 }
},30000);
afterAll(async()=>{
 await closeDatabasePool();if(!db)return;if(!users.length){await db.end();return;}
 await db.query('begin');
 try{
  await db.query('delete from public.confirmacoes where sujeito_id=any($1::uuid[]) or atividade_id=any($2::uuid[])',[subjects,ids]);
  await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);
  await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[authorizations]);
  await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
  await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))',[users]);
  await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])',[subjects]);
  await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[subjects]);
  await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);
  await db.query('delete from public.organizacoes where id=any($1::uuid[])',[organizations]);
  await db.query('commit');
 }catch(error){await db.query('rollback');throw error;}
 for(const client of clients)await client.auth.signOut({scope:'local'});
 for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza Auth falhou.');
 await db.end();
});
it('UNIQUE impede duas escolhas e concorrência deixa exatamente uma linha',async()=>{
 const id=await published();const result=await Promise.all(Array.from({length:5},()=>register(id)));
 expect(result.filter(r=>!r.error)).toHaveLength(1);expect(result.filter(r=>r.error?.code==='23505')).toHaveLength(4);
 expect((await register(id,0,{p_tipo:'apoio'})).error?.code).toBe('23505');
 expect((await db.query('select count(*)::int n from public.confirmacoes where atividade_id=$1',[id])).rows[0].n).toBe(1);
});
it('RLS entrega só a própria linha; organizador não recebe participantes ou WhatsApp',async()=>{
 const id=await published();expect((await register(id,0,{p_whatsapp:'+5522999999999'})).error).toBeNull();expect((await register(id,1,{p_tipo:'apoio'})).error).toBeNull();
 const mine=await clients[0].from('confirmacoes').select('sujeito_id,whatsapp').eq('atividade_id',id);expect(mine.error).toBeNull();expect(mine.data).toEqual([{sujeito_id:subjects[0],whatsapp:'+5522999999999'}]);
 expect((await clients[1].from('confirmacoes').select('sujeito_id').eq('atividade_id',id)).data).toEqual([{sujeito_id:subjects[1]}]);
 expect((await clients[2].from('confirmacoes').select('*').eq('atividade_id',id)).data).toEqual([]);
 const counts=await admin.rpc('contadores_confirmacoes_organizador',{p_auth_user_id:users[2],p_atividade_id:id});expect(counts.error).toBeNull();expect(counts.data).toEqual({apoios:1,intencoes:1});
 expect((await admin.rpc('contadores_confirmacoes_organizador',{p_auth_user_id:users[1],p_atividade_id:id})).error?.code).toBe('42501');
});
it('consentimento começa privado e só libera nome, nunca telefone ou grupo',async()=>{
 const id=await published();expect((await register(id,0,{p_whatsapp:'+5522999999999',p_acompanhantes:3})).error).toBeNull();
 expect((await register(id,1,{p_mostrar_nome:true})).error).toBeNull();
 const result=await admin.rpc('resumo_publico_confirmacoes',{p_atividade_id:id});expect(result.error).toBeNull();expect(result.data).toEqual({apoios:0,intencoes:2,nomes_publicos:['Pessoa Fictícia Participação 1'],aberta:true});
});
it('outro titular do mesmo perfil organizacional não lê o contato de quem registrou',async()=>{
 const id=await published();expect((await register(id,2,{p_whatsapp:'+5522999999999'})).error).toBeNull();
 expect((await clients[2].from('confirmacoes').select('whatsapp').eq('atividade_id',id)).data).toEqual([{whatsapp:'+5522999999999'}]);
 expect((await clients[4].from('confirmacoes').select('*').eq('atividade_id',id)).data).toEqual([]);
 expect((await register(id,4,{p_tipo:'apoio'})).error?.code).toBe('23505');
});
it('anon/authenticated não invocam RPC privilegiada nem inserem identidade forjada',async()=>{
 const id=await published();
 for(const client of [anon,clients[0]]){
  expect((await client.rpc('registrar_confirmacao',{p_auth_user_id:users[1],p_atividade_id:id,p_tipo:'apoio'})).error).toBeTruthy();
  expect((await client.from('confirmacoes').insert({atividade_id:id,sujeito_id:subjects[1],tipo:'apoio'})).error).toBeTruthy();
 }
 expect((await anon.from('confirmacoes').select('*')).error).toBeTruthy();
});
it('rascunho não pode receber confirmação nem expor resumo público',async()=>{
 const row=await services[2].create(input());ids.push(row.id);
 expect((await register(row.id)).error?.code).toBe('P0002');
 expect((await admin.rpc('resumo_publico_confirmacoes',{p_atividade_id:row.id})).error?.code).toBe('P0002');
});
it('cancelamento fecha novas confirmações e retirada oculta resumo',async()=>{
 const id=await published();await db.query("update public.atividades set estado_programacao='cancelada' where id=$1",[id]);
 expect((await register(id)).error?.code).toBe('55000');
 await db.query("update public.atividades set estado_editorial='retirada' where id=$1",[id]);
 expect((await admin.rpc('resumo_publico_confirmacoes',{p_atividade_id:id})).error?.code).toBe('P0002');
});
it('constraints recusam contato inválido, grupo inválido e apoio com nome público',async()=>{
 const id=await published();
 for(const extra of [{p_whatsapp:'javascript:alert(1)'},{p_acompanhantes:0},{p_acompanhantes:21},{p_tipo:'apoio',p_mostrar_nome:true}])expect((await register(id,0,extra)).error?.code).toBe('23514');
});
