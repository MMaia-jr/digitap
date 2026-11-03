import { createServerClient } from '@supabase/ssr';
import { NextResponse,type NextRequest } from 'next/server';
import { localConfig } from './lib/supabase/config.server';
import { authCookieOptions } from './lib/supabase/server';
export async function proxy(request:NextRequest){
 let response=NextResponse.next({request});response.headers.set('Cache-Control','private, no-store');
 try{
   const {url,key}=localConfig();
   const client=createServerClient(url,key,{cookieOptions:{...authCookieOptions,name:'ap-auth'},cookies:{
     getAll:()=>request.cookies.getAll(),setAll(values,headers){
       for(const {name,value} of values)request.cookies.set(name,value);
       response=NextResponse.next({request});
       for(const {name,value,options} of values)response.cookies.set(name,value,{...options,...authCookieOptions});
       for(const [key,value] of Object.entries(headers))response.headers.set(key,value);
       response.headers.set('Cache-Control','private, no-store');
     },
   }});
   await client.auth.getUser();
 }catch{/* Pages perform the authoritative checks and show safe unavailability. */}
 return response;
}
export const config={matcher:['/dashboard/:path*']};
