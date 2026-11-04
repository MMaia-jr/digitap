import 'server-only';
import { ActivityError,validateDraft,validateVersion,validateReview,objectInput,type PrivateActivity,type ReviewAction } from './domain';
import { withTransaction,type Transaction,type Sql } from '../database.server';
import { authorize,AccessError,type AccessAccount,type VerifiedUser } from '../auth/permissions.server';
import { userClient } from '../supabase/server';
import { adminClient } from '../supabase/admin.server';
import { createGateway } from '../auth/gateway.server';
import { handleMutation,privateHeaders } from '../auth/http.server';
import { FlowError } from '../auth/flow.server';
import { appOrigin } from '../supabase/config.server';
const columns='id,titulo,descricao,inicio_previsto,orientacao_acesso,referencia_oficial,estado_editorial,versao_submetida';
const privateStates="('rascunho','enviada','em_revisao','aprovada','devolvida','rejeitada')";
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
 async function requireAuthorization(sql:Sql,row:PrivateActivity,authorizationId:string|null){
  const authorized=await sql.query<{id:string}>("select id from public.autorizacoes_publicacao where id=$1 and objeto_tipo='atividade' and objeto_id=$2 and situacao='vigente' and revogada_em is null and autorizada_em<=clock_timestamp() and (validade_ate is null or validade_ate>clock_timestamp()) and 'divulgacao'=any(escopo_autorizado) and $3=any(escopo_autorizado) and char_length(trim(papel_autorizante))>0 and char_length(trim(comprovante_restrito))>0 for share",[authorizationId,row.id,'atividade:versao:'+row.versao_submetida]);
  if(!authorized.rows[0])throw new ActivityError(422,'Autorização indisponível ou incompatível com esta atividade e versão.');
 }
 return {
  async create(input:unknown){
   const value=validateDraft(input,now());
   return run('organizacao',async(sql,actor)=>{
    const row=(await sql.query<Row>(`insert into public.atividades (organizacao_id,criada_por_conta_id,titulo,descricao,inicio_previsto,orientacao_acesso,referencia_oficial) values($1,$2,$3,$4,$5,$6,$7) returning ${columns}`,[actor.organizacao_id,actor.id,value.titulo,value.descricao,value.inicio_previsto,value.orientacao_acesso,value.referencia_oficial])).rows[0];return dto(row);
   });
  },
  async list(){return run('organizacao',async(sql,actor)=>(await sql.query<Row>(`select ${columns} from public.atividades where organizacao_id=$1 and estado_editorial in ${privateStates} order by criada_em desc limit 100`,[actor.organizacao_id])).rows.map(dto));},
  async reviewQueue(){return run('editorial',async sql=>(await sql.query<Row>(`select ${columns} from public.atividades where estado_editorial in ('enviada','em_revisao') order by criada_em limit 100`)).rows.map(dto));},
  async get(id:string){return run('leitura',async(sql,actor)=>{
   const activity=await load(sql,actor,id);
   if(activity.estado_editorial==='devolvida'||activity.estado_editorial==='rejeitada'){
    const event=(await sql.query<{justificativa_restrita:string}>("select justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and estado_novo=$2 and acao like 'atividade_revisao_%' order by ocorrida_em desc,id desc limit 1",[activity.id,activity.estado_editorial])).rows[0];
    let meta;try{meta=JSON.parse(event?.justificativa_restrita??'');}catch{throw unavailable();}
    if(meta.tipo!=='revisao.v1'||meta.versao_esperada!==activity.versao_submetida||typeof meta.motivo!=='string')throw unavailable();
    activity.motivo_editorial=meta.motivo;
   }
   const editorial=['editor','administrador'].includes(actor.papel);
   return {...activity,pode_editar:actor.papel==='organizacao'&&activity.estado_editorial==='rascunho',acesso_editorial:editorial,pode_revisar:editorial&&['enviada','em_revisao'].includes(activity.estado_editorial)};
  });},
  async update(id:string,input:unknown){
   const body=objectInput(input,['titulo','descricao','inicio_previsto','orientacao_acesso','referencia_oficial','versao_esperada']);const version=validateVersion(body.versao_esperada);
   const {versao_esperada:ignored,...content}=body;void ignored;const value=validateDraft(content,now());
   return run('organizacao',async(sql,actor)=>{
    const row=await load(sql,actor,id,true);if(row.estado_editorial!=='rascunho'||row.versao_submetida!==version)throw new ActivityError(409,'A atividade mudou. Recarregue antes de continuar.');
    return dto((await sql.query<Row>(`update public.atividades set titulo=$2,descricao=$3,inicio_previsto=$4,orientacao_acesso=$5,referencia_oficial=$6,versao_submetida = versao_submetida + 1,atualizada_em=clock_timestamp() where id=$1 returning ${columns}`,[row.id,value.titulo,value.descricao,value.inicio_previsto,value.orientacao_acesso,value.referencia_oficial])).rows[0]);
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
    if(previous){if(previous.executada_por_conta_id!==actor.id||previous.justificativa_restrita!==metadata)throw new ActivityError(409,'Identificador de pedido já utilizado.');if(command.acao==='aprovar')await requireAuthorization(sql,row,command.autorizacao_id);return {...row,repetida:true};}
    const transitions:Record<ReviewAction,{from:string[];to:PrivateActivity['estado_editorial']}>= {iniciar:{from:['enviada'],to:'em_revisao'},aprovar:{from:['em_revisao'],to:'aprovada'},devolver:{from:['enviada','em_revisao'],to:'devolvida'},rejeitar:{from:['enviada','em_revisao'],to:'rejeitada'}};
    const transition=transitions[command.acao];
    if(row.estado_editorial!==command.estado_esperado||!transition.from.includes(row.estado_editorial))throw new ActivityError(409,'O estado mudou ou não permite esta decisão.');
    if(command.acao==='aprovar')await requireAuthorization(sql,row,command.autorizacao_id);
    const result=dto((await sql.query<Row>(`update public.atividades set estado_editorial=$2,atualizada_em=clock_timestamp() where id=$1 returning ${columns}`,[row.id,transition.to])).rows[0]);
    await sql.query("insert into public.eventos_editoriais (objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('atividade',$1,$2,$3,$4,$5,$6)",[row.id,'atividade_revisao_'+transition.to,actor.id,row.estado_editorial,transition.to,metadata]);
    return {...result,repetida:false};
   });
  },
 };
}
export const activities=createActivityService();
export async function activityResponse(operation:()=>Promise<unknown>){
 try{return Response.json(await operation(),{headers:privateHeaders});}catch(error){return Response.json({message:error instanceof ActivityError?error.message:'Serviço indisponível. Tente novamente.'},{status:error instanceof ActivityError?error.status:503,headers:privateHeaders});}
}
export async function activityMutation(request:Request,action:'create'|'update'|'submit'|'review',id?:string){
 // Route exports limit methods. Normalize PATCH only for reuse of the existing
 // JSON/origin/payload boundary; the original method is still PATCH over HTTP.
 return handleMutation(request.method==='PATCH'?new Request(request,{method:'POST'}):request,appOrigin(),async input=>{
  try{
   const activity=action==='create'?await activities.create(input):action==='update'?await activities.update(id!,input):action==='review'?await activities.review(id!,input):await activities.submit(id!,input);
   return {message:action==='review'?'Decisão editorial registrada. A atividade continua privada.':action==='submit'?'Atividade enviada. Ela continua privada.':'Rascunho salvo.',atividade:activity,next:'/dashboard/atividade/'+activity.id};
  }catch(error){if(error instanceof ActivityError)throw new FlowError(error.status,error.message,error.fields);throw error;}
 });
}
