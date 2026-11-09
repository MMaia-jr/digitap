import 'server-only';
import { createGateway } from './gateway.server';
import { loadOrganizationAccess } from './organization-access.server';
import { userClient } from '../supabase/server';
import { adminClient } from '../supabase/admin.server';
export async function organizationState(){
 try{
   const gateway=createGateway(await userClient(),adminClient,()=>{});
   return await loadOrganizationAccess({...gateway,async organization(id){
     const {data,error}=await adminClient().from('organizacoes').select('id,nome_publico,estado_validacao').eq('id',id).maybeSingle();
     if(error)throw new Error('Consulta indisponível.');return data;
   }});
 }catch{return {kind:'unavailable' as const};}
}

/** Coletivos with an existing titular vínculo share the institutional workspace. */
export async function institutionalState(){
 const state=await organizationState();
 if(state.kind!=='forbidden')return state;
 try{
  const {managedProfile}=await import('../queries/projects.server');
  const {subject}=await managedProfile();
  if(subject.tipo==='coletivo_informal')return {kind:'ready' as const,organization:{id:subject.id,nome_publico:subject.nome_publico,estado_validacao:'coletivo'}};
 }catch{/* Keep the original refusal if identity or vínculo is unavailable. */}
 return state;
}
