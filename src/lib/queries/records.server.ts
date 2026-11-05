import 'server-only';
import {ActivityError} from '../activities/domain';
import {withTransaction,type Transaction} from '../database.server';
import {requireRecordAuthorization} from '../activities/publication.server';
import {loadRecord,parseRecordSnapshot,recordHash,recordApproval} from '../activities/records.server';
import {createPublicQueries} from './public.server';
export function createPublicRecords(deps:{transaction?:Transaction}={}){
 const transaction=deps.transaction??withTransaction;
 return {async get(activityId:string){
  try{return await transaction(async sql=>{
   await createPublicQueries({transaction:fn=>fn(sql)}).get(activityId);
   try{
    const row=await loadRecord(sql,activityId);
    if(row.estado_editorial!=='publicada'||row.numero_versao_publicada!==1)throw new ActivityError(404,'Registro não encontrado.');
    const snapshot=parseRecordSnapshot(row.versao_publicada),approval=await recordApproval(sql,row.id);
    const events=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao='registro_publicar' and estado_anterior='aprovada' and estado_novo='publicada'",[row.id])).rows;
    if(events.length!==1||!events[0].executada_por_conta_id)throw new ActivityError(409,'Registro de publicação inconsistente.');
    const meta=JSON.parse(events[0].justificativa_restrita);
    if(snapshot.id!==row.id||snapshot.atividade_id!==activityId||meta.tipo!=='registro-transicao.v1'||meta.snapshot_sha256!==recordHash(snapshot)||meta.conteudo_esperado!==approval.conteudo_esperado)throw new ActivityError(409,'Snapshot inconsistente.');
    await requireRecordAuthorization(sql,row.id,approval.autorizacao_id);
    return {...snapshot,estado_apuracao:row.estado_apuracao==='contestado'?'contestado':snapshot.estado_apuracao};
   }catch(error){if(error instanceof ActivityError&&[400,404,409,422].includes(error.status))throw new ActivityError(404,'Registro não encontrado.');throw error;}
  });}catch(error){if(error instanceof ActivityError&&error.status===404)throw error;throw new ActivityError(503,'Serviço indisponível. Tente novamente.');}
 }};
}
export const publicRecords=createPublicRecords();
