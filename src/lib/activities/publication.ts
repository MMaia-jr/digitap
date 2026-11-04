import {ActivityError,objectInput,validateVersion,validateDraft,type PrivateActivity,type DraftInput} from './domain';
export interface PublicActivity extends DraftInput {tipo:'atividade-publica.v1';id:string;versao:number;organizacao:{id:string;nome_publico:string};estado_programacao:string;publicada_em:string}
export function uuid(value:unknown){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
export function validatePublish(value:unknown){
 const body=objectInput(value,['versao_esperada','pedido_id']);if(!uuid(body.pedido_id))throw new ActivityError(422,'Identificador de pedido inválido.');
 return {versao_esperada:validateVersion(body.versao_esperada),pedido_id:String(body.pedido_id).toLowerCase()};
}
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ActivityError(409,'Snapshot inválido.');return value as Record<string,unknown>;}
export function parseSnapshot(value:unknown):PublicActivity{
 const v=record(value),org=record(v.organizacao);
 if(v.tipo!=='atividade-publica.v1'||!uuid(v.id)||!uuid(org.id)||typeof org.nome_publico!=='string'||Array.from(org.nome_publico.trim()).length<2||Array.from(org.nome_publico.trim()).length>160||!['programada','adiada','cancelada','realizada'].includes(String(v.estado_programacao))||typeof v.publicada_em!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v.publicada_em)||!Number.isFinite(Date.parse(v.publicada_em)))throw new ActivityError(409,'Snapshot inválido.');
 const content=validateDraft({titulo:v.titulo,descricao:v.descricao,inicio_previsto:v.inicio_previsto,orientacao_acesso:v.orientacao_acesso,referencia_oficial:v.referencia_oficial},new Date(0));
 return {tipo:'atividade-publica.v1',id:String(v.id),versao:validateVersion(v.versao),...content,organizacao:{id:String(org.id),nome_publico:org.nome_publico.trim().normalize('NFC')},estado_programacao:String(v.estado_programacao),publicada_em:new Date(v.publicada_em).toISOString()};
}
export function createSnapshot(row:DraftInput&Pick<PrivateActivity,'id'|'versao_submetida'>,org:{id:string;nome_publico:string},state:string,date:Date,now:Date):PublicActivity{
 const content=validateDraft({titulo:row.titulo,descricao:row.descricao,inicio_previsto:row.inicio_previsto,orientacao_acesso:row.orientacao_acesso,referencia_oficial:row.referencia_oficial},now);
 return parseSnapshot({tipo:'atividade-publica.v1',id:row.id,versao:row.versao_submetida,...content,organizacao:org,estado_programacao:state,publicada_em:date.toISOString()});
}
