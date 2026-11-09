import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { localConfig } from './config.server';
export const authCookieOptions={httpOnly:true,secure:false,sameSite:'lax' as const,path:'/'};
export async function userClient(){
  const store=await cookies();const {url,key}=localConfig();
  return createServerClient(url,key,{
    cookieOptions:{...authCookieOptions,name:'ap-auth'},
    cookies:{getAll:()=>store.getAll(),setAll(values){
      try{
        for(const {name,value,options} of values){store.set(name,value,{...options,...authCookieOptions});}
      }catch(error){
        // Server Components can read cookies but cannot write them. The proxy
        // refreshes the session on the request and persists it on the response.
        if(!(error instanceof Error)||!error.message.startsWith('Cookies can only be modified in a Server Action or Route Handler.'))throw error;
      }
    }},
  });
}
export async function clearAuthCookies(){
  const store=await cookies();
  return ()=>{for(const {name} of store.getAll())if(name==='ap-auth'||name.startsWith('ap-auth.')||name==='ap-auth-code-verifier')store.set(name,'',{...authCookieOptions,maxAge:0});};
}
