import {ActivityError,objectInput,validateWithdrawal} from './domain';
import {uuid} from './publication';
export type RecordAction='enviar'|'iniciar'|'aprovar'|'devolver'|'rejeitar'|'publicar'|'retirar';
export function validateRecordTransition(input:unknown){
 const b=objectInput(input,['pedido_id','acao','estado_esperado','conteudo_esperado','autorizacao_id','evidencias_aprovadas','motivo']);
 const action=b.acao as RecordAction;
 if(!['enviar','iniciar','aprovar','devolver','rejeitar','publicar','retirar'].includes(action)||!['rascunho','enviada','em_revisao','aprovada','publicada'].includes(String(b.estado_esperado))||typeof b.conteudo_esperado!=='string'||!/^[0-9a-f]{64}$/.test(b.conteudo_esperado))throw new ActivityError(422,'Ação, estado ou conteúdo esperado inválido.');
 const reason=['devolver','rejeitar','retirar'].includes(action);
 objectInput(b,['pedido_id','acao','estado_esperado','conteudo_esperado',...(action==='aprovar'?['autorizacao_id','evidencias_aprovadas']:reason?['motivo']:[])]);
 const base=validateWithdrawal({pedido_id:b.pedido_id,versao_esperada:1,motivo:reason?b.motivo:'Transição de registro.'});
 if(action==='aprovar'&&(!uuid(b.autorizacao_id)||!Array.isArray(b.evidencias_aprovadas)||b.evidencias_aprovadas.some(v=>!uuid(v))||new Set(b.evidencias_aprovadas).size!==b.evidencias_aprovadas.length))throw new ActivityError(422,'Informe autorização e referências examinadas válidas.');
 return {pedido_id:base.pedido_id,acao:action,estado_esperado:String(b.estado_esperado),conteudo_esperado:b.conteudo_esperado,autorizacao_id:action==='aprovar'?String(b.autorizacao_id).toLowerCase():null,evidencias_aprovadas:action==='aprovar'?(b.evidencias_aprovadas as string[]).map(v=>v.toLowerCase()).sort():[],motivo:reason?base.motivo:null};
}
