import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {createActivityService} from '../../src/lib/activities/service.server';
import {createPublicQueries} from '../../src/lib/queries/public.server';
import {withTransaction,closeDatabasePool,type Transaction,type Sql} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
let db:Client,admin:SupabaseClient;const users:string[]=[],orgs:string[]=[],auths:string[]=[],ids:string[]=[],clients:SupabaseClient[]=[];
const services:ReturnType<typeof createActivityService>[]=[],publicQuery=createPublicQueries();
const input=()=>({titulo:'Publicação Fictícia '+randomUUID(),descricao:'Descrição fictícia aprovada para publicação local.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Entrada fictícia de teste.',referencia_oficial:'https://example.invalid/atividade'});
const command=()=>({versao_esperada:1,pedido_id:randomUUID()});
async function authorization(id:string){const auth=randomUUID();await db.query("insert into public.autorizacoes_publicacao(id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em,validade_ate) values($1,'atividade',$2,$3,'Responsável fictício','Comprovação fictícia restrita',now()-interval '1 minute',now()+interval '1 hour')",[auth,id,['divulgacao','atividade:versao:1']]);auths.push(auth);return auth;}
async function approved(owner=0){const activity=await services[owner].create(input());ids.push(activity.id);await services[owner].submit(activity.id,{versao_esperada:1});await services[2].review(activity.id,{acao:'iniciar',estado_esperado:'enviada',...command()});const auth=await authorization(activity.id);await services[2].review(activity.id,{acao:'aprovar',estado_esperado:'em_revisao',...command(),autorizacao_id:auth});return {id:activity.id,auth,activity};}
beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures exigem autorização específica.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
 process.env.SUPABASE_DB_URL=local.DB_URL;db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<4;i++){
  const email=`schedule-db-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';const c=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{papel:'administrador'}});if(c.error||!c.data.user)throw new Error('Fixture Auth falhou.');users.push(c.data.user.id);
  if(i<2){const r=await admin.rpc('criar_organizacao_pendente',{p_auth_user_id:users[i],p_nome_publico:'Organização Fictícia Publicação '+randomUUID()});if(r.error)throw new Error('Fixture organização falhou.');orgs.push(r.data);if(i===0)await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[r.data]);}
  else await db.query('insert into public.contas_acesso(auth_user_id,papel) values($1,$2)',[users[i],i===2?'editor':'administrador']);
  const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');clients.push(client);
  services.push(createActivityService({verifyUser:async()=>{const r=await client.auth.getUser();if(r.error)throw new Error('Auth indisponível.');return r.data.user;}}));
 }
},30000);
afterAll(async()=>{
 await closeDatabasePool();if(!db)return;await db.query('rollback');
 await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[auths]);await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
 for(const client of clients)await client.auth.signOut({scope:'local'});for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');await db.end();
});

async function published(){const v=await approved();await services[2].publish(v.id,command());return {...v,snapshot:await publicQuery.get(v.id)};}
const scheduleCommand=(state='cancelada',previous='programada')=>({...command(),estado_programacao:state,estado_esperado:previous,motivo:'Motivo fictício restrito de programação.'});
it('B12 PostgreSQL: sem publicações elegíveis, rascunhos não preenchem listagem',async()=>{
 expect(await publicQuery.list()).toEqual([]);const draft=await services[0].create(input());ids.push(draft.id);expect(await publicQuery.list()).toEqual([]);await expect(publicQuery.get(draft.id)).rejects.toMatchObject({status:404});
});
it.each(['adiada','cancelada'])('B10 PostgreSQL: %s preserva snapshot, fecha apoios e audita autor/data',async state=>{
 const {id,snapshot}=await published();await db.query('update public.atividades set apoios_abertos=true where id=$1',[id]);
 const request=scheduleCommand(state);await services[2].schedule(id,request);
 const row=(await db.query('select versao_publicada,estado_programacao,apoios_abertos from public.atividades where id=$1',[id])).rows[0];expect(row).toEqual({versao_publicada:snapshot,estado_programacao:state,apoios_abertos:false});
 const visible=await publicQuery.get(id);expect(visible).toEqual({...snapshot,estado_programacao:state});expect((await publicQuery.list()).find(a=>a.id===id)).toEqual(visible);
 const events=(await db.query("select executada_por_conta_id,ocorrida_em,estado_anterior,estado_novo,justificativa_restrita from public.eventos_editoriais where objeto_id=$1 and acao='atividade_programacao_alterada'",[id])).rows;expect(events).toHaveLength(1);expect(events[0]).toMatchObject({estado_anterior:'programada',estado_novo:state});expect(events[0].ocorrida_em).toBeInstanceOf(Date);expect(events[0].executada_por_conta_id).toBeTruthy();expect(JSON.parse(events[0].justificativa_restrita).motivo).toBe(request.motivo);expect(JSON.stringify(visible)).not.toContain(request.motivo);
});
it('B10 PostgreSQL: concorrência, retries e cancelamento após adiamento não ressuscitam programação',async()=>{
 const {id}=await published(),request=scheduleCommand('adiada');const results=await Promise.all(Array.from({length:6},()=>services[2].schedule(id,request)));expect(results.filter(r=>!r.repetida)).toHaveLength(1);
 await expect(services[3].schedule(id,request)).rejects.toMatchObject({status:409});await expect(services[2].schedule(id,{...request,pedido_id:randomUUID()})).rejects.toMatchObject({status:409});
 await services[3].schedule(id,scheduleCommand('cancelada','adiada'));await expect(services[2].schedule(id,request)).rejects.toMatchObject({status:409});expect((await publicQuery.get(id)).estado_programacao).toBe('cancelada');
 expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_programacao_alterada'",[id])).rows[0].n).toBe(2);
});
it('B10 PostgreSQL: negativas sem evento para organização, visitante, editor bloqueado e retirada',async()=>{
 const {id}=await published(),request=scheduleCommand();for(const s of services.slice(0,2))await expect(s.schedule(id,request)).rejects.toMatchObject({status:403});await expect(createActivityService({verifyUser:async()=>null}).schedule(id,request)).rejects.toMatchObject({status:401});
 await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1",[users[2]]);try{await expect(services[2].schedule(id,request)).rejects.toMatchObject({status:403});}finally{await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1",[users[2]]);}
 await services[3].withdraw(id,{...command(),motivo:'Retirada fictícia anterior à programação.'});await expect(services[2].schedule(id,request)).rejects.toMatchObject({status:409});
 expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_programacao_alterada'",[id])).rows[0].n).toBe(0);
});
it('B10 PostgreSQL: erro de auditoria reverte estado e fechamento de apoios',async()=>{
 const {id,snapshot}=await published();await db.query('update public.atividades set apoios_abertos=true where id=$1',[id]);let code='';
 const fault:Transaction=op=>withTransaction(sql=>op({query:async(text:string,values?:unknown[])=>{const v=values?[...values]:undefined;if(text.includes('insert into public.eventos_editoriais')&&text.includes('atividade_programacao_alterada'))v![1]=randomUUID();try{return await sql.query(text,v);}catch(error){code=(error as {code:string}).code;throw error;}}} as Sql));
 const service=createActivityService({transaction:fault,verifyUser:async()=>(await clients[2].auth.getUser()).data.user});await expect(service.schedule(id,scheduleCommand())).rejects.toMatchObject({status:503});expect(code).toBe('23503');expect(await publicQuery.get(id)).toEqual(snapshot);expect((await db.query('select apoios_abertos from public.atividades where id=$1',[id])).rows[0].apoios_abertos).toBe(true);
});
it('B11 PostgreSQL: HTML é rejeitado antes de criar/editar/auditar e snapshot permanece íntegro',async()=>{
 const {id,snapshot}=await published();
 for(const attack of ['<script>window.xss=1</script>','<img src=x onerror=alert(1)>','<svg/onload=alert(1)>']){
  await expect(services[0].create({...input(),descricao:attack})).rejects.toMatchObject({status:422});
  await expect(services[0].update(id,{...input(),descricao:attack,versao_esperada:1})).rejects.toMatchObject({status:422});
  await expect(services[2].schedule(id,{...scheduleCommand(),motivo:attack})).rejects.toMatchObject({status:422});
 }
 expect(await publicQuery.get(id)).toEqual(snapshot);expect((await db.query('select versao_submetida from public.atividades where id=$1',[id])).rows[0].versao_submetida).toBe(1);
});
