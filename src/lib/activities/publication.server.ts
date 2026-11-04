import 'server-only';
import {createHash} from 'node:crypto';
import type {Sql} from '../database.server';
import {ActivityError,validateDraft,type PrivateActivity,type DraftInput} from './domain';
import {uuid,type PublicActivity} from './publication';
export function snapshotHash(snapshot:PublicActivity){return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');}
export function approvedContentHash(row:DraftInput&Pick<PrivateActivity,'id'|'versao_submetida'>){const content=validateDraft({titulo:row.titulo,descricao:row.descricao,inicio_previsto:row.inicio_previsto,orientacao_acesso:row.orientacao_acesso,referencia_oficial:row.referencia_oficial},new Date(0));return createHash('sha256').update(JSON.stringify({id:row.id,versao:row.versao_submetida,...content})).digest('hex');}
export async function requireVersionAuthorization(sql:Sql,row:{id:string;versao_submetida:number},authorizationId:string|null){
 const result=await sql.query<{id:string}>("select id from public.autorizacoes_publicacao where id=$1 and objeto_tipo='atividade' and objeto_id=$2 and situacao='vigente' and revogada_em is null and autorizada_em<=clock_timestamp() and (validade_ate is null or validade_ate>clock_timestamp()) and 'divulgacao'=any(escopo_autorizado) and $3=any(escopo_autorizado) and char_length(trim(papel_autorizante))>0 and char_length(trim(comprovante_restrito))>0 for share",[authorizationId,row.id,'atividade:versao:'+row.versao_submetida]);
 if(!result.rows[0])throw new ActivityError(422,'Autorização indisponível ou incompatível com esta atividade e versão.');
}
export async function approvalForVersion(sql:Sql,row:DraftInput&Pick<PrivateActivity,'id'|'versao_submetida'>){
 const id=row.id,version=row.versao_submetida,hash=approvedContentHash(row);
 const events=(await sql.query<{id:string;executada_por_conta_id:string;justificativa_restrita:string}>("select id,executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and acao='atividade_revisao_aprovada' and estado_anterior='em_revisao' and estado_novo='aprovada'",[id])).rows;
 const valid=events.flatMap(e=>{try{const m=JSON.parse(e.justificativa_restrita);return e.executada_por_conta_id&&m.tipo==='revisao.v1'&&m.acao==='aprovar'&&m.estado_esperado==='em_revisao'&&m.versao_esperada===version&&m.conteudo_sha256===hash&&uuid(m.autorizacao_id)?[{event_id:e.id,authorization_id:String(m.autorizacao_id)}]:[];}catch{return [];}});
 if(valid.length!==1)throw new ActivityError(409,'Aprovação da versão não comprovada.');return valid[0];
}
export interface PublicationRecord {pedido_id:string;versao_esperada:number;autorizacao_id:string;aprovacao_evento_id:string;snapshot_sha256:string;author:string}
export async function publicationRecord(sql:Sql,id:string,version?:number):Promise<PublicationRecord>{
 const all=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and acao='atividade_publicada' and estado_anterior='aprovada' and estado_novo='publicada'",[id])).rows;
 const events=version===undefined?all:all.filter(e=>{try{return JSON.parse(e.justificativa_restrita).versao_esperada===version;}catch{return false;}});
 if(events.length!==1)throw new ActivityError(409,'Registro de publicação inconsistente.');
 try{const e=events[0],m=JSON.parse(e.justificativa_restrita);if(m.tipo!=='publicacao.v1'||!e.executada_por_conta_id||!uuid(m.pedido_id)||!uuid(m.autorizacao_id)||!uuid(m.aprovacao_evento_id)||!Number.isInteger(m.versao_esperada)||!/^[0-9a-f]{64}$/.test(m.snapshot_sha256))throw new Error();return {...m,author:e.executada_por_conta_id};}catch{throw new ActivityError(409,'Registro de publicação inconsistente.');}
}
