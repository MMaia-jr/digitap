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
