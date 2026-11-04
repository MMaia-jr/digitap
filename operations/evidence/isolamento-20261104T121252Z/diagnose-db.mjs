import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { Client } from 'pg';
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const url=new URL(local.DB_URL);
if(url.hostname!=='127.0.0.1'||url.port!=='56152'||local.API_URL!=='http://127.0.0.1:56151')throw new Error('Alvo fora do escopo.');
const db=new Client({connectionString:local.DB_URL});await db.connect();
try{
 const migrations=await db.query('select version,name from supabase_migrations.schema_migrations order by version');
 const rpc=await db.query("select to_regprocedure('public.criar_organizacao_pendente(uuid,text,text)')::text as function_name");
 const result={target:'127.0.0.1:56152',migrations:migrations.rows,rpc:rpc.rows[0]};
 await writeFile('operations/evidence/isolamento-20261104T121252Z/database-state.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await db.end();}
