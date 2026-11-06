import {ActivityError,objectInput,validateVersion,validateDraft,type PrivateActivity,type DraftInput} from './domain';
interface PublicActivityBase extends DraftInput {id:string;versao:number;estado_programacao:string;publicada_em:string}
export interface PublicActivityV1 extends PublicActivityBase {tipo:'atividade-publica.v1';organizacao:{id:string;nome_publico:string}}
export interface PublicPublisher {id:string;tipo:'pessoa_fisica'|'coletivo_informal'|'organizacao';nome_publico:string}
export interface PublicActivityV2 extends PublicActivityBase {tipo:'atividade-publica.v2';sujeito:PublicPublisher}
export type PublicActivity=PublicActivityV1|PublicActivityV2;
export function uuid(value:unknown){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);}
export function validatePublish(value:unknown){
 const body=objectInput(value,['versao_esperada','pedido_id']);if(!uuid(body.pedido_id))throw new ActivityError(422,'Identificador de pedido inválido.');
 return {versao_esperada:validateVersion(body.versao_esperada),pedido_id:String(body.pedido_id).toLowerCase()};
}
function record(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ActivityError(409,'Snapshot inválido.');return value as Record<string,unknown>;}
export function parseSnapshot(value:unknown):PublicActivity{
 const v=record(value);
 const legacy=v.tipo==='atividade-publica.v1';
 if((!legacy&&v.tipo!=='atividade-publica.v2')||(legacy?'sujeito' in v:'organizacao' in v))throw new ActivityError(409,'Snapshot inválido.');
 const owner=record(legacy?v.organizacao:v.sujeito);
 if(!uuid(v.id)||!uuid(owner.id)||typeof owner.nome_publico!=='string'||Array.from(owner.nome_publico.trim()).length<2||Array.from(owner.nome_publico.trim()).length>160||(!legacy&&!['pessoa_fisica','coletivo_informal','organizacao'].includes(String(owner.tipo)))||!['programada','adiada','cancelada','realizada'].includes(String(v.estado_programacao))||typeof v.publicada_em!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v.publicada_em)||!Number.isFinite(Date.parse(v.publicada_em)))throw new ActivityError(409,'Snapshot inválido.');
 const content=validateDraft({titulo:v.titulo,descricao:v.descricao,inicio_previsto:v.inicio_previsto,orientacao_acesso:v.orientacao_acesso,referencia_oficial:v.referencia_oficial},new Date(0));
 const common={id:String(v.id),versao:validateVersion(v.versao),...content};
 const identity={id:String(owner.id),nome_publico:owner.nome_publico.trim().normalize('NFC')};
 const ending={estado_programacao:String(v.estado_programacao),publicada_em:new Date(v.publicada_em).toISOString()};
 // A ordem canônica v1 permanece exatamente a original: o hash legado depende dela.
 if(legacy)return {tipo:'atividade-publica.v1',...common,organizacao:identity,...ending};
 return {tipo:'atividade-publica.v2',...common,sujeito:{id:identity.id,tipo:owner.tipo as PublicPublisher['tipo'],nome_publico:identity.nome_publico},...ending};
}
export function publicPublisher(snapshot:PublicActivity):PublicPublisher{
 return snapshot.tipo==='atividade-publica.v2'?snapshot.sujeito:{...snapshot.organizacao,tipo:'organizacao'};
}
export function publicActivityPresentation<E>(snapshot:PublicActivity,hash:string,evidencias:readonly E[]){
 const publisher=publicPublisher(snapshot);
 return {nome:publisher.nome_publico,tipo:publisher.tipo,data:snapshot.inicio_previsto,hash,evidencias};
}
export function createSubjectSnapshot(row:DraftInput&Pick<PrivateActivity,'id'|'versao_submetida'>,sujeito:PublicPublisher,state:string,date:Date,now:Date):PublicActivityV2{
 if(sujeito.tipo==='organizacao')throw new ActivityError(409,'Organizações continuam no formato v1.');
 const content=validateDraft({titulo:row.titulo,descricao:row.descricao,inicio_previsto:row.inicio_previsto,orientacao_acesso:row.orientacao_acesso,referencia_oficial:row.referencia_oficial},now);
 return parseSnapshot({tipo:'atividade-publica.v2',id:row.id,versao:row.versao_submetida,...content,sujeito,estado_programacao:state,publicada_em:date.toISOString()}) as PublicActivityV2;
}
export function createSnapshot(row:DraftInput&Pick<PrivateActivity,'id'|'versao_submetida'>,org:{id:string;nome_publico:string},state:string,date:Date,now:Date):PublicActivityV1{
 const content=validateDraft({titulo:row.titulo,descricao:row.descricao,inicio_previsto:row.inicio_previsto,orientacao_acesso:row.orientacao_acesso,referencia_oficial:row.referencia_oficial},now);
 return parseSnapshot({tipo:'atividade-publica.v1',id:row.id,versao:row.versao_submetida,...content,organizacao:org,estado_programacao:state,publicada_em:date.toISOString()}) as PublicActivityV1;
}
