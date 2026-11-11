import 'server-only';
import {createParticipationService} from './service';
import type {ConfirmationCommand,OwnConfirmation,ConfirmationCounts,PublicParticipationSummary} from './types';
import {userClient} from '../supabase/server';
import {adminClient} from '../supabase/admin.server';
import {publicActivities} from '../queries/public.server';
import {FlowError} from '../auth/flow.server';
import {handleMutation,privateHeaders} from '../auth/http.server';
import {appOrigin} from '../supabase/config.server';

export async function participationService(){
 const client=await userClient();
 // Mutations and owner counts use session-derived identity, rechecked in SQL.
 // The public summary RPC exposes only counts and explicitly consented names.
 const rpc=async<T>(name:string,args:Record<string,unknown>):Promise<T>=>{
  const {data,error}=await adminClient().rpc(name,args);
  if(error)throw error;
  return data as T;
 };
 return createParticipationService({
  async verifyUser(){
   const {data,error}=await client.auth.getUser();
   if(error){if([400,401,403].includes(error.status??0))return null;throw new Error('Auth indisponível');}
   return data.user;
  },
  repository:{
   async register(id:string,userId:string,command:ConfirmationCommand){
    await publicActivities.get(id);
    return rpc<OwnConfirmation>('registrar_confirmacao',{p_auth_user_id:userId,p_atividade_id:id,p_tipo:command.tipo,p_whatsapp:command.whatsapp,p_acompanhantes:command.acompanhantes,p_mostrar_nome:command.mostrar_nome});
   },
   async summary(id:string){await publicActivities.get(id);return rpc<PublicParticipationSummary>('resumo_publico_confirmacoes',{p_atividade_id:id});},
   async own(id:string){
    // Carry the caller's JWT: RLS allows only the caller's own confirmation.
    const {data,error}=await client.from('confirmacoes').select('tipo,acompanhantes,mostrar_nome').eq('atividade_id',id).maybeSingle();
    if(error)throw error;
    return data as OwnConfirmation|null;
   },
   counts(id:string,userId:string){return rpc<ConfirmationCounts>('contadores_confirmacoes_organizador',{p_auth_user_id:userId,p_atividade_id:id});},
  },
 });
}
export async function participationResponse(operation:()=>Promise<unknown>){
 try{return Response.json(await operation(),{headers:privateHeaders});}
 catch(error){const known=error instanceof FlowError;return Response.json({message:known?error.message:'Serviço indisponível. Tente novamente.'},{status:known?error.status:503,headers:privateHeaders});}
}
export async function participationMutation(request:Request,id:string){
 try{return await handleMutation(request,appOrigin(),async input=>{
  const service=await participationService();
  const confirmacao=await service.confirm(id,input);
  return {message:confirmacao.tipo==='apoio'?'Apoio registrado.':'Intenção registrada. Isso não confirma presença.',confirmacao};
 });}catch{return Response.json({message:'Serviço indisponível. Tente novamente.'},{status:503,headers:privateHeaders});}
}
