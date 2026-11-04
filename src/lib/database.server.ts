import 'server-only';
import { Pool,type PoolClient } from 'pg';
export type Sql=Pick<PoolClient,'query'>;
export type Transaction=<T>(operation:(client:Sql)=>Promise<T>)=>Promise<T>;
let pool:Pool|undefined;
function localPool(){
 const raw=process.env.SUPABASE_DB_URL;if(!raw)throw new Error('Banco local indisponível.');
 const url=new URL(raw);
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='127.0.0.1'||url.port!=='56152'||url.pathname!=='/postgres'||url.search||url.hash||url.username!=='postgres'||!url.password)throw new Error('Banco fora do escopo autorizado.');
 if(!pool){pool=new Pool({connectionString:raw,max:4,idleTimeoutMillis:5000,connectionTimeoutMillis:3000});pool.on('error',()=>{/* Requests fail safely; never log connection credentials. */});}
 return pool;
}
export const withTransaction:Transaction=async operation=>{
 const client=await localPool().connect();let discard=false;
 try{
  await client.query('begin');await client.query("set local statement_timeout='5s'");await client.query("set local lock_timeout='3s'");
  const result=await operation(client);await client.query('commit');return result;
 }catch(error){try{await client.query('rollback');}catch{discard=true;}throw error;}
 finally{client.release(discard);}
};
export async function closeDatabasePool(){if(pool){const closing=pool;pool=undefined;await closing.end();}}
