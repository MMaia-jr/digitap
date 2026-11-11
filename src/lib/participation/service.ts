import {FlowError} from '../auth/flow.server';
import type {VerifiedUser} from '../auth/permissions.server';
import type {ConfirmationCommand,OwnConfirmation,PublicParticipationSummary,ConfirmationCounts,ParticipationState} from './types';
export interface ParticipationRepository {
 register(id:string,userId:string,command:ConfirmationCommand):Promise<OwnConfirmation>;
 summary(id:string):Promise<PublicParticipationSummary>;
 own(id:string,userId:string):Promise<OwnConfirmation|null>;
 counts(id:string,userId:string):Promise<ConfirmationCounts>;
}
function invalid(){return new FlowError(422,'Confira os campos da participação.');}
export function validateConfirmation(input:unknown):ConfirmationCommand{
 if(!input||typeof input!=='object'||Array.isArray(input))throw invalid();
 const body=input as Record<string,unknown>;
 if(Object.keys(body).some(k=>!['tipo','whatsapp','acompanhantes','mostrar_nome'].includes(k))||(body.tipo!=='apoio'&&body.tipo!=='intencao'))throw invalid();
 const acompanhantes=body.acompanhantes===undefined?1:body.acompanhantes;
 if(typeof acompanhantes!=='number'||!Number.isInteger(acompanhantes)||acompanhantes<1||acompanhantes>20)throw invalid();
 const mostrar_nome=body.mostrar_nome===undefined?false:body.mostrar_nome;
 if(typeof mostrar_nome!=='boolean')throw invalid();
 let whatsapp:string|null=null;
 if(body.whatsapp!==undefined&&body.whatsapp!==null&&body.whatsapp!==''){
  if(typeof body.whatsapp!=='string'||body.whatsapp.length>40||!/^[+\d\s()-]+$/.test(body.whatsapp))throw invalid();
  whatsapp=body.whatsapp.replace(/[\s()-]/g,'');
  if(!/^\+?\d{10,15}$/.test(whatsapp))throw invalid();
 }
 if(body.tipo==='apoio'&&(whatsapp!==null||acompanhantes!==1||mostrar_nome))throw invalid();
 return {tipo:body.tipo as ConfirmationCommand['tipo'],whatsapp,acompanhantes,mostrar_nome};
}
function identifier(id:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new FlowError(404,'Atividade não encontrada.');return id;}
function counts(row:ConfirmationCounts):ConfirmationCounts{
 if(!row||![row.apoios,row.intencoes].every(n=>Number.isSafeInteger(n)&&n>=0))throw new Error('Resumo inválido');
 return {apoios:row.apoios,intencoes:row.intencoes};
}
function own(row:OwnConfirmation):OwnConfirmation{
 if(!row||!['apoio','intencao'].includes(row.tipo)||!Number.isInteger(row.acompanhantes)||row.acompanhantes<1||row.acompanhantes>20||typeof row.mostrar_nome!=='boolean')throw new Error('Confirmação inválida');
 return {tipo:row.tipo,acompanhantes:row.acompanhantes,mostrar_nome:row.mostrar_nome};
}
export function createParticipationService(deps:{verifyUser:()=>Promise<VerifiedUser|null>;repository:ParticipationRepository}){
 async function run<T>(operation:()=>Promise<T>):Promise<T>{
  try{return await operation();}catch(error){
   if(error instanceof FlowError)throw error;
   const code=error&&typeof error==='object'&&'code'in error?error.code:null;
   if(code==='23505')throw new FlowError(409,'Você já registrou apoio ou intenção nesta atividade.');
   if(code==='42501')throw new FlowError(403,'Acesso indisponível para esta conta.');
   if(code==='P0002')throw new FlowError(404,'Atividade não encontrada.');
   if(code==='55000')throw new FlowError(409,'Esta atividade não está aberta a novas intenções ou apoios.');
   if(code==='22023'||code==='23514')throw invalid();
   throw new FlowError(503,'Serviço indisponível. Tente novamente.');
  }
 }
 async function participant(){const user=await deps.verifyUser();if(!user?.id)throw new FlowError(401,'Entre para apoiar ou marcar intenção.');if(!user.email_confirmed_at)throw new FlowError(403,'Confirme seu e-mail antes de continuar.');return user;}
 return {
  confirm(id:string,input:unknown){return run(async()=>{identifier(id);const command=validateConfirmation(input),user=await participant();return own(await deps.repository.register(id,user.id,command));});},
  organizerCounts(id:string){return run(async()=>{identifier(id);const user=await participant();return counts(await deps.repository.counts(id,user.id));});},
  state(id:string):Promise<ParticipationState>{return run(async()=>{
   identifier(id);
   const summary=await deps.repository.summary(id);
   if(!Array.isArray(summary.nomes_publicos)||summary.nomes_publicos.length>100||summary.nomes_publicos.some(n=>typeof n!=='string'||n.length>160)||typeof summary.aberta!=='boolean')throw new Error('Resumo inválido');
   const resumo={...counts(summary),nomes_publicos:summary.nomes_publicos,aberta:summary.aberta};
   const user=await deps.verifyUser(),authenticated=Boolean(user?.id&&user.email_confirmed_at);
   const row=authenticated?await deps.repository.own(id,user!.id):null;
   return {authenticated,resumo,minha_confirmacao:row?own(row):null};
  });},
 };
}
