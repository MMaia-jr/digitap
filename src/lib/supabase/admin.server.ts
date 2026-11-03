import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { localConfig } from './config.server';
export function adminClient(){
  const {url}=localConfig();const secret=process.env.SUPABASE_SECRET_KEY;
  if(!secret?.startsWith('sb_secret_'))throw new Error('Cliente de serviço local não configurado.');
  return createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
