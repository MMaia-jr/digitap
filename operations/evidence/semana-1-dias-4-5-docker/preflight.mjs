import {execFileSync} from 'node:child_process';
import {networkInterfaces} from 'node:os';
import {connect} from 'node:net';
import {readdirSync,writeFileSync} from 'node:fs';
import pg from 'pg';
const out='operations/evidence/semana-1-dias-4-5-docker';
const run=(command,args)=>execFileSync(command,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const local=JSON.parse(run('./node_modules/.bin/supabase',['status','--output','json']));
const u=new URL(local.DB_URL);
if(local.API_URL!=='http://127.0.0.1:56151'||u.hostname!=='127.0.0.1'||u.port!=='56152')throw new Error('Alvo não autorizado.');
const probe=(host,port)=>new Promise(resolve=>{const socket=connect({host,port});const finish=result=>{socket.destroy();resolve(result);};socket.setTimeout(700,()=>finish(false));socket.once('error',()=>finish(false));socket.once('connect',()=>finish(true));});
const positives=[],negatives=[],listeners={};
for(const port of [56151,56152,56154]){
 const listing=run('lsof',['-nP',`-iTCP:${port}`,'-sTCP:LISTEN']);
 if(!listing.includes(`127.0.0.1:${port}`)||listing.split('\n').slice(1).some(l=>l.includes('(LISTEN)')&&!l.includes(`127.0.0.1:${port}`)))throw new Error('Listener fora do loopback ou inconclusivo.');
 listeners[port]='127.0.0.1';positives.push({port,accepted:await probe('127.0.0.1',port)});
 for(const [name,entries] of Object.entries(networkInterfaces()))for(const entry of entries??[]){
  if(entry.internal)continue;
  const host=entry.address.startsWith('fe80:')&&!entry.address.includes('%')?entry.address+'%'+name:entry.address;
  negatives.push({interface:name,family:entry.family,port,accepted:await probe(host,port)});
 }
 negatives.push({interface:'IPv6-loopback-without-listener',family:'IPv6',port,accepted:await probe('::1',port)});
}
if(positives.some(p=>!p.accepted)||!negatives.length||negatives.some(p=>p.accepted))throw new Error('Isolamento não comprovado. Nenhum serviço foi alterado.');
const auth=JSON.parse(run('docker',['inspect','supabase_auth_a-praca-v1-5']))[0];
const env=Object.fromEntries(auth.Config.Env.map(item=>{const i=item.indexOf('=');return[item.slice(0,i),item.slice(i+1)];}));
const smtp=env.GOTRUE_SMTP_HOST;
if(!['localhost','127.0.0.1','mailpit','inbucket','supabase_inbucket_a-praca-v1-5'].includes(smtp))throw new Error('SMTP não é o coletor local autorizado.');
const db=new pg.Client({connectionString:local.DB_URL,connectionTimeoutMillis:5000});
try{
 await db.connect();
 const applied=(await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version);
 const pending=readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')&&!applied.includes(n.split('_')[0]));
 const exists=(await db.query("select to_regclass('public.confirmacoes') is not null as exists")).rows[0].exists;
 const report={checked_at:new Date().toISOString(),target:'a-praca-v1-5 local',api:local.API_URL,db_host:u.hostname,db_port:u.port,listeners,positive_connections:positives.length,negative_probes:negatives.length,negative_accepted:0,smtp_host:smtp,applied_migrations:applied,pending_migrations:pending,confirmacoes_exists:exists,cloud_access:false};
 writeFileSync(out+'/preflight.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await db.end();}
