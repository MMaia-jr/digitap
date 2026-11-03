import 'server-only';
import { userClient, clearAuthCookies } from '../supabase/server';
import { adminClient } from '../supabase/admin.server';
import { createGateway } from './gateway.server';
import { executeAuth, validateAuthInput, type AuthAction } from './flow.server';
import { handleMutation } from './http.server';
import { appOrigin } from '../supabase/config.server';
export async function mutation(action:AuthAction,request:Request){
  return handleMutation(request,appOrigin(),async input=>{
    validateAuthInput(action,input);
    const client=await userClient();
    const gateway=createGateway(client,adminClient,await clearAuthCookies());
    return executeAuth(action,input,gateway);
  });
}
