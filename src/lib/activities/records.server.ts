import 'server-only';
import {activePersonPublisher} from './editorial-pf.server';
import {createHash} from 'node:crypto';
import type {Sql} from '../database.server';
import {ActivityError,validateRecord,validateEvidence} from './domain';
import {requireRecordAuthorization} from './publication.server';
import type {validateRecordTransition} from './record-workflow';
export interface RecordRow {id:string;atividade_id:string;data_realizacao:string;descricao_factual:string;origem_informacao:string;estado_apuracao:string;estado_editorial:string;versao_publicada:unknown;numero_versao_publicada:number|null;publicada_em:Date|null}
export interface EvidenceRow {id:string;tipo_fonte:string;url_publica:string;afirmacao_sustentada:string;consultada_em:Date|string;aprovada_publicacao:boolean}
export async function loadRecord(sql:Sql,activityId:string,lock=false){
 const row=(await sql.query<RecordRow>(`select id,atividade_id,data_realizacao::text as data_realizacao,descricao_factual,origem_informacao,estado_apuracao,estado_editorial,versao_publicada,numero_versao_publicada,publicada_em from public.registros_realizacao where atividade_id=$1${lock?' for update':''}`,[activityId])).rows[0];
 if(!row)throw new ActivityError(404,'Registro não encontrado.');return row;
}
export async function recordEvidence(sql:Sql,id:string){return (await sql.query<EvidenceRow>('select id,tipo_fonte,url_publica,afirmacao_sustentada,consultada_em,aprovada_publicacao from public.evidencias where registro_id=$1 order by id',[id])).rows;}
export function recordContent(row:Pick<RecordRow,'id'|'atividade_id'|'data_realizacao'|'descricao_factual'|'origem_informacao'|'estado_apuracao'>,evidence:EvidenceRow[]){
 const clean=validateRecord({pedido_id:row.id,versao_esperada:1,data_realizacao:row.data_realizacao,descricao_factual:row.descricao_factual,origem_informacao:row.origem_informacao});
 if(!['declarado','corroborado','contestado'].includes(row.estado_apuracao))throw new ActivityError(409,'Apuração inválida.');
 return {id:row.id,atividade_id:row.atividade_id,data_realizacao:clean.data_realizacao,descricao_factual:clean.descricao_factual,origem_informacao:clean.origem_informacao,estado_apuracao:row.estado_apuracao,evidencias:evidence.map(e=>{const c=validateEvidence({pedido_id:e.id,tipo_fonte:e.tipo_fonte,url_publica:e.url_publica,afirmacao_sustentada:e.afirmacao_sustentada,consultada_em:e.consultada_em instanceof Date?e.consultada_em.toISOString():e.consultada_em});return {id:e.id,tipo_fonte:c.tipo_fonte,url_publica:c.url_publica,afirmacao_sustentada:c.afirmacao_sustentada,consultada_em:c.consultada_em};}).sort((a,b)=>a.id.localeCompare(b.id))};
}
export const recordHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function recordApproval(sql:Sql,id:string){
 const rows=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao='registro_aprovar' and estado_anterior='em_revisao' and estado_novo='aprovada'",[id])).rows;
 if(rows.length!==1)throw new ActivityError(409,'Aprovação do registro não comprovada.');
 const meta=JSON.parse(rows[0].justificativa_restrita);if(meta.tipo!=='registro-transicao.v1'||!rows[0].executada_por_conta_id||meta.acao!=='aprovar'||typeof meta.autorizacao_id!=='string')throw new ActivityError(409,'Aprovação inconsistente.');return meta;
}
export async function transitionRecord(sql:Sql,author:string,activityId:string,command:ReturnType<typeof validateRecordTransition>,now:Date){
 const row=await loadRecord(sql,activityId,true),evidence=await recordEvidence(sql,row.id),content=recordContent(row,evidence),hash=recordHash(content),metadata=JSON.stringify({tipo:'registro-transicao.v1',...command});
 if(command.conteudo_esperado!==hash)throw new ActivityError(409,'O conteúdo do registro mudou. Recarregue.');
 const history=(await sql.query<{executada_por_conta_id:string;justificativa_restrita:string}>("select executada_por_conta_id,justificativa_restrita from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao like 'registro_%'",[row.id])).rows;
 const previous=history.find(e=>{try{return JSON.parse(e.justificativa_restrita).pedido_id===command.pedido_id;}catch{return false;}});
 const transitions:Record<string,{from:string[];to:string}>={enviar:{from:['rascunho'],to:'enviada'},iniciar:{from:['enviada'],to:'em_revisao'},aprovar:{from:['em_revisao'],to:'aprovada'},devolver:{from:['enviada','em_revisao'],to:'devolvida'},rejeitar:{from:['enviada','em_revisao'],to:'rejeitada'},publicar:{from:['aprovada'],to:'publicada'},retirar:{from:['publicada'],to:'retirada'}};
 const transition=transitions[command.acao];
 if(row.estado_apuracao==='contestado'&&['aprovar','publicar'].includes(command.acao))throw new ActivityError(409,'Registro contestado exige análise; esta ação não resolve a divergência.');
 if(previous){const {snapshot_sha256:ignored,...core}=JSON.parse(previous.justificativa_restrita);void ignored;if(previous.executada_por_conta_id!==author||JSON.stringify(core)!==metadata||row.estado_editorial!==transition.to)throw new ActivityError(409,'Pedido já utilizado ou estado alterado.');}
 else if(row.estado_editorial!==command.estado_esperado||!transition.from.includes(row.estado_editorial))throw new ActivityError(409,'Estado não permite esta transição.');
 let snapshot:unknown=null;
 if(command.acao==='aprovar'){
  await requireRecordAuthorization(sql,row.id,command.autorizacao_id!);
  if(command.evidencias_aprovadas.some(id=>!evidence.some(e=>e.id===id)))throw new ActivityError(422,'Referência não pertence ao registro.');
 }
 if(command.acao==='publicar'){
  const approval=await recordApproval(sql,row.id);await requireRecordAuthorization(sql,row.id,approval.autorizacao_id);
  if(approval.conteudo_esperado!==hash)throw new ActivityError(409,'Conteúdo não corresponde à aprovação.');
  const organization=(await sql.query<{estado_validacao:string}>('select o.estado_validacao from public.organizacoes o join public.atividades a on a.organizacao_id=o.id where a.id=$1 for share of o',[activityId])).rows[0];
  if(organization){if(organization.estado_validacao!=='validada')throw new ActivityError(422,'Organização não está validada.');}
  else{
   const activity=(await sql.query<{sujeito_id:string}>("select sujeito_id from public.atividades where id=$1 and organizacao_id is null and politica_publicacao='i4' and estado_editorial='publicada' for share",[activityId])).rows[0];
   if(!activity?.sujeito_id)throw new ActivityError(422,'Titular indisponível para publicação.');
   await activePersonPublisher(sql,activity.sujeito_id);
  }
  snapshot={tipo:'registro-publico.v1',versao:1,...content,evidencias:content.evidencias.filter(e=>(approval.evidencias_aprovadas as string[]).includes(e.id)),publicada_em:now.toISOString()};
  if(previous){const meta=JSON.parse(previous.justificativa_restrita);if(recordHash(parseRecordSnapshot(row.versao_publicada))!==meta.snapshot_sha256)throw new ActivityError(409,'Snapshot inconsistente.');}
 }
 if(previous)return {id:row.id,estado_editorial:row.estado_editorial,repetida:true};
 if(command.acao==='aprovar')await sql.query('update public.evidencias set aprovada_publicacao=(id=any($2::uuid[])) where registro_id=$1',[row.id,command.evidencias_aprovadas]);
 if(snapshot)await sql.query("update public.registros_realizacao set estado_editorial='publicada',versao_publicada=$2::jsonb,numero_versao_publicada=1,publicada_em=$3 where id=$1",[row.id,JSON.stringify(snapshot),now.toISOString()]);
 else await sql.query('update public.registros_realizacao set estado_editorial=$2 where id=$1',[row.id,transition.to]);
 await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('registro',$1,$2,$3,$4,$5,$6)",[row.id,'registro_'+command.acao,author,row.estado_editorial,transition.to,snapshot?JSON.stringify({...JSON.parse(metadata),snapshot_sha256:recordHash(snapshot)}):metadata]);
 return {id:row.id,estado_editorial:transition.to,repetida:false};
}

export function parseRecordSnapshot(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ActivityError(409,'Snapshot de registro inválido.');
 const v=value as Record<string,unknown>;
 if(v.tipo!=='registro-publico.v1'||v.versao!==1||typeof v.id!=='string'||typeof v.atividade_id!=='string'||!Array.isArray(v.evidencias)||typeof v.publicada_em!=='string'||!Number.isFinite(Date.parse(v.publicada_em)))throw new ActivityError(409,'Snapshot de registro inválido.');
 const content=recordContent(v as unknown as RecordRow,(v.evidencias as EvidenceRow[]).map(e=>({...e,aprovada_publicacao:true})));
 return {tipo:'registro-publico.v1',versao:1,...content,publicada_em:new Date(v.publicada_em).toISOString()};
}
