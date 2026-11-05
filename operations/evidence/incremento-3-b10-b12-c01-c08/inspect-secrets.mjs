import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,statSync,existsSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {join} from 'node:path';
const root=process.cwd();if(root!=='/Users/alexandrechagasleaocryptoboy/projects/a-praca-v1-5')throw new Error('Diretório fora do escopo.');
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const known=[local.SECRET_KEY,local.SERVICE_ROLE_KEY,local.JWT_SECRET,local.DB_URL].filter(Boolean);
let hmac=false;
for(const file of readdirSync('.').filter(name=>name.startsWith('.env')&&name!=='.env.example')){
 if(!statSync(file).isFile())continue;const env=parseEnv(readFileSync(file,'utf8'));
 for(const key of ['SUPABASE_SECRET_KEY','APOIO_HMAC_SECRET','SUPABASE_DB_URL'])if(env[key]&&!/SUBSTITUIR|SOMENTE_SERVIDOR|SEGREDO_ALEATORIO/.test(env[key])){known.push(env[key]);if(key==='APOIO_HMAC_SECRET')hmac=true;}
}
const changed=execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim().split('\n');
const added=execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n');
const files=new Set([...changed,...added].filter(Boolean));
function walk(path){if(!existsSync(path))return;for(const item of readdirSync(path,{withFileTypes:true})){const file=join(path,item.name);if(item.isDirectory())walk(file);else if(item.isFile())files.add(file);}}
walk('.next/static');walk('public');
const findings=[];let count=0;
for(const path of files){if(!existsSync(path)||!statSync(path).isFile())continue;const data=readFileSync(path);count++;if(known.some(value=>data.includes(Buffer.from(value))))findings.push({path,kind:'known-secret-value'});}
const result={files_checked:count,findings,scope:'Arquivos novos/modificados não ignorados + .next/static + public. Valores reais conhecidos comparados somente em memória; nenhum valor impresso.',hmac_configured:hmac,limits:'Não detecta todo segredo desconhecido; .env privados ignorados não são conteúdo versionável. Artefatos server-side não são bundle público. HTML/HTTP real também verificado no Chromium B07.'};
writeFileSync('operations/evidence/incremento-3-b10-b12-c01-c08/secret-values.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({files_checked:count,findings}));if(findings.length)process.exitCode=1;
