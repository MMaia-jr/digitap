import 'server-only';
import { ActivityError,validateDraft,validateVersion,objectInput,type PrivateActivity } from './domain';
import { withTransaction,type Transaction,type Sql } from '../database.server';
import { authorize,AccessError,type AccessAccount,type VerifiedUser } from '../auth/permissions.server';
import { userClient } from '../supabase/server';
import { adminClient } from '../supabase/admin.server';
import { createGateway } from '../auth/gateway.server';
import { handleMutation,privateHeaders } from '../auth/http.server';
import { FlowError } from '../auth/flow.server';
import { appOrigin } from '../supabase/config.server';
const columns='id,titulo,descricao,inicio_previsto,orientacao_acesso,referencia_oficial,estado_editorial,versao_submetida';
type Row=Omit<PrivateActivity,'inicio_previsto'> & {inicio_previsto:Date|string};
type Actor=AccessAccount & {id:string};
const dto=(row:Row):PrivateActivity=>({...row,inicio_previsto:row.inicio_previsto instanceof Date?row.inicio_previsto.toISOString():row.inicio_previsto});
const unavailable=()=>new ActivityError(503,'Serviço indisponível. Tente novamente.');
function identifier(value:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new ActivityError(404,'Atividade não encontrada.');return value;}
async function verifiedUser(){return createGateway(await userClient(),adminClient,()=>{}).currentUser();}
export function createActivityService(deps:{verifyUser?:()=>Promise<VerifiedUser|null>;transaction?:Transaction;now?:()=>Date}={}){
 const verifyUser=deps.verifyUser??verifiedUser,transaction=deps.transaction??withTransaction,now=deps.now??(()=>new Date());
 async function run<T>(editorRead:boolean,operation:(sql:Sql,actor:Actor)=>Promise<T>):Promise<T>{
  try{
   const user=await verifyUser();if(!user?.id)throw new ActivityError(401,'Autenticação necessária.');if(!user.email_confirmed_at)throw new ActivityError(403,'Confirme seu e-mail.');
   return await transaction(async sql=>{
    const actor=(await sql.query<Actor>('select id,auth_user_id,organizacao_id,papel,situacao from public.contas_acesso where auth_user_id=$1 for share',[user.id])).rows[0];
    const editorial=editorRead&&actor&&['editor','administrador'].includes(actor.papel);
    await authorize({verifyUser:async()=>user,findAccount:async()=>actor??null},editorial?{action:'editorial'}:{action:'organizacao',organizationId:actor?.organizacao_id??''});
    if(!editorial){const org=(await sql.query<{estado_validacao:string}>('select estado_validacao from public.organizacoes where id=$1 for share',[actor.organizacao_id])).rows[0];if(!org||org.estado_validacao==='suspensa')throw new ActivityError(403,'Acesso indisponível para esta organização.');}
    return operation(sql,actor);
   });
  }catch(error){if(error instanceof ActivityError)throw error;if(error instanceof AccessError)throw new ActivityError(error.status,error.message);throw unavailable();}
 }
 async function load(sql:Sql,actor:Actor,id:string,write=false){
  const owner=actor.papel==='organizacao'?actor.organizacao_id:null;
  const result=await sql.query<Row>(`select ${columns} from public.atividades where id=$1 and ($2::uuid is null or organizacao_id = $2) and estado_editorial in ('rascunho','enviada')${write?' for update':''}`,[identifier(id),owner]);
  if(!result.rows[0])throw new ActivityError(404,'Atividade não encontrada.');return dto(result.rows[0]);
 }
 return {
  async create(input:unknown){
   const value=validateDraft(input,now());
   return run(false,async(sql,actor)=>{
    const row=(await sql.query<Row>(`insert into public.atividades (organizacao_id,criada_por_conta_id,titulo,descricao,inicio_previsto,orientacao_acesso,referencia_oficial) values($1,$2,$3,$4,$5,$6,$7) returning ${columns}`,[actor.organizacao_id,actor.id,value.titulo,value.descricao,value.inicio_previsto,value.orientacao_acesso,value.referencia_oficial])).rows[0];return dto(row);
   });
  },
  async list(){return run(false,async(sql,actor)=>(await sql.query<Row>(`select ${columns} from public.atividades where organizacao_id=$1 and estado_editorial in ('rascunho','enviada') order by criada_em desc limit 100`,[actor.organizacao_id])).rows.map(dto));},
  async get(id:string){return run(true,async(sql,actor)=>{const activity=await load(sql,actor,id);return {...activity,pode_editar:actor.papel==='organizacao'&&activity.estado_editorial==='rascunho'};});},
  async update(id:string,input:unknown){
   const body=objectInput(input,['titulo','descricao','inicio_previsto','orientacao_acesso','referencia_oficial','versao_esperada']);const version=validateVersion(body.versao_esperada);
   const {versao_esperada:ignored,...content}=body;void ignored;const value=validateDraft(content,now());
   return run(false,async(sql,actor)=>{
    const row=await load(sql,actor,id,true);if(row.estado_editorial!=='rascunho'||row.versao_submetida!==version)throw new ActivityError(409,'A atividade mudou. Recarregue antes de continuar.');
    return dto((await sql.query<Row>(`update public.atividades set titulo=$2,descricao=$3,inicio_previsto=$4,orientacao_acesso=$5,referencia_oficial=$6,versao_submetida = versao_submetida + 1,atualizada_em=clock_timestamp() where id=$1 returning ${columns}`,[row.id,value.titulo,value.descricao,value.inicio_previsto,value.orientacao_acesso,value.referencia_oficial])).rows[0]);
   });
  },
  async submit(id:string,input:unknown){
   const body=objectInput(input,['versao_esperada']);const version=validateVersion(body.versao_esperada);
   return run(false,async(sql,actor)=>{
    const row=await load(sql,actor,id,true);if(row.versao_submetida!==version)throw new ActivityError(409,'A atividade mudou. Recarregue antes de continuar.');
    if(row.estado_editorial==='enviada')return row;
    validateDraft({titulo:row.titulo,descricao:row.descricao,inicio_previsto:row.inicio_previsto,orientacao_acesso:row.orientacao_acesso,referencia_oficial:row.referencia_oficial},now());
    const sent=dto((await sql.query<Row>(`update public.atividades set estado_editorial='enviada',atualizada_em=clock_timestamp() where id=$1 returning ${columns}`,[row.id])).rows[0]);
    await sql.query("insert into public.eventos_editoriais (objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo) values('atividade',$1,'atividade_enviada',$2,'rascunho','enviada')",[row.id,actor.id]);return sent;
   });
  },
 };
}
export const activities=createActivityService();
export async function activityResponse(operation:()=>Promise<unknown>){
 try{return Response.json(await operation(),{headers:privateHeaders});}catch(error){return Response.json({message:error instanceof ActivityError?error.message:'Serviço indisponível. Tente novamente.'},{status:error instanceof ActivityError?error.status:503,headers:privateHeaders});}
}
export async function activityMutation(request:Request,action:'create'|'update'|'submit',id?:string){
 // Route exports limit methods. Normalize PATCH only for reuse of the existing
 // JSON/origin/payload boundary; the original method is still PATCH over HTTP.
 return handleMutation(request.method==='PATCH'?new Request(request,{method:'POST'}):request,appOrigin(),async input=>{
  try{
   const activity=action==='create'?await activities.create(input):action==='update'?await activities.update(id!,input):await activities.submit(id!,input);
   return {message:action==='submit'?'Atividade enviada. Ela continua privada.':'Rascunho salvo.',atividade:activity,next:'/dashboard/atividade/'+activity.id};
  }catch(error){if(error instanceof ActivityError)throw new FlowError(error.status,error.message,error.fields);throw error;}
 });
}
