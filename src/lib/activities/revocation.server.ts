import 'server-only';
import type {Sql} from '../database.server';
import {ActivityError,objectInput,validateWithdrawal} from './domain';
import {uuid} from './publication';
export function validateRevocation(input:unknown){
 const b=objectInput(input,['pedido_id','autorizacao_id','motivo']);if(!uuid(b.autorizacao_id))throw new ActivityError(422,'Informe uma autorização válida.');
 const {pedido_id,motivo}=validateWithdrawal({pedido_id:b.pedido_id,motivo:b.motivo,versao_esperada:1});return {pedido_id,autorizacao_id:String(b.autorizacao_id).toLowerCase(),motivo};
}
export async function revokeAuthorization(sql:Sql,author:string,activityId:string,command:ReturnType<typeof validateRevocation>){
 await sql.query('select id from public.registros_realizacao where atividade_id=$1 for update',[activityId]);
 const row=(await sql.query<{id:string;objeto_tipo:string;objeto_id:string;situacao:string;revogada_em:Date|null}>("select id,objeto_tipo,objeto_id,situacao,revogada_em from public.autorizacoes_publicacao where id=$1 and ((objeto_tipo='atividade' and objeto_id=$2) or (objeto_tipo='registro' and objeto_id in (select id from public.registros_realizacao where atividade_id=$2))) for update",[command.autorizacao_id,activityId])).rows[0];
 if(!row)throw new ActivityError(404,'Autorização não encontrada para esta atividade.');
 const metadata=JSON.stringify({tipo:'revogacao.v1',...command}),history=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='autorizacao' and objeto_id=$1 and acao='autorizacao_revogada'",[row.id])).rows;
 if(history.length){if(history.length!==1||history[0].executada_por_conta_id!==author||history[0].justificativa_restrita!==metadata||row.situacao!=='revogada'||!row.revogada_em)throw new ActivityError(409,'Revogação já registrada com outro pedido.');return {revogada:true,repetida:true};}
 if(row.situacao==='revogada'||row.revogada_em)throw new ActivityError(409,'Autorização já revogada.');
 await sql.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=clock_timestamp() where id=$1",[row.id]);
 if(row.objeto_tipo==='atividade')await sql.query('update public.atividades set apoios_abertos=false,atualizada_em=clock_timestamp() where id=$1',[activityId]);
 await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('autorizacao',$1,'autorizacao_revogada',$2,$3,'revogada',$4)",[row.id,author,row.situacao,metadata]);
 return {revogada:true,repetida:false};
}
