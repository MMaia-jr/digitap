import { parseEnv } from 'node:util';
import { execFileSync,spawn } from 'node:child_process';
import { mkdirSync,appendFileSync,existsSync,realpathSync,readFileSync,lstatSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=process.cwd();
const live=process.env.DIGITAP_G4_03B_GATEWAY_REAL==='1';
const mock=process.env.DIGITAP_G4_03B_GATEWAY_MOCK==='1';
const g4=live||mock;
if(live&&mock)throw new Error('Escolha somente um transporte G4-03B.');
const g4Root='/Users/alexandrechagasleaocryptoboy/projects/digitap-ia-core-recuperacao-20261124';
const out=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/incremento-2c';
let childEnv=process.env;
if(g4){
  if(root!==g4Root||realpathSync(fileURLToPath(new URL('../',import.meta.url)))!==g4Root)throw new Error('Raiz G4-03B não autorizada.');
  const required={
    [live?'DIGITAP_G4_03B_GATEWAY_REAL':'DIGITAP_G4_03B_GATEWAY_MOCK']:'1',A_PRACA_ALLOW_FIXTURE_CLEANUP:'1',
    AI_GATEWAY_API_KEY:live?process.env.AI_GATEWAY_API_KEY:'g4-03b-synthetic-only',AI_GATEWAY_MODEL:'moonshotai/kimi-k2.6',
    G4_03B_CONTEXT_MARKER:'G4-03B-PRIVATE-SYNTHETIC-20261123-01',
    APP_ORIGIN:'http://127.0.0.1:3215',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:56151',
  };
  if(!required.AI_GATEWAY_API_KEY||Object.entries(required).some(([name,value])=>process.env[name]!==value)||
    !/^operations\/evidence\/g4-03b-recovery-[a-zA-Z0-9-]+$/.test(out)||
    process.env.NODE_ENV==='production')throw new Error('Configuração do harness G4-03B incompleta ou inválida.');
  if(['.env.development.local','.env.development','.env'].some(path=>existsSync(path)))throw new Error('O modo G4-03B recusa arquivos env adicionais.');
  if(live||existsSync('.env.local')){
    const file=lstatSync('.env.local');
    const vars=parseEnv(readFileSync('.env.local','utf8'));
    if(!file.isFile()||(file.mode&0o777)!==0o600||Object.keys(vars).length!==1||
      !vars.AI_GATEWAY_API_KEY||(live&&vars.AI_GATEWAY_API_KEY!==required.AI_GATEWAY_API_KEY))throw new Error('Arquivo de credencial G4 fora do contrato.');
  }
  const baseEnv=Object.fromEntries(['HOME','PATH','TMPDIR'].filter(name=>process.env[name]).map(name=>[name,process.env[name]]));
  const preload=pathToFileURL(realpathSync('tests/e2e/helpers/g4-03b-gateway-preload.mjs')).href;
  childEnv={...baseEnv,...required,A_PRACA_EVIDENCE_DIR:out,NODE_ENV:'development',SUPABASE_TELEMETRY_DISABLED:'1',NODE_OPTIONS:`--import=${preload}`};
  const fixtureBucket=process.env.SUPABASE_PRIVATE_EVIDENCE_BUCKET;
  if(fixtureBucket!==undefined){
    if(!/^oss01d-private-[a-z0-9-]+$/.test(fixtureBucket))throw new Error('Bucket fora do escopo sintético.');
    childEnv.SUPABASE_PRIVATE_EVIDENCE_BUCKET=fixtureBucket;
  }
}else if(!['/Users/alexandrechagasleaocryptoboy/projects/a-praca-v1-5','/private/tmp/digitap-recovery-prod-db-01'].includes(root)){
  throw new Error('Diretório não autorizado.');
}
const cliEnv=g4?{HOME:childEnv.HOME,PATH:childEnv.PATH,TMPDIR:childEnv.TMPDIR,SUPABASE_TELEMETRY_DISABLED:'1'}:process.env;
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',root,'--output','json'],{env:cliEnv,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(local.API_URL!=='http://127.0.0.1:56151'||!local.SECRET_KEY?.startsWith('sb_secret_')||!local.PUBLISHABLE_KEY?.startsWith('sb_publishable_'))throw new Error('Stack local incompatível.');
const dbUrl=new URL(local.DB_URL);
if(dbUrl.hostname!=='127.0.0.1'||dbUrl.port!=='56152'||(g4&&dbUrl.pathname!=='/postgres'))throw new Error('Banco fora do escopo.');
// Refuse to reuse or stop an existing process, even on the approved port.
const guard=createServer();await new Promise((resolve,reject)=>guard.once('error',reject).listen(3215,'127.0.0.1',resolve));await new Promise(resolve=>guard.close(resolve));
if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out))throw new Error('Diretório inválido.');
mkdirSync(out,{recursive:!g4});
const secrets=[local.SECRET_KEY,local.PUBLISHABLE_KEY,local.SERVICE_ROLE_KEY,local.ANON_KEY,local.JWT_SECRET,local.DB_URL,childEnv.AI_GATEWAY_API_KEY].filter(Boolean);
const child=spawn('./node_modules/.bin/next',['dev','--hostname','127.0.0.1','--port','3215'],{cwd:root,env:{...childEnv,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:local.SECRET_KEY,SUPABASE_DB_URL:local.DB_URL,APP_ORIGIN:'http://127.0.0.1:3215'},stdio:['ignore','pipe','pipe']});
function record(data){let s=data.toString();for(const secret of secrets)s=s.replaceAll(secret,'[SEGREDO_OMITIDO]');s=s.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT_OMITIDO]').replace(/token_hash=[^\s&"<>]+/g,'token_hash=[OMITIDO]');appendFileSync(out+'/server.log',s);}
child.stdout.on('data',record);child.stderr.on('data',record);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{console.log('Next local encerrado.');process.exitCode=code??0;});
console.log('Next local iniciado em 127.0.0.1:3215; credenciais somente no ambiente do processo.');
