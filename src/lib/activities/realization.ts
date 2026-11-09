import {ActivityError,objectInput,validateVersion,validateWithdrawal} from './domain';
export function validateRealization(input:unknown){
 const body=objectInput(input,['pedido_id','versao_esperada','relato','participantes','url','autoriza_publicacao']);
 const pedido_id=validateWithdrawal({pedido_id:body.pedido_id,versao_esperada:body.versao_esperada,motivo:'Relato da realização.'}).pedido_id;
 if(typeof body.relato!=='string'||body.relato.trim().length<50||body.relato.trim().length>5000)throw new ActivityError(422,'Conte o que aconteceu em 50 a 5000 caracteres.');
 if(typeof body.participantes!=='number'||!Number.isSafeInteger(body.participantes)||body.participantes<0||body.participantes>1000000)throw new ActivityError(422,'Informe um número inteiro de participantes entre 0 e 1000000.');
 if(body.autoriza_publicacao!==true)throw new ActivityError(422,'Autorize a divulgação do relato e das referências após revisão editorial.');
 if(body.url!==undefined&&typeof body.url!=='string')throw new ActivityError(422,'Informe um link público válido.');
 return {pedido_id,versao_esperada:validateVersion(body.versao_esperada),relato:body.relato.trim(),participantes:body.participantes,url:(body.url as string|undefined)?.trim()||null,autoriza_publicacao:true};
}
/** Bound to the original record hash and approval, without changing snapshot v1. */
export function realizationDetails(origin:string){
 try{const value=JSON.parse(origin);if(value.tipo!=='realizacao-pf.v1'||!Number.isSafeInteger(value.participantes)||value.participantes<0||value.participantes>1000000||typeof value.registrado_em!=='string'||!Number.isFinite(Date.parse(value.registrado_em)))return null;
 return {participantes:value.participantes as number,registrado_em:value.registrado_em as string};}catch{return null;}
}
