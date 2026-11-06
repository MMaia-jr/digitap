import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {createActivityService} from '../../src/lib/activities/service.server';
import {createPublicRecords} from '../../src/lib/queries/records.server';
import {createPublicQueries} from '../../src/lib/queries/public.server';
import {withTransaction,closeDatabasePool,type Transaction,type Sql} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
let db:Client,admin:SupabaseClient;const users:string[]=[],orgs:string[]=[],auths:string[]=[],ids:string[]=[],clients:SupabaseClient[]=[];
const services:ReturnType<typeof createActivityService>[]=[],publicQuery=createPublicQueries();
const input=()=>({titulo:'Publicação Fictícia '+randomUUID(),descricao:'Descrição fictícia aprovada para publicação local.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Entrada fictícia de teste.',referencia_oficial:'https://example.invalid/atividade'});
const command=()=>({versao_esperada:1,pedido_id:randomUUID()});
beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures exigem autorização específica.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
 process.env.SUPABASE_DB_URL=local.DB_URL;db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<4;i++){
  const email=`record-editorial-db-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';const c=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{papel:'administrador'}});if(c.error||!c.data.user)throw new Error('Fixture Auth falhou.');users.push(c.data.user.id);
  if(i<2){const r=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:users[i],p_nome_publico:'Organização Fictícia Publicação '+randomUUID(),p_canal_publico:null});if(r.error)throw new Error('Fixture organização falhou.');orgs.push(r.data);if(i===0)await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[r.data]);}
  else await db.query('insert into public.contas_acesso(auth_user_id,papel) values($1,$2)',[users[i],i===2?'editor':'administrador']);
  const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');clients.push(client);
  services.push(createActivityService({verifyUser:async()=>{const r=await client.auth.getUser();if(r.error)throw new Error('Auth indisponível.');return r.data.user;}}));
 }
},30000);
afterAll(async()=>{
 await closeDatabasePool();if(!db)return;await db.query('rollback');
 await db.query("delete from public.eventos_editoriais where objeto_tipo='autorizacao' and objeto_id=any($1::uuid[])",[auths]);
 await db.query("delete from public.eventos_editoriais where objeto_tipo='registro' and objeto_id in (select id from public.registros_realizacao where atividade_id=any($1::uuid[]))",[ids]);
 await db.query('delete from public.evidencias where registro_id in (select id from public.registros_realizacao where atividade_id=any($1::uuid[]))',[ids]);
 await db.query('delete from public.registros_realizacao where atividade_id=any($1::uuid[])',[ids]);
 await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[auths]);await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))',[users]);await db.query('delete from public.sujeitos_publicadores where organizacao_legada_id=any($1::uuid[])',[orgs]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
 for(const client of clients)await client.auth.signOut({scope:'local'});for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');await db.end();
});

const recordCommand=()=>({...command(),data_realizacao:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()),descricao_factual:'Relato fictício de realização declarada.',origem_informacao:'Declaração da organização fictícia.'});
async function draft(){const row=await services[0].create(input());ids.push(row.id);return row;}
async function authorization(objectId:string,type='registro',scope=['registro_realizacao','registro:versao:1']){const id=randomUUID();await db.query("insert into public.autorizacoes_publicacao(id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em) values($1,$2,$3,$4,'Responsável fictício','Prova fictícia restrita',now()-interval '1 minute')",[id,type,objectId,scope]);auths.push(id);return id;}
async function record(){const activity=await draft();const row=await services[0].createRecord(activity.id,recordCommand());return {id:activity.id,recordId:row.id};}
async function transition(id:string,acao:string,estado:string,extra:Record<string,unknown>={},actor=2){const row=await services[actor].getRecord(id);const fn=Reflect.get(services[actor],'recordTransition');return fn(id,{acao,estado_esperado:estado,conteudo_esperado:row.conteudo_sha256,pedido_id:randomUUID(),...extra});}
async function inReview(id:string){await transition(id,'enviar','rascunho',{},0);await transition(id,'iniciar','enviada');}
it('C05 RED PostgreSQL: autorização do anúncio não aprova registro posterior',async()=>{
 const {id}=await record(),auth=await authorization(id,'atividade',['divulgacao','atividade:versao:1']);await inReview(id);
 await expect(transition(id,'aprovar','em_revisao',{autorizacao_id:auth,evidencias_aprovadas:[]})).rejects.toMatchObject({status:422});expect((await services[0].getRecord(id)).estado_editorial).toBe('em_revisao');
});
it('C05 RED PostgreSQL: autorização própria aprova sem publicar; publicação cria snapshot separado',async()=>{
 const {id,recordId}=await record(),auth=await authorization(recordId);await inReview(id);await transition(id,'aprovar','em_revisao',{autorizacao_id:auth,evidencias_aprovadas:[]});expect((await services[0].getRecord(id)).estado_editorial).toBe('aprovada');expect((await db.query('select versao_publicada from public.registros_realizacao where id=$1',[recordId])).rows[0].versao_publicada).toBeNull();
 await transition(id,'publicar','aprovada');const row=(await db.query('select estado_editorial,versao_publicada from public.registros_realizacao where id=$1',[recordId])).rows[0];expect(row.estado_editorial).toBe('publicada');expect(row.versao_publicada).toMatchObject({tipo:'registro-publico.v1',versao:1,estado_apuracao:'declarado',evidencias:[]});expect(JSON.stringify(row.versao_publicada)).not.toMatch(/Prova fictícia|autorizacao_id|executada_por/);
});
async function announce(id:string){await services[0].submit(id,{versao_esperada:1});await services[2].review(id,{...command(),acao:'iniciar',estado_esperado:'enviada'});const auth=await authorization(id,'atividade',['divulgacao','atividade:versao:1']);await services[2].review(id,{...command(),acao:'aprovar',estado_esperado:'em_revisao',autorizacao_id:auth});await services[2].publish(id,command());return auth;}
async function publishRecord(id:string,recordId:string,evidence:string[]=[]){const auth=await authorization(recordId);await inReview(id);await transition(id,'aprovar','em_revisao',{autorizacao_id:auth,evidencias_aprovadas:evidence});await transition(id,'publicar','aprovada');return auth;}
it('C05: público recebe só snapshot do registro e referências examinadas, sem prova/histórico',async()=>{
 const {id,recordId}=await record();await announce(id);const evidence=await services[0].addEvidence(id,{pedido_id:randomUUID(),tipo_fonte:'Fonte fictícia examinada',url_publica:'https://example.invalid/relato',afirmacao_sustentada:'A fonte sustenta somente a abertura fictícia.',consultada_em:new Date(Date.now()-60000).toISOString()});
 await services[0].addEvidence(id,{pedido_id:randomUUID(),tipo_fonte:'FONTE_PRIVADA_NAO_APROVADA',url_publica:'https://example.invalid/privada',afirmacao_sustentada:'Afirmação fictícia não aprovada para publicação.',consultada_em:new Date(Date.now()-60000).toISOString()});
 await publishRecord(id,recordId,[evidence.id]);const result=await createPublicRecords().get(id);expect(result.estado_apuracao).toBe('declarado');expect(result.evidencias).toHaveLength(1);expect(result.evidencias[0].id).toBe(evidence.id);expect(JSON.stringify(result)).not.toMatch(/Prova fictícia|autorizacao_id|FONTE_PRIVADA|pedido_id/);
});
it.each(['outro_objeto','sem_escopo','expirada','revogada','futura','sem_prova'])('C05: autorização %s não permite aprovação',async mode=>{
 const {id,recordId}=await record(),auth=await authorization(mode==='outro_objeto'?randomUUID():recordId);await inReview(id);
 const patches:Record<string,string>={sem_escopo:"escopo_autorizado=array['divulgacao']",expirada:"validade_ate=now()-interval '1 minute'",revogada:"situacao='revogada',revogada_em=now()",futura:"autorizada_em=now()+interval '1 hour'",sem_prova:"comprovante_restrito=''"};if(patches[mode])await db.query('update public.autorizacoes_publicacao set '+patches[mode]+' where id=$1',[auth]);
 await expect(transition(id,'aprovar','em_revisao',{autorizacao_id:auth,evidencias_aprovadas:[]})).rejects.toMatchObject({status:422});
});
it('C05: transições recusam visitante/organização, estado/hash/atributos forjados e referência de outro registro',async()=>{
 const {id,recordId}=await record(),auth=await authorization(recordId);await inReview(id);const state=await services[0].getRecord(id),body={pedido_id:randomUUID(),acao:'aprovar',estado_esperado:'em_revisao',conteudo_esperado:state.conteudo_sha256,autorizacao_id:auth,evidencias_aprovadas:[]};
 await expect(services[0].recordTransition(id,body)).rejects.toMatchObject({status:403});await expect(createActivityService({verifyUser:async()=>null}).recordTransition(id,body)).rejects.toMatchObject({status:401});await expect(services[2].recordTransition(id,{...body,conteudo_esperado:'a'.repeat(64)})).rejects.toMatchObject({status:409});await expect(services[2].recordTransition(id,{...body,organizacao_id:orgs[0]})).rejects.toMatchObject({status:400});await expect(services[2].recordTransition(id,{...body,evidencias_aprovadas:[randomUUID()]})).rejects.toMatchObject({status:422});
});
it('C05: publicação concorrente é idempotente; retry revalida autorização, hash e estado',async()=>{
 const {id,recordId}=await record(),auth=await authorization(recordId);await inReview(id);await transition(id,'aprovar','em_revisao',{autorizacao_id:auth,evidencias_aprovadas:[]});const state=await services[0].getRecord(id),body={pedido_id:randomUUID(),acao:'publicar',estado_esperado:'aprovada',conteudo_esperado:state.conteudo_sha256};const results=await Promise.all(Array.from({length:6},()=>services[2].recordTransition(id,body)));expect(results.filter(r=>!r.repetida)).toHaveLength(1);
 await db.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=now() where id=$1",[auth]);await expect(services[2].recordTransition(id,body)).rejects.toMatchObject({status:422});
});
it('C06 RED PostgreSQL: revogar autorização do registro oculta somente a publicação abrangida',async()=>{
 const {id,recordId}=await record();await announce(id);const auth=await publishRecord(id,recordId);expect((await createPublicRecords().get(id)).id).toBe(recordId);
 const revoke=Reflect.get(services[2],'revokeAuthorization');await revoke(id,{pedido_id:randomUUID(),autorizacao_id:auth,motivo:'Revogação fictícia específica do registro.'});
 await expect(createPublicRecords().get(id)).rejects.toMatchObject({status:404});expect((await publicQuery.get(id)).id).toBe(id);
});
it('C06 RED PostgreSQL: revogar autorização do anúncio fecha apoios e oculta publicação sem apagar snapshot',async()=>{
 const {id}=await record(),auth=await announce(id),before=(await db.query('select versao_publicada from public.atividades where id=$1',[id])).rows[0].versao_publicada;await db.query('update public.atividades set apoios_abertos=true where id=$1',[id]);
 const revoke=Reflect.get(services[2],'revokeAuthorization');await revoke(id,{pedido_id:randomUUID(),autorizacao_id:auth,motivo:'Revogação fictícia do anúncio.'});await expect(publicQuery.get(id)).rejects.toMatchObject({status:404});const row=(await db.query('select versao_publicada,apoios_abertos from public.atividades where id=$1',[id])).rows[0];expect(row).toEqual({versao_publicada:before,apoios_abertos:false});
});
it('C06: revogação concorrente gera um evento; permissões e vínculo são revalidados',async()=>{
 const {id}=await record(),auth=await announce(id),request={pedido_id:randomUUID(),autorizacao_id:auth,motivo:'Revogação fictícia restrita e idempotente.'};await expect(services[0].revokeAuthorization(id,request)).rejects.toMatchObject({status:403});await expect(createActivityService({verifyUser:async()=>null}).revokeAuthorization(id,request)).rejects.toMatchObject({status:401});const unrelated=await record();await expect(services[2].revokeAuthorization(unrelated.id,request)).rejects.toMatchObject({status:404});
 const results=await Promise.all(Array.from({length:6},()=>services[2].revokeAuthorization(id,request)));expect(results.filter(r=>!r.repetida)).toHaveLength(1);await expect(services[3].revokeAuthorization(id,request)).rejects.toMatchObject({status:409});await expect(services[2].revokeAuthorization(id,{...request,pedido_id:randomUUID()})).rejects.toMatchObject({status:409});
 const events=(await db.query("select executada_por_conta_id,ocorrida_em from public.eventos_editoriais where objeto_tipo='autorizacao' and objeto_id=$1",[auth])).rows;expect(events).toHaveLength(1);expect(events[0].ocorrida_em).toBeInstanceOf(Date);expect(events[0].executada_por_conta_id).toBeTruthy();
});
it('C06: falha de auditoria reverte revogação e fechamento de apoios',async()=>{
 const {id}=await record(),auth=await announce(id);await db.query('update public.atividades set apoios_abertos=true where id=$1',[id]);let code='';const fault:Transaction=op=>withTransaction(sql=>op({query:async(text:string,values?:unknown[])=>{const v=values?[...values]:undefined;if(text.includes('insert into public.eventos_editoriais')&&text.includes('autorizacao_revogada'))v![1]=randomUUID();try{return await sql.query(text,v);}catch(error){code=(error as {code:string}).code;throw error;}}} as Sql));
 await expect(createActivityService({transaction:fault,verifyUser:async()=>(await clients[2].auth.getUser()).data.user}).revokeAuthorization(id,{pedido_id:randomUUID(),autorizacao_id:auth,motivo:'Revogação fictícia para rollback.'})).rejects.toMatchObject({status:503});expect(code).toBe('23503');expect((await publicQuery.get(id)).id).toBe(id);expect((await db.query('select apoios_abertos from public.atividades where id=$1',[id])).rows[0].apoios_abertos).toBe(true);
});
it('C06: publicação concorrente à revogação não fica visível após confirmação da revogação',async()=>{
 const {id,recordId}=await record();await announce(id);const auth=await authorization(recordId);await inReview(id);await transition(id,'aprovar','em_revisao',{autorizacao_id:auth,evidencias_aprovadas:[]});const state=await services[0].getRecord(id);
 const results=await Promise.allSettled([services[2].recordTransition(id,{acao:'publicar',estado_esperado:'aprovada',conteudo_esperado:state.conteudo_sha256,pedido_id:randomUUID()}),services[3].revokeAuthorization(id,{autorizacao_id:auth,pedido_id:randomUUID(),motivo:'Revogação fictícia concorrente à publicação.'})]);expect(results[1].status).toBe('fulfilled');if(results[0].status==='rejected')expect(results[0].reason.status).toBe(422);await expect(createPublicRecords().get(id)).rejects.toMatchObject({status:404});
});
it('C07: todas as transições do registro geram evento restrito com autor/data/estados',async()=>{
 const {id,recordId}=await record(),auth=await authorization(recordId);await inReview(id);await transition(id,'aprovar','em_revisao',{autorizacao_id:auth,evidencias_aprovadas:[]});await transition(id,'publicar','aprovada');await transition(id,'retirar','publicada',{motivo:'Retirada fictícia do relato posterior.'});
 const events=(await db.query("select e.acao,e.estado_anterior,e.estado_novo,e.ocorrida_em,c.papel from public.eventos_editoriais e join public.contas_acesso c on c.id=e.executada_por_conta_id where e.objeto_tipo='registro' and e.objeto_id=$1 order by e.ocorrida_em",[recordId])).rows;
 expect(events.map(e=>e.acao)).toEqual(['registro_criado','registro_enviar','registro_iniciar','registro_aprovar','registro_publicar','registro_retirar']);for(const e of events)expect(e.ocorrida_em).toBeInstanceOf(Date);expect(events.slice(2).every(e=>e.papel==='editor')).toBe(true);expect(events.map(e=>e.estado_novo)).toEqual(['rascunho','enviada','em_revisao','aprovada','publicada','retirada']);
 for(const action of ['devolver','rejeitar']){const p=await record();await transition(p.id,'enviar','rascunho',{},0);await transition(p.id,action,'enviada',{motivo:'Motivo fictício restrito da decisão.'});expect((await db.query("select estado_anterior,estado_novo,executada_por_conta_id,ocorrida_em from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao=$2",[p.recordId,'registro_'+action])).rows[0]).toMatchObject({estado_anterior:'enviada',estado_novo:action==='devolver'?'devolvida':'rejeitada'});}
 expect(JSON.stringify(await services[0].getRecord(id))).not.toMatch(/justificativa_restrita|executada_por_conta_id|pedido_id/);
});
it.each(['enviar','iniciar','aprovar','publicar','retirar','devolver','rejeitar'])('C07: falha na auditoria de %s reverte estado, snapshot e aprovação de referências',async action=>{
 const {id,recordId}=await record(),auth=await authorization(recordId);let state='rascunho';if(action!=='enviar'){await transition(id,'enviar',state,{},0);state='enviada';}if(['aprovar','publicar','retirar'].includes(action)){await transition(id,'iniciar',state);state='em_revisao';}if(['publicar','retirar'].includes(action)){await transition(id,'aprovar',state,{autorizacao_id:auth,evidencias_aprovadas:[]});state='aprovada';}if(action==='retirar'){await transition(id,'publicar',state);state='publicada';}
 const before=(await db.query('select estado_editorial,versao_publicada,publicada_em from public.registros_realizacao where id=$1',[recordId])).rows[0],content=await services[0].getRecord(id);let code='';
 const fault:Transaction=op=>withTransaction(sql=>op({query:async(text:string,values?:unknown[])=>{const v=values?[...values]:undefined;if(text.includes('insert into public.eventos_editoriais')&&v?.[1]==='registro_'+action)v[2]=randomUUID();try{return await sql.query(text,v);}catch(error){code=(error as {code:string}).code;throw error;}}} as Sql));
 const actor=action==='enviar'?0:2,body={pedido_id:randomUUID(),acao:action,estado_esperado:state,conteudo_esperado:content.conteudo_sha256,...(action==='aprovar'?{autorizacao_id:auth,evidencias_aprovadas:[]}:['retirar','devolver','rejeitar'].includes(action)?{motivo:'Motivo fictício para rollback editorial.'}:{})};
 await expect(createActivityService({transaction:fault,verifyUser:async()=>(await clients[actor].auth.getUser()).data.user}).recordTransition(id,body)).rejects.toMatchObject({status:503});expect(code).toBe('23503');expect((await db.query('select estado_editorial,versao_publicada,publicada_em from public.registros_realizacao where id=$1',[recordId])).rows[0]).toEqual(before);
});
it('C08 RED PostgreSQL: contestação mantém relato/snapshot e divergência rastreável, sem afirmar consenso',async()=>{
 const {id,recordId}=await record();await announce(id);await publishRecord(id,recordId);const before=(await db.query('select descricao_factual,origem_informacao,versao_publicada from public.registros_realizacao where id=$1',[recordId])).rows[0],row=await services[0].getRecord(id),request={pedido_id:randomUUID(),conteudo_esperado:row.conteudo_sha256,divergencia:'DIVERGENCIA_FICTICIA_RESTRITA: a fonte não confirma todo o relato.',referencia_publica:'https://example.invalid/divergencia'};
 const contest=Reflect.get(services[0],'contestRecord');await contest(id,request);
 expect((await db.query('select descricao_factual,origem_informacao,versao_publicada from public.registros_realizacao where id=$1',[recordId])).rows[0]).toEqual(before);const after=await services[0].getRecord(id);expect(after.estado_apuracao).toBe('contestado');expect(after.contestacoes).toHaveLength(1);expect(after.contestacoes[0].divergencia).toBe(request.divergencia);const publicRecord=await createPublicRecords().get(id);expect(publicRecord.estado_apuracao).toBe('contestado');expect(JSON.stringify(publicRecord)).not.toContain('DIVERGENCIA_FICTICIA_RESTRITA');
});
it('C08: proprietário/editor podem registrar divergências distintas; outro tenant/visitante são negados',async()=>{
 const {id}=await record(),row=await services[0].getRecord(id),body={pedido_id:randomUUID(),conteudo_esperado:row.conteudo_sha256,divergencia:'Divergência fictícia preservada sem consenso.'};await expect(services[1].contestRecord(id,body)).rejects.toMatchObject({status:404});await expect(createActivityService({verifyUser:async()=>null}).contestRecord(id,body)).rejects.toMatchObject({status:401});
 const results=await Promise.all(Array.from({length:6},()=>services[0].contestRecord(id,body)));expect(results.filter(r=>!r.repetida)).toHaveLength(1);await expect(services[2].contestRecord(id,body)).rejects.toMatchObject({status:409});const after=await services[0].getRecord(id);await services[2].contestRecord(id,{pedido_id:randomUUID(),conteudo_esperado:after.conteudo_sha256,divergencia:'Outra divergência fictícia também preservada.'});expect((await services[0].getRecord(id)).contestacoes).toHaveLength(2);await expect(services[1].getRecord(id)).rejects.toMatchObject({status:404});
});
it('C08: falha na auditoria reverte estado contestado e não grava divergência',async()=>{
 const {id}=await record(),row=await services[0].getRecord(id);let code='';const fault:Transaction=op=>withTransaction(sql=>op({query:async(text:string,values?:unknown[])=>{const v=values?[...values]:undefined;if(text.includes('insert into public.eventos_editoriais')&&text.includes('registro_contestado'))v![1]=randomUUID();try{return await sql.query(text,v);}catch(error){code=(error as {code:string}).code;throw error;}}} as Sql));
 await expect(createActivityService({transaction:fault,verifyUser:async()=>(await clients[0].auth.getUser()).data.user}).contestRecord(id,{pedido_id:randomUUID(),conteudo_esperado:row.conteudo_sha256,divergencia:'Divergência fictícia para testar rollback.'})).rejects.toMatchObject({status:503});expect(code).toBe('23503');expect(await services[0].getRecord(id)).toMatchObject({estado_apuracao:'declarado',contestacoes:[]});
});
it('C08: contestação durante revisão bloqueia aprovação sem apagar relato e autoria',async()=>{
 const {id,recordId}=await record(),auth=await authorization(recordId);await inReview(id);const row=await services[0].getRecord(id);await services[0].contestRecord(id,{pedido_id:randomUUID(),conteudo_esperado:row.conteudo_sha256,divergencia:'Divergência fictícia durante revisão editorial.'});await expect(transition(id,'aprovar','em_revisao',{autorizacao_id:auth,evidencias_aprovadas:[]})).rejects.toMatchObject({status:409});expect((await services[0].getRecord(id)).descricao_factual).toBe(row.descricao_factual);
});
