import { execFileSync,spawn } from 'node:child_process';
import { mkdirSync,appendFileSync } from 'node:fs';
import { createServer } from 'node:net';
const root=process.cwd();
if(root!=='/Users/alexandrechagasleaocryptoboy/projects/a-praca-v1-5')throw new Error('Diretório não autorizado.');
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',root,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(local.API_URL!=='http://127.0.0.1:56151'||!local.SECRET_KEY?.startsWith('sb_secret_')||!local.PUBLISHABLE_KEY?.startsWith('sb_publishable_'))throw new Error('Stack local incompatível.');
if(new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Banco fora do escopo.');
// Refuse to reuse or stop an existing process, even on the approved port.
const guard=createServer();await new Promise((resolve,reject)=>guard.once('error',reject).listen(3215,'127.0.0.1',resolve));await new Promise(resolve=>guard.close(resolve));
const out=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/incremento-2c';
if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out))throw new Error('Diretório inválido.');
mkdirSync(out,{recursive:true});
const secrets=[local.SECRET_KEY,local.PUBLISHABLE_KEY,local.SERVICE_ROLE_KEY,local.ANON_KEY,local.JWT_SECRET,local.DB_URL].filter(Boolean);
const child=spawn('./node_modules/.bin/next',['dev','--hostname','127.0.0.1','--port','3215'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:local.SECRET_KEY,SUPABASE_DB_URL:local.DB_URL,APP_ORIGIN:'http://127.0.0.1:3215'},stdio:['ignore','pipe','pipe']});
function record(data){let s=data.toString();for(const secret of secrets)s=s.replaceAll(secret,'[SEGREDO_OMITIDO]');s=s.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT_OMITIDO]').replace(/token_hash=[^\s&"<>]+/g,'token_hash=[OMITIDO]');appendFileSync(out+'/server.log',s);}
child.stdout.on('data',record);child.stderr.on('data',record);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{console.log('Next local encerrado.');process.exitCode=code??0;});
console.log('Next local iniciado em 127.0.0.1:3215; credenciais somente no ambiente do processo.');
