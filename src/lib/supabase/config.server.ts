import 'server-only';
/** This increment is deliberately restricted to A Praça's authorized local endpoints. */
export function appOrigin(){
  const origin=process.env.APP_ORIGIN??'http://127.0.0.1:3215';
  if(origin!=='http://127.0.0.1:3215')throw new Error('Origem fora do escopo local autorizado.');
  return origin;
}
export function localConfig(){
  appOrigin();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(url!=='http://127.0.0.1:56151'||!key||!key.startsWith('sb_publishable_'))throw new Error('Supabase local não configurado.');
  return {url,key};
}
