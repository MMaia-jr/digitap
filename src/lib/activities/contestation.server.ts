import 'server-only';
import type {Sql} from '../database.server';
import {ActivityError,objectInput,validateWithdrawal,validateEvidence} from './domain';
import {loadRecord,recordEvidence,recordContent,recordHash} from './records.server';
export function validateContestation(input:unknown,now:Date){
 const b=objectInput(input,['pedido_id','conteudo_esperado','divergencia','referencia_publica']);
 if(typeof b.conteudo_esperado!=='string'||!/^[0-9a-f]{64}$/.test(b.conteudo_esperado))throw new ActivityError(422,'Informe o conteúdo esperado.');
 let common;try{common=validateWithdrawal({pedido_id:b.pedido_id,versao_esperada:1,motivo:b.divergencia});}catch(error){if(error instanceof ActivityError&&error.fields?.motivo)throw new ActivityError(422,error.message,{divergencia:error.fields.motivo});throw error;}
 let reference:string|null=null;
 if(b.referencia_publica!==undefined&&b.referencia_publica!==null&&b.referencia_publica!==''){
  try{reference=validateEvidence({pedido_id:common.pedido_id,tipo_fonte:'Referência de contestação',url_publica:b.referencia_publica,afirmacao_sustentada:common.motivo,consultada_em:now.toISOString()},now).url_publica;}catch(error){if(error instanceof ActivityError)throw new ActivityError(error.status,error.message,{referencia_publica:'Use referência pública sem dados sensíveis.'});throw error;}
 }
 return {pedido_id:common.pedido_id,conteudo_esperado:b.conteudo_esperado,divergencia:common.motivo,referencia_publica:reference};
}
export async function contestRecord(sql:Sql,author:string,activityId:string,command:ReturnType<typeof validateContestation>){
 const row=await loadRecord(sql,activityId,true),metadata=JSON.stringify({tipo:'contestacao.v1',...command});
 const history=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao='registro_contestado'",[row.id])).rows;
 const previous=history.find(e=>{try{return JSON.parse(e.justificativa_restrita).pedido_id===command.pedido_id;}catch{return false;}});
 if(previous){if(previous.executada_por_conta_id!==author||previous.justificativa_restrita!==metadata||row.estado_apuracao!=='contestado')throw new ActivityError(409,'Pedido de contestação já utilizado.');return {id:row.id,estado_apuracao:'contestado',repetida:true};}
 if(command.conteudo_esperado!==recordHash(recordContent(row,await recordEvidence(sql,row.id))))throw new ActivityError(409,'O conteúdo mudou. Recarregue antes de contestar.');
 await sql.query("update public.registros_realizacao set estado_apuracao='contestado' where id=$1",[row.id]);
 await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('registro',$1,'registro_contestado',$2,$3,'contestado',$4)",[row.id,author,row.estado_apuracao,metadata]);
 return {id:row.id,estado_apuracao:'contestado',repetida:false};
}
export async function privateContestations(sql:Sql,recordId:string){
 const events=(await sql.query<{justificativa_restrita:string;ocorrida_em:Date}>("select justificativa_restrita,ocorrida_em from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao='registro_contestado' order by ocorrida_em,id",[recordId])).rows;
 return events.map(e=>{const m=JSON.parse(e.justificativa_restrita);if(m.tipo!=='contestacao.v1'||typeof m.divergencia!=='string')throw new ActivityError(503,'Contestação indisponível.');return {divergencia:m.divergencia,referencia_publica:m.referencia_publica,registrada_em:e.ocorrida_em};});
}
