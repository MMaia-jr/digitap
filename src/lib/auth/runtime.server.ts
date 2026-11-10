import 'server-only';
import { userClient, clearAuthCookies } from '../supabase/server';
import { adminClient } from '../supabase/admin.server';
import { createGateway } from './gateway.server';
import { executeAuth, validateAuthInput, type AuthAction } from './flow.server';
import { handleMutation, privateHeaders } from './http.server';
import { appOrigin } from '../supabase/config.server';
export async function mutation(action:AuthAction,request:Request){
  let origin: string;
  try {
    origin = appOrigin();
  } catch (error) {
    if(action==='signup'||action==='signup_pf')console.error('ERRO REAL NO CADASTRO:',error);
    return Response.json({message:'Serviço indisponível. Tente novamente.'},{status:503,headers:privateHeaders});
  }
  return handleMutation(request,origin,async input=>{
    validateAuthInput(action,input);
    const clear = await clearAuthCookies();
    let cleared = false;
    const clearOnce = () => {
      if (!cleared) {
        clear();
        cleared = true;
      }
    };
    try {
      const client=await userClient().catch(error=>{
        if(action==='signup'||action==='signup_pf')console.error('ERRO REAL NO CADASTRO:',error);
        throw error;
      });
      const gateway=createGateway(client,adminClient,clearOnce);
      return await executeAuth(action,input,gateway);
    } finally {
      // Only after origin and payload validation; never clear on a cross-site POST.
      if (action === 'signout') clearOnce();
    }
  });
}
