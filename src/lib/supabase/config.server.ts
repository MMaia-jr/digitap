import 'server-only';
export function appOrigin(){
  const origin=process.env.APP_ORIGIN??(process.env.NODE_ENV==='production'?undefined:'http://127.0.0.1:3215');
  if(process.env.NODE_ENV==='production'){
    if(!origin)throw new Error('APP_ORIGIN ausente.');
    const parsed=new URL(origin);
    if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||parsed.search||parsed.hash||parsed.pathname!=='/'||parsed.origin!==origin)throw new Error('Origem de produção inválida.');
    return origin;
  }
  if(origin!=='http://127.0.0.1:3215')throw new Error('Origem fora do escopo local autorizado.');
  return origin;
}
export function mutationOrigins(canonical: string): string[]{
  const origins=[canonical];
  // Server deployment metadata only; request headers never establish trust.
  if(process.env.NODE_ENV!=='production'||process.env.VERCEL!=='1'||!['production','preview'].includes(process.env.VERCEL_ENV??''))return origins;
  if(canonical!==appOrigin())return origins;
  const host=process.env.VERCEL_URL;
  if(!host||host.length>253||! /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/.test(host))return origins;
  // The suffix validates format; only this exact configured hostname is trusted.
  origins.push(`https://${host}`);
  return origins;
}
export function localConfig(){
  appOrigin();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url)throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente.');
  if(process.env.NODE_ENV==='production'){
    const parsed=new URL(url);
    if(parsed.protocol!=='https:'||! /^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname)||parsed.username||parsed.password||parsed.port||parsed.search||parsed.hash||parsed.pathname!=='/'||! [parsed.origin,`${parsed.origin}/`].includes(url))throw new Error('URL de produção inválida.');
  }else if(url!=='http://127.0.0.1:56151')throw new Error('URL local inválida.');
  if(!key||key.trim().length<20)throw new Error('Chave pública do Supabase inválida.');
  return {url,key};
}
