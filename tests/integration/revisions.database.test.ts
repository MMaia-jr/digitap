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
async function publications(id:string){return Number((await db.query("select count(*) n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_publicada'",[id])).rows[0].n);}
beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures exigem autorização específica.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
 process.env.SUPABASE_DB_URL=local.DB_URL;db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<4;i++){
  const email=`revision-db-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';const c=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{papel:'administrador'}});if(c.error||!c.data.user)throw new Error('Fixture Auth falhou.');users.push(c.data.user.id);
  if(i<2){const r=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:users[i],p_nome_publico:'Organização Fictícia Publicação '+randomUUID(),p_canal_publico:null});if(r.error)throw new Error('Fixture organização falhou.');orgs.push(r.data);if(i===0)await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[r.data]);}
  else await db.query('insert into public.contas_acesso(auth_user_id,papel) values($1,$2)',[users[i],i===2?'editor':'administrador']);
  const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');clients.push(client);
  services.push(createActivityService({verifyUser:async()=>{const r=await client.auth.getUser();if(r.error)throw new Error('Auth indisponível.');return r.data.user;}}));
 }
},30000);
afterAll(async()=>{
 await closeDatabasePool();if(!db)return;await db.query('rollback');
 await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[auths]);await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))',[users]);await db.query('delete from public.sujeitos_publicadores where organizacao_legada_id=any($1::uuid[])',[orgs]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
 for(const client of clients)await client.auth.signOut({scope:'local'});for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');await db.end();
});

async function published(){const v=await approved();await services[2].publish(v.id,command());return {...v,snapshot:await publicQuery.get(v.id)};}
async function approveVersion(id:string,version:number){await services[0].submit(id,{versao_esperada:version});await services[2].review(id,{acao:'iniciar',estado_esperado:'enviada',...command(),versao_esperada:version});const auth=await authorization(id);await db.query('update public.autorizacoes_publicacao set escopo_autorizado=$2 where id=$1',[auth,['divulgacao','atividade:versao:'+version]]);return {acao:'aprovar',estado_esperado:'em_revisao',...command(),versao_esperada:version,autorizacao_id:auth};}
it('B08 RED real: edição cria versão pendente, mantém público anterior e aprovação substitui atomicamente',async()=>{
 const {id,snapshot}=await published();const changed={...input(),titulo:'PENDENTE_FICTICIO_'+randomUUID(),versao_esperada:1};const row=await services[0].update(id,changed);expect(row).toMatchObject({estado_editorial:'rascunho',versao_submetida:2});expect(await publicQuery.get(id)).toEqual(snapshot);
 const review=await approveVersion(id,2);expect(await publicQuery.get(id)).toEqual(snapshot);await services[2].review(id,review);const current=await publicQuery.get(id);expect(current.titulo).toBe(changed.titulo);expect(current.versao).toBe(2);expect((await services[0].get(id)).estado_editorial).toBe('publicada');
});
it('B09 RED real: retirada fecha apoios, oculta, audita motivo e bloqueia republicação',async()=>{
 const {id}=await published();await db.query('update public.atividades set apoios_abertos=true where id=$1',[id]);const request={...command(),motivo:'Retirada fictícia solicitada na revisão.'};await services[2].withdraw(id,request);await expect(publicQuery.get(id)).rejects.toMatchObject({status:404});expect((await publicQuery.list()).some(a=>a.id===id)).toBe(false);
 const row=(await db.query('select estado_editorial,apoios_abertos from public.atividades where id=$1',[id])).rows[0];expect(row).toEqual({estado_editorial:'retirada',apoios_abertos:false});const e=(await db.query("select executada_por_conta_id,ocorrida_em,justificativa_restrita from public.eventos_editoriais where objeto_id=$1 and acao='atividade_retirada'",[id])).rows[0];expect(e.executada_por_conta_id).toBeTruthy();expect(e.ocorrida_em).toBeInstanceOf(Date);expect(JSON.parse(e.justificativa_restrita).motivo).toBe(request.motivo);await expect(services[2].publish(id,command())).rejects.toMatchObject({status:409});
});
it('B08: isolamento, visitante, estado bloqueado e conflito não alteram snapshot',async()=>{
 const {id,snapshot}=await published();const payload={...input(),versao_esperada:1};await expect(services[1].update(id,payload)).rejects.toMatchObject({status:404});await expect(createActivityService({verifyUser:async()=>null}).update(id,payload)).rejects.toMatchObject({status:401});await expect(services[2].update(id,payload)).rejects.toMatchObject({status:403});
 const results=await Promise.allSettled([services[0].update(id,payload),services[0].update(id,payload)]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected'&&r.reason.status===409)).toHaveLength(1);expect(await publicQuery.get(id)).toEqual(snapshot);
});
it('B08: novas versões exigem nova autorização, preservam anterior em devolução/rejeição',async()=>{
 for(const action of ['devolver','rejeitar']){const {id,snapshot}=await published();await services[0].update(id,{...input(),versao_esperada:1});await approveVersion(id,2);await services[2].review(id,{acao:action,estado_esperado:'em_revisao',...command(),versao_esperada:2,motivo:'Motivo fictício privado da nova versão.'});expect(await publicQuery.get(id)).toEqual(snapshot);}
 const {id,auth,snapshot}=await published();await services[0].update(id,{...input(),versao_esperada:1});await approveVersion(id,2);await expect(services[2].review(id,{acao:'aprovar',estado_esperado:'em_revisao',...command(),versao_esperada:2,autorizacao_id:auth})).rejects.toMatchObject({status:422});expect(await publicQuery.get(id)).toEqual(snapshot);
});
it('B08: aprovação concorrente da revisão é idempotente e guarda snapshot anterior no histórico',async()=>{
 const {id,snapshot}=await published();await services[0].update(id,{...input(),versao_esperada:1});const review=await approveVersion(id,2);const results=await Promise.all(Array.from({length:6},()=>services[2].review(id,review)));expect(results.filter(r=>!r.repetida)).toHaveLength(1);expect(await publications(id)).toBe(2);
 const history=(await db.query("select justificativa_restrita from public.eventos_editoriais where objeto_id=$1 and acao='atividade_edicao_iniciada'",[id])).rows;expect(history).toHaveLength(1);expect(JSON.parse(history[0].justificativa_restrita).snapshot_anterior).toEqual(snapshot);expect((await publicQuery.get(id)).versao).toBe(2);
});
it.each(['edit','approval','withdraw'])('B08/B09: falha na auditoria de %s reverte operação inteira',async mode=>{
 const {id,snapshot}=await published();let review:Record<string,unknown>|undefined;if(mode==='approval'){await services[0].update(id,{...input(),versao_esperada:1});review=await approveVersion(id,2);}let code='';
 const fault:Transaction=op=>withTransaction(sql=>op({query:async(text:string,values?:unknown[])=>{try{const v=values?[...values]:undefined;const action=mode==='edit'?'atividade_edicao_iniciada':mode==='approval'?'atividade_publicada':'atividade_retirada';if(text.includes('insert into public.eventos_editoriais')&&text.includes(action))v![1]=randomUUID();return await sql.query(text,v);}catch(error){code=(error as {code:string}).code;throw error;}}} as Sql));
 const actor=mode==='edit'?0:2,service=createActivityService({transaction:fault,verifyUser:async()=>(await clients[actor].auth.getUser()).data.user});
 const operation=mode==='edit'?service.update(id,{...input(),versao_esperada:1}):mode==='approval'?service.review(id,review):service.withdraw(id,{...command(),motivo:'Motivo fictício para rollback.'});await expect(operation).rejects.toMatchObject({status:503});expect(code).toBe('23503');expect(await publicQuery.get(id)).toEqual(snapshot);expect((await services[0].get(id)).estado_editorial).toBe(mode==='approval'?'em_revisao':'publicada');expect(await publications(id)).toBe(1);
});
it('B09: visitante, organizações e editor bloqueado não retiram; payload forjado rejeitado',async()=>{
 const {id}=await published(),request={...command(),motivo:'Motivo fictício restrito.'};for(const s of services.slice(0,2))await expect(s.withdraw(id,request)).rejects.toMatchObject({status:403});await expect(createActivityService({verifyUser:async()=>null}).withdraw(id,request)).rejects.toMatchObject({status:401});await expect(services[2].withdraw(id,{...request,papel:'administrador'})).rejects.toMatchObject({status:400});await expect(services[2].withdraw(id,{...request,motivo:''})).rejects.toMatchObject({status:422});
 await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1",[users[2]]);try{await expect(services[2].withdraw(id,request)).rejects.toMatchObject({status:403});}finally{await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1",[users[2]]);}
});
it('B09: retirada concorrente é idempotente; motivo só para proprietário/editor, sem ressurreição',async()=>{
 const {id}=await published(),request={...command(),motivo:'Motivo fictício confidencial da retirada.'};const results=await Promise.all(Array.from({length:6},()=>services[3].withdraw(id,request)));expect(results.filter(r=>!r.repetida)).toHaveLength(1);expect((await services[0].get(id)).motivo_retirada).toBe(request.motivo);await expect(services[1].get(id)).rejects.toMatchObject({status:404});await expect(services[2].withdraw(id,request)).rejects.toMatchObject({status:409});await expect(services[3].withdraw(id,{...request,pedido_id:randomUUID()})).rejects.toMatchObject({status:409});await expect(services[0].update(id,{...input(),versao_esperada:1})).rejects.toMatchObject({status:409});await expect(services[0].submit(id,{versao_esperada:1})).rejects.toMatchObject({status:409});expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_retirada'",[id])).rows[0].n).toBe(1);
});
it('B09: retirar durante revisão oculta snapshot anterior e bloqueia aprovação concorrente',async()=>{
 const {id}=await published();await services[0].update(id,{...input(),versao_esperada:1});const review=await approveVersion(id,2);await services[3].withdraw(id,{...command(),versao_esperada:2,motivo:'Retirada fictícia durante revisão.'});await expect(services[2].review(id,review)).rejects.toMatchObject({status:409});await expect(publicQuery.get(id)).rejects.toMatchObject({status:404});expect(await publications(id)).toBe(1);
});
