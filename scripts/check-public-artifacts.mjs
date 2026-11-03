import { readdir,readFile,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const files=[];
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const full=path+'/'+entry.name;if(entry.isDirectory())await walk(full);else files.push(full);}}
await walk('.next/static');const forbidden=/SUPABASE_SECRET_KEY|APOIO_HMAC_SECRET|sb_secret_/;const matches=[];
for(const file of files)if(forbidden.test(await readFile(file,'utf8')))matches.push(file);
const result={filesScanned:files.length,matches,note:'Verifica nomes/prefixos privados nos artefatos públicos. Nenhuma credencial real foi configurada; não substitui teste de vazamento com segredos sintéticos e sessão real.'};
await writeFile('operations/evidence/incremento-2/public-artifacts.json',JSON.stringify(result,null,2)+'\n');assert.equal(matches.length,0,'Referência privada no bundle público.');console.log(`${files.length} artefatos públicos verificados; nenhuma referência privada detectada.`);
