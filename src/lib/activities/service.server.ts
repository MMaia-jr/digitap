import 'server-only';
import { ActivityError,validateDraft,validateVersion,validateReview,validateWithdrawal,validateScheduling,validateRecord,validateEvidence,objectInput,type PrivateActivity,type ReviewAction } from './domain';
import { withTransaction,type Transaction,type Sql } from '../database.server';
import { authorize,AccessError,type AccessAccount,type VerifiedUser } from '../auth/permissions.server';
import { userClient } from '../supabase/server';
import { adminClient } from '../supabase/admin.server';
import { createGateway } from '../auth/gateway.server';
import { handleMutation,privateHeaders } from '../auth/http.server';
import { FlowError } from '../auth/flow.server';
import { appOrigin } from '../supabase/config.server';
import {validatePublish,createSnapshot,parseSnapshot} from './publication';
import {requireVersionAuthorization as requireAuthorization,approvalForVersion,publicationRecord,snapshotHash,approvedContentHash} from './publication.server';
const columns='id,titulo,descricao,inicio_previsto,orientacao_acesso,referencia_oficial,estado_editorial,versao_submetida,numero_versao_publicada,estado_programacao';
const privateStates="('rascunho','enviada','em_revisao','aprovada','devolvida','rejeitada','publicada','retirada')";
type Row=Omit<PrivateActivity,'inicio_previsto'> & {inicio_previsto:Date|string};
type Actor=AccessAccount & {id:string};
const dto=(row:Row):PrivateActivity=>({...row,inicio_previsto:row.inicio_previsto instanceof Date?row.inicio_previsto.toISOString():row.inicio_previsto});
const unavailable=()=>new ActivityError(503,'Serviço indisponível. Tente novamente.');
function identifier(value:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new ActivityError(404,'Atividade não encontrada.');return value;}
async function verifiedUser(){return createGateway(await userClient(),adminClient,()=>{}).currentUser();}
export function createActivityService(deps:{verifyUser?:()=>Promise<VerifiedUser|null>;transaction?:Transaction;now?:()=>Date}={}){
 const verifyUser=deps.verifyUser??verifiedUser,transaction=deps.transaction??withTransaction,now=deps.now??(()=>new Date());
 async function run<T>(mode:'organizacao'|'leitura'|'editorial',operation:(sql:Sql,actor:Actor)=>Promise<T>):Promise<T>{
  try{
   const user=await verifyUser();if(!user?.id)throw new ActivityError(401,'Autenticação necessária.');if(!user.email_confirmed_at)throw new ActivityError(403,'Confirme seu e-mail.');
   return await transaction(async sql=>{
    const actor=(await sql.query<Actor>('select id,auth_user_id,organizacao_id,papel,situacao from public.contas_acesso where auth_user_id=$1 for share',[user.id])).rows[0];
    const editorial=mode==='editorial'||mode==='leitura'&&actor&&['editor','administrador'].includes(actor.papel);
    await authorize({verifyUser:async()=>user,findAccount:async()=>actor??null},editorial?{action:'editorial'}:{action:'organizacao',organizationId:actor?.organizacao_id??''});
    if(!editorial){const org=(await sql.query<{estado_validacao:string}>('select estado_validacao from public.organizacoes where id=$1 for share',[actor.organizacao_id])).rows[0];if(!org||org.estado_validacao==='suspensa')throw new ActivityError(403,'Acesso indisponível para esta organização.');}
    return operation(sql,actor);
   });
  }catch(error){if(error instanceof ActivityError)throw error;if(error instanceof AccessError)throw new ActivityError(error.status,error.message);throw unavailable();}
 }
 async function load(sql:Sql,actor:Actor,id:string,write=false){
  const owner=actor.papel==='organizacao'?actor.organizacao_id:null;
  const result=await sql.query<Row>(`select ${columns} from public.atividades where id=$1 and ($2::uuid is null or organizacao_id = $2) and estado_editorial in ${privateStates}${write?' for update':''}`,[identifier(id),owner]);
  if(!result.rows[0])throw new ActivityError(404,'Atividade não encontrada.');return dto(result.rows[0]);
 }
 async function publishApproved(sql:Sql,actor:Actor,row:PrivateActivity,command:{pedido_id:string;versao_esperada:number},automatic=false){
    const stored=(await sql.query<{organizacao_id:string;estado_programacao:string;versao_publicada:unknown;numero_versao_publicada:number|null;publicada_em:Date|null}>('select organizacao_id,estado_programacao,versao_publicada,numero_versao_publicada,publicada_em from public.atividades where id=$1',[row.id])).rows[0];
    const org=(await sql.query<{id:string;nome_publico:string;estado_validacao:string}>('select id,nome_publico,estado_validacao from public.organizacoes where id=$1 for share',[stored.organizacao_id])).rows[0];
    if(!org||org.estado_validacao!=='validada')throw new ActivityError(422,'Organização não está validada e apta à publicação.');
    const publishedSnapshot=row.estado_editorial==='publicada'?parseSnapshot(stored.versao_publicada):null;
    const approval=await approvalForVersion(sql,publishedSnapshot?{...publishedSnapshot,versao_submetida:publishedSnapshot.versao}:row);await requireAuthorization(sql,row,approval.authorization_id);
    if(row.estado_editorial==='publicada'){
     const event=await publicationRecord(sql,row.id,row.versao_submetida),snapshot=parseSnapshot(stored.versao_publicada);
     if(event.author!==actor.id||event.pedido_id!==command.pedido_id||event.versao_esperada!==command.versao_esperada||event.autorizacao_id!==approval.authorization_id||event.aprovacao_evento_id!==approval.event_id||snapshot.id!==row.id||snapshot.versao!==stored.numero_versao_publicada||event.snapshot_sha256!==snapshotHash(snapshot))throw new ActivityError(409,'Publicação já concluída ou inconsistente.');
     return {...row,repetida:true};
    }
    if(stored.numero_versao_publicada!==null){
     if(!automatic||stored.numero_versao_publicada>=row.versao_submetida)throw new ActivityError(409,'Nova publicação exige aprovação de uma nova versão.');
     const prior=parseSnapshot(stored.versao_publicada),event=await publicationRecord(sql,row.id,prior.versao);
     if(prior.versao!==stored.numero_versao_publicada||event.snapshot_sha256!==snapshotHash(prior))throw new ActivityError(409,'Snapshot anterior inconsistente.');
    }else if(stored.versao_publicada!==null||stored.publicada_em!==null)throw new ActivityError(409,'Publicação inconsistente.');
    const timestamp=now(),snapshot=createSnapshot(row,org,stored.estado_programacao,timestamp,timestamp);
    const published=dto((await sql.query<Row>(`update public.atividades set versao_publicada=$2::jsonb,numero_versao_publicada=$3,publicada_em=$4,estado_editorial='publicada',apoios_abertos=false,atualizada_em=clock_timestamp() where id=$1 returning ${columns}`,[row.id,JSON.stringify(snapshot),row.versao_submetida,timestamp.toISOString()])).rows[0]);
    const metadata=JSON.stringify({tipo:'publicacao.v1',...command,autorizacao_id:approval.authorization_id,aprovacao_evento_id:approval.event_id,snapshot_sha256:snapshotHash(snapshot),snapshot});
    await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('atividade',$1,'atividade_publicada',$2,'aprovada','publicada',$3)",[row.id,actor.id,metadata]);
    return {...published,repetida:false};
 }
 return {
  async addEvidence(id:string,input:unknown){
   const command=validateEvidence(input,now()),metadata=JSON.stringify({tipo:'evidencia.v1',...command});
   return run('organizacao',async(sql,actor)=>{
    const activity=await load(sql,actor,id,true);
    const record=(await sql.query<{id:string;estado_editorial:string}>("select id,estado_editorial from public.registros_realizacao where atividade_id=$1",[activity.id])).rows[0];
    if(!record)throw new ActivityError(404,'Registro não encontrado.');if(record.estado_editorial!=='rascunho')throw new ActivityError(409,'Registro não permite novas referências neste estado.');
    const history=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao='evidencia_referenciada'",[record.id])).rows;
    const previous=history.find(e=>{try{return JSON.parse(e.justificativa_restrita).pedido_id===command.pedido_id;}catch{return false;}});
    if(previous){const {evidencia_id,...core}=JSON.parse(previous.justificativa_restrita);if(previous.executada_por_conta_id!==actor.id||JSON.stringify(core)!==metadata)throw new ActivityError(409,'Identificador de pedido já utilizado.');return {...(await sql.query('select id,tipo_fonte,url_publica,afirmacao_sustentada,consultada_em,aprovada_publicacao from public.evidencias where id=$1 and registro_id=$2',[evidencia_id,record.id])).rows[0],repetida:true};}
    const evidence=(await sql.query('insert into public.evidencias(registro_id,tipo_fonte,url_publica,afirmacao_sustentada,consultada_em) values($1,$2,$3,$4,$5) returning id,tipo_fonte,url_publica,afirmacao_sustentada,consultada_em,aprovada_publicacao',[record.id,command.tipo_fonte,command.url_publica,command.afirmacao_sustentada,command.consultada_em])).rows[0];
    await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('registro',$1,'evidencia_referenciada',$2,'rascunho','rascunho',$3)",[record.id,actor.id,JSON.stringify({...JSON.parse(metadata),evidencia_id:evidence.id})]);
    return {...evidence,repetida:false};
   });
  },
  async createRecord(id:string,input:unknown){
   const command=validateRecord(input,now()),metadata=JSON.stringify({tipo:'registro-criacao.v1',...command});
   return run('organizacao',async(sql,actor)=>{
    const activity=await load(sql,actor,id,true);
    if(activity.versao_submetida!==command.versao_esperada)throw new ActivityError(409,'A versão mudou. Recarregue antes de registrar.');
    const existing=(await sql.query("select id,data_realizacao::text as data_realizacao,descricao_factual,origem_informacao,estado_apuracao,estado_editorial from public.registros_realizacao where atividade_id=$1",[activity.id])).rows[0];
    if(existing){
     const event=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao='registro_criado'",[existing.id])).rows;
     if(event.length!==1||event[0].executada_por_conta_id!==actor.id||event[0].justificativa_restrita!==metadata)throw new ActivityError(409,'Já existe registro para esta atividade.');
     return {...existing,repetida:true};
    }
    const record=(await sql.query("insert into public.registros_realizacao(atividade_id,data_realizacao,descricao_factual,origem_informacao) values($1,$2,$3,$4) returning id,data_realizacao::text as data_realizacao,descricao_factual,origem_informacao,estado_apuracao,estado_editorial",[activity.id,command.data_realizacao,command.descricao_factual,command.origem_informacao])).rows[0];
    await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('registro',$1,'registro_criado',$2,null,'rascunho',$3)",[record.id,actor.id,metadata]);
    return {...record,repetida:false};
   });
  },
  async getRecord(id:string){return run('leitura',async(sql,actor)=>{
   const activity=await load(sql,actor,id);
   const record=(await sql.query('select id,data_realizacao::text as data_realizacao,descricao_factual,origem_informacao,estado_apuracao,estado_editorial from public.registros_realizacao where atividade_id=$1',[activity.id])).rows[0];
   if(!record)throw new ActivityError(404,'Registro não encontrado.');
   const evidencias=(await sql.query('select id,tipo_fonte,url_publica,afirmacao_sustentada,consultada_em,aprovada_publicacao from public.evidencias where registro_id=$1 order by consultada_em,id',[record.id])).rows;
   return {...record,evidencias};
  });},
  async schedule(id:string,input:unknown){
   const command=validateScheduling(input),metadata=JSON.stringify({tipo:'programacao.v1',...command});
   return run('editorial',async(sql,actor)=>{
    const row=await load(sql,actor,id,true);
    if(row.versao_submetida!==command.versao_esperada||row.estado_editorial==='retirada'||!row.numero_versao_publicada)throw new ActivityError(409,'Estado ou versão não permite alterar a programação.');
    const stored=(await sql.query<{estado_programacao:string}>('select estado_programacao from public.atividades where id=$1',[row.id])).rows[0];
    const history=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and acao='atividade_programacao_alterada'",[row.id])).rows;
    const previous=history.find(e=>{try{return JSON.parse(e.justificativa_restrita).pedido_id===command.pedido_id;}catch{return false;}});
    if(previous){if(previous.executada_por_conta_id!==actor.id||previous.justificativa_restrita!==metadata||stored.estado_programacao!==command.estado_programacao)throw new ActivityError(409,'Identificador de pedido já utilizado.');return {...row,estado_programacao:stored.estado_programacao,repetida:true};}
    if(stored.estado_programacao!==command.estado_esperado)throw new ActivityError(409,'A programação mudou. Recarregue antes de continuar.');
    await sql.query('update public.atividades set estado_programacao=$2,apoios_abertos=false,atualizada_em=clock_timestamp() where id=$1',[row.id,command.estado_programacao]);
    await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('atividade',$1,'atividade_programacao_alterada',$2,$3,$4,$5)",[row.id,actor.id,stored.estado_programacao,command.estado_programacao,metadata]);
    return {...row,estado_programacao:command.estado_programacao,repetida:false};
   });
  },
  async create(input:unknown){
   const value=validateDraft(input,now());
   return run('organizacao',async(sql,actor)=>{
    const row=(await sql.query<Row>(`insert into public.atividades (organizacao_id,criada_por_conta_id,titulo,descricao,inicio_previsto,orientacao_acesso,referencia_oficial) values($1,$2,$3,$4,$5,$6,$7) returning ${columns}`,[actor.organizacao_id,actor.id,value.titulo,value.descricao,value.inicio_previsto,value.orientacao_acesso,value.referencia_oficial])).rows[0];return dto(row);
   });
  },
  async list(){return run('organizacao',async(sql,actor)=>(await sql.query<Row>(`select ${columns} from public.atividades where organizacao_id=$1 and estado_editorial in ${privateStates} order by criada_em desc limit 100`,[actor.organizacao_id])).rows.map(dto));},
  async reviewQueue(){return run('editorial',async sql=>(await sql.query<Row>(`select ${columns} from public.atividades where estado_editorial in ('enviada','em_revisao','aprovada') order by criada_em limit 100`)).rows.map(dto));},
  async get(id:string){return run('leitura',async(sql,actor)=>{
   const activity=await load(sql,actor,id);
   if(activity.estado_editorial==='devolvida'||activity.estado_editorial==='rejeitada'){
    const event=(await sql.query<{justificativa_restrita:string}>("select justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and estado_novo=$2 and acao like 'atividade_revisao_%' order by ocorrida_em desc,id desc limit 1",[activity.id,activity.estado_editorial])).rows[0];
    let meta;try{meta=JSON.parse(event?.justificativa_restrita??'');}catch{throw unavailable();}
    if(meta.tipo!=='revisao.v1'||meta.versao_esperada!==activity.versao_submetida||typeof meta.motivo!=='string')throw unavailable();
    activity.motivo_editorial=meta.motivo;
   }
   if(activity.estado_editorial==='retirada'){
    const event=(await sql.query<{justificativa_restrita:string}>("select justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and acao='atividade_retirada' order by ocorrida_em desc limit 1",[activity.id])).rows[0];
    let meta;try{meta=JSON.parse(event?.justificativa_restrita??'');}catch{throw unavailable();}
    if(meta.tipo!=='retirada.v1'||typeof meta.motivo!=='string')throw unavailable();activity.motivo_retirada=meta.motivo;
   }
   const editorial=['editor','administrador'].includes(actor.papel);
   return {...activity,pode_editar:actor.papel==='organizacao'&&['rascunho','publicada'].includes(activity.estado_editorial),acesso_editorial:editorial,pode_revisar:editorial&&['enviada','em_revisao'].includes(activity.estado_editorial),pode_publicar:editorial&&activity.estado_editorial==='aprovada',tem_publicacao:!!activity.numero_versao_publicada,pode_alterar_programacao:editorial&&!!activity.numero_versao_publicada&&activity.estado_editorial!=='retirada'&&['programada','adiada'].includes(activity.estado_programacao??''),pode_retirar:editorial&&!!activity.numero_versao_publicada&&activity.estado_editorial!=='retirada'};
  });},
  async update(id:string,input:unknown){
   const body=objectInput(input,['titulo','descricao','inicio_previsto','orientacao_acesso','referencia_oficial','versao_esperada']);const version=validateVersion(body.versao_esperada);
   const {versao_esperada:ignored,...content}=body;void ignored;const value=validateDraft(content,now());
   return run('organizacao',async(sql,actor)=>{
    const row=await load(sql,actor,id,true);if(!['rascunho','publicada'].includes(row.estado_editorial)||row.versao_submetida!==version)throw new ActivityError(409,'A atividade mudou. Recarregue antes de continuar.');
    const archive=(await sql.query<{versao_publicada:unknown;numero_versao_publicada:number|null}>('select versao_publicada,numero_versao_publicada from public.atividades where id=$1',[row.id])).rows[0];
    const updated=dto((await sql.query<Row>(`update public.atividades set titulo=$2,descricao=$3,inicio_previsto=$4,orientacao_acesso=$5,referencia_oficial=$6,versao_submetida = versao_submetida + 1,estado_editorial='rascunho',atualizada_em=clock_timestamp() where id=$1 returning ${columns}`,[row.id,value.titulo,value.descricao,value.inicio_previsto,value.orientacao_acesso,value.referencia_oficial])).rows[0]);
    if(archive?.numero_versao_publicada){const metadata=JSON.stringify({tipo:'edicao.v1',versao_anterior:version,versao_nova:updated.versao_submetida,snapshot_anterior:archive.versao_publicada});
     await sql.query(`insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('atividade',$1,'atividade_edicao_iniciada',$2,$3,'rascunho',$4)`,[row.id,actor.id,row.estado_editorial,metadata]);}
    return updated;
   });
  },
  async submit(id:string,input:unknown){
   const body=objectInput(input,['versao_esperada']);const version=validateVersion(body.versao_esperada);
   return run('organizacao',async(sql,actor)=>{
    const row=await load(sql,actor,id,true);if(row.versao_submetida!==version)throw new ActivityError(409,'A atividade mudou. Recarregue antes de continuar.');
    if(row.estado_editorial==='enviada')return row;
    if(row.estado_editorial!=='rascunho')throw new ActivityError(409,'Esta atividade não pode ser enviada neste estado.');
    validateDraft({titulo:row.titulo,descricao:row.descricao,inicio_previsto:row.inicio_previsto,orientacao_acesso:row.orientacao_acesso,referencia_oficial:row.referencia_oficial},now());
    const sent=dto((await sql.query<Row>(`update public.atividades set estado_editorial='enviada',atualizada_em=clock_timestamp() where id=$1 returning ${columns}`,[row.id])).rows[0]);
    await sql.query("insert into public.eventos_editoriais (objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo) values('atividade',$1,'atividade_enviada',$2,'rascunho','enviada')",[row.id,actor.id]);return sent;
   });
  },
  async review(id:string,input:unknown){
   const command=validateReview(input);const metadata=JSON.stringify({tipo:'revisao.v1',...command});
   return run('editorial',async(sql,actor)=>{
    const row=await load(sql,actor,id,true);
    if(row.versao_submetida!==command.versao_esperada)throw new ActivityError(409,'A versão mudou. Recarregue antes de revisar.');
    const history=(await sql.query<{executada_por_conta_id:string|null;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and acao like 'atividade_revisao_%'",[row.id])).rows;
    const previous=history.find(event=>{try{const meta=JSON.parse(event.justificativa_restrita);return meta.tipo==='revisao.v1'&&meta.pedido_id===command.pedido_id;}catch{return false;}});
    if(previous){const {conteudo_sha256:ignored,...core}=JSON.parse(previous.justificativa_restrita);void ignored;if(previous.executada_por_conta_id!==actor.id||JSON.stringify(core)!==metadata)throw new ActivityError(409,'Identificador de pedido já utilizado.');if(command.acao==='aprovar')await requireAuthorization(sql,row,command.autorizacao_id);return {...row,repetida:true};}
    const transitions:Record<ReviewAction,{from:string[];to:PrivateActivity['estado_editorial']}>= {iniciar:{from:['enviada'],to:'em_revisao'},aprovar:{from:['em_revisao'],to:'aprovada'},devolver:{from:['enviada','em_revisao'],to:'devolvida'},rejeitar:{from:['enviada','em_revisao'],to:'rejeitada'}};
    const transition=transitions[command.acao];
    if(row.estado_editorial!==command.estado_esperado||!transition.from.includes(row.estado_editorial))throw new ActivityError(409,'O estado mudou ou não permite esta decisão.');
    if(command.acao==='aprovar')await requireAuthorization(sql,row,command.autorizacao_id);
    const result=dto((await sql.query<Row>(`update public.atividades set estado_editorial=$2,atualizada_em=clock_timestamp() where id=$1 returning ${columns}`,[row.id,transition.to])).rows[0]);
    const auditMetadata=command.acao==='aprovar'?JSON.stringify({...JSON.parse(metadata),conteudo_sha256:approvedContentHash(row)}):metadata;
    await sql.query("insert into public.eventos_editoriais (objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('atividade',$1,$2,$3,$4,$5,$6)",[row.id,'atividade_revisao_'+transition.to,actor.id,row.estado_editorial,transition.to,auditMetadata]);
    if(command.acao==='aprovar'&&row.numero_versao_publicada)return publishApproved(sql,actor,result,command,true);
    return {...result,repetida:false};
   });
  },
  async withdraw(id:string,input:unknown){
   const command=validateWithdrawal(input),metadata=JSON.stringify({tipo:'retirada.v1',...command});
   return run('editorial',async(sql,actor)=>{
    const row=await load(sql,actor,id,true);if(row.versao_submetida!==command.versao_esperada)throw new ActivityError(409,'A versão mudou. Recarregue antes de retirar.');
    const history=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and acao='atividade_retirada'",[row.id])).rows;
    const previous=history.find(e=>{try{return JSON.parse(e.justificativa_restrita).pedido_id===command.pedido_id;}catch{return false;}});
    if(previous){if(row.estado_editorial!=='retirada'||previous.executada_por_conta_id!==actor.id||previous.justificativa_restrita!==metadata)throw new ActivityError(409,'Identificador de pedido já utilizado.');return {...row,repetida:true};}
    if(!row.numero_versao_publicada||row.estado_editorial==='retirada')throw new ActivityError(409,'Não há publicação disponível para retirar.');
    const result=dto((await sql.query<Row>(`update public.atividades set estado_editorial='retirada',apoios_abertos=false,atualizada_em=clock_timestamp() where id=$1 returning ${columns}`,[row.id])).rows[0]);
    await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('atividade',$1,'atividade_retirada',$2,$3,'retirada',$4)",[row.id,actor.id,row.estado_editorial,metadata]);return {...result,repetida:false};
   });
  },
  async publish(id:string,input:unknown){
   const command=validatePublish(input);
   return run('editorial',async(sql,actor)=>{
    const row=await load(sql,actor,id,true);
    if(row.versao_submetida!==command.versao_esperada||!['aprovada','publicada'].includes(row.estado_editorial))throw new ActivityError(409,'Estado ou versão não permite publicação.');
    return publishApproved(sql,actor,row,command);
   });
  },
 };
}
export const activities=createActivityService();
export async function activityResponse(operation:()=>Promise<unknown>){
 try{return Response.json(await operation(),{headers:privateHeaders});}catch(error){return Response.json({message:error instanceof ActivityError?error.message:'Serviço indisponível. Tente novamente.'},{status:error instanceof ActivityError?error.status:503,headers:privateHeaders});}
}
export async function activityMutation(request:Request,action:'create'|'update'|'submit'|'review'|'publish'|'withdraw'|'schedule'|'createRecord'|'addEvidence',id?:string){
 // Route exports limit methods. Normalize PATCH only for reuse of the existing
 // JSON/origin/payload boundary; the original method is still PATCH over HTTP.
 return handleMutation(request.method==='PATCH'?new Request(request,{method:'POST'}):request,appOrigin(),async input=>{
  try{
   if(action==='addEvidence'){const evidencia=await activities.addEvidence(id!,input);return {message:'Referência privada registrada.',evidencia,next:'/dashboard/atividade/'+id};}
   if(action==='createRecord'){const registro=await activities.createRecord(id!,input);return {message:'Declaração privada registrada.',registro,next:'/dashboard/atividade/'+id};}
   const activity=action==='schedule'?await activities.schedule(id!,input):action==='create'?await activities.create(input):action==='update'?await activities.update(id!,input):action==='review'?await activities.review(id!,input):action==='publish'?await activities.publish(id!,input):action==='withdraw'?await activities.withdraw(id!,input):await activities.submit(id!,input);
   return {message:action==='schedule'?'Programação atualizada.':action==='withdraw'?'Publicação retirada.':action==='publish'?'Snapshot da versão aprovada publicado.':action==='review'?'Decisão editorial registrada.':action==='submit'?'Atividade enviada. Ela continua privada.':'Rascunho salvo.',atividade:activity,next:'/dashboard/atividade/'+activity.id};
  }catch(error){if(error instanceof ActivityError)throw new FlowError(error.status,error.message,error.fields);throw error;}
 });
}
