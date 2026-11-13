import 'server-only';
import { Pool,type PoolClient,type PoolConfig } from 'pg';
import { isIP } from 'node:net';
export type Sql=Pick<PoolClient,'query'>;
export type Transaction=<T>(operation:(client:Sql)=>Promise<T>)=>Promise<T>;
let pool:Pool|undefined;
function invalidConfig():never{throw new Error('Configuração PostgreSQL indisponível ou não autorizada.');}
function databaseConfig():PoolConfig{
 // Never retain URL parser errors: their input property can contain credentials.
 try{
  const raw=process.env.SUPABASE_DB_URL;
  if(!raw||raw!==raw.trim()||/[\s?#]/.test(raw))return invalidConfig();
  const url=new URL(raw);
  if(!['postgres:','postgresql:'].includes(url.protocol)||!url.username||!url.password||!url.hostname||!url.port||url.pathname==='/'||!url.pathname||url.search||url.hash)return invalidConfig();
  // pg decodes these values after parsing. Validate encoding before constructing Pool.
  for(const value of [url.username,url.password,url.pathname])decodeURIComponent(value);
  const options:PoolConfig={connectionString:raw,max:4,idleTimeoutMillis:5000,connectionTimeoutMillis:3000};
  if(process.env.NODE_ENV!=='production'){
   if(url.hostname!=='127.0.0.1'||url.port!=='56152'||url.pathname!=='/postgres'||url.username!=='postgres')return invalidConfig();
  }else{
   const allowed=process.env.SUPABASE_DB_ALLOWED_ENDPOINT;
   if(!allowed||allowed!==allowed.trim()||/[\s?#]/.test(allowed))return invalidConfig();
   const endpoint=new URL(allowed);
   if(endpoint.protocol!=='postgresql:'||endpoint.username||endpoint.password||!endpoint.port||endpoint.search||endpoint.hash||endpoint.pathname==='/'||!endpoint.pathname)return invalidConfig();
   const host=url.hostname.toLowerCase();
   // Only explicit DNS endpoints: no IP literals, encoded hosts, local names or
   // numeric/hex loopback aliases. DNS resolution itself is not performed here.
   const labels=host.split('.');
   if(isIP(host.replace(/^\[|\]$/g,''))||labels.length<2||labels.some(label=>! /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))||! /^[a-z]+$/.test(labels[labels.length-1])||labels.some(label=>['localhost','local','localdomain','internal'].includes(label)))return invalidConfig();
   if(host!==endpoint.hostname.toLowerCase()||url.port!==endpoint.port||url.pathname!==endpoint.pathname)return invalidConfig();
   options.ssl={rejectUnauthorized:true};
  }
  return options;
 }catch{return invalidConfig();}
}
function databasePool(){
 const options=databaseConfig();
 if(!pool){
  try{pool=new Pool(options);}catch{return invalidConfig();}
  pool.on('error',()=>{/* Requests fail safely; never log connection credentials. */});
 }
 return pool;
}

export const withTransaction:Transaction=async operation=>{
 const client=await databasePool().connect();let discard=false;
 try{
  await client.query('begin');await client.query("set local statement_timeout='5s'");await client.query("set local lock_timeout='3s'");
  const result=await operation(client);await client.query('commit');return result;
 }catch(error){try{await client.query('rollback');}catch{discard=true;}throw error;}
 finally{client.release(discard);}
};
export async function closeDatabasePool(){if(pool){const closing=pool;pool=undefined;await closing.end();}}
