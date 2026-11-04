import { execFileSync } from 'node:child_process';
import { readdir,readFile,writeFile } from 'node:fs/promises';
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(local.API_URL!=='http://127.0.0.1:56151')throw new Error('Alvo não autorizado.');
const needles=[local.SECRET_KEY,local.SERVICE_ROLE_KEY,local.JWT_SECRET,process.env.APOIO_HMAC_SECRET].filter(Boolean);
const files=[];
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory())await walk(path);else files.push(path);}}
await walk('.next/static');await walk('operations/evidence/incremento-2c');
const matches=[];for(const file of files){const buffer=await readFile(file);if(needles.some(v=>buffer.includes(Buffer.from(v))))matches.push(file);}
const result={files_scanned:files.length,secret_value_matches:matches.length,files:matches,hmac:'Nenhum segredo HMAC configurado neste incremento; apoio fora do escopo.',scope:'Artefatos estáticos públicos do build e evidências desta execução; comparação em memória sem impressão de valores.'};
await writeFile('operations/evidence/incremento-2c/secret-values.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));if(matches.length)process.exitCode=1;
