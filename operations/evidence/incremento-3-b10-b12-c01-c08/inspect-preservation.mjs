import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Client} from 'pg';
const base='1aa8f1ab1efeff2a915a8037f0367a53b4a5509f';
const root=process.cwd();if(root!=='/Users/alexandrechagasleaocryptoboy/projects/a-praca-v1-5')throw new Error('Diretório não autorizado.');
// Split SQL declarations at top-level commas, including several columns per
// line and the final declaration without a trailing comma. Not a SQL executor.
function declarations(body){
 const result=[];let quoted=false,depth=0,start=0;
 for(let i=0;i<body.length;i++){
  const c=body[i];
  if(c==="'"){if(quoted&&body[i+1]==="'"){i++;continue;}quoted=!quoted;}
  if(quoted)continue;
  if(c==='(')depth++;if(c===')')depth--;
  if(c===','&&depth===0){result.push(body.slice(start,i).trim());start=i+1;}
 }
 result.push(body.slice(start).trim());return result;
}
async function inspect(){
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',root,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const url=new URL(local.DB_URL);if(url.hostname!=='127.0.0.1'||url.port!=='56152'||url.pathname!=='/postgres')throw new Error('Banco fora do escopo.');
 const foundation='supabase/migrations/20261103221114_security_foundation.sql';
 const source=execFileSync('git',['show',base+':'+foundation],{encoding:'utf8'});
 const definitions=[...source.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g)];
 if(definitions.length!==9)throw new Error('Referência inesperada.');
 const expected=definitions.map(([,name,body])=>({name,columns:declarations(body).flatMap(fragment=>{
  const m=fragment.match(/^(\w+)\s+(uuid|text(?:\[\])?|timestamptz|integer|jsonb|boolean|date)(?=\s|$)([\s\S]*)/);
  return m?[{name:m[1],type:m[2]==='timestamptz'?'timestamp with time zone':m[2],not_null:/not null|primary key/i.test(m[3])}]:[];
 }),counts:{c:(body.match(/\bcheck\s*\(/gi)||[]).length,f:(body.match(/\breferences\b/gi)||[]).length,p:(body.match(/\bprimary key\b/gi)||[]).length,u:(body.match(/\bunique\b/gi)||[]).length}}));
 const result={read_only:true,base,tables:[],migrations:[],migrations_sha256:{},findings:[]};
 const db=new Client({connectionString:local.DB_URL});await db.connect();
 try{
  await db.query('begin read only');
  const names=(await db.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(r=>r.tablename);
  if(JSON.stringify(names)!==JSON.stringify(expected.map(v=>v.name).sort()))result.findings.push('Conjunto de tabelas divergiu.');
  for(const table of expected){
   const qualified='public.'+table.name;
   const rls=(await db.query('select relrowsecurity from pg_class where oid=$1::regclass',[qualified])).rows[0].relrowsecurity;
   const columns=(await db.query('select attname as name,format_type(atttypid,atttypmod) as type,attnotnull as not_null from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped order by attnum',[qualified])).rows;
   const counts={c:0,f:0,p:0,u:0};for(const row of (await db.query("select contype,count(*)::int n from pg_constraint where conrelid=$1::regclass and contype in ('c','f','p','u') group by contype",[qualified])).rows)counts[row.contype]=row.n;
   const constraints=(await db.query('select conname as name,contype as kind,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid=$1::regclass order by conname',[qualified])).rows;
   const indexes=(await db.query('select indexname,indexdef from pg_indexes where schemaname=$1 and tablename=$2 order by indexname',['public',table.name])).rows;
   const explicitIndexes=[...source.matchAll(/create index (\w+) on public\.(\w+)/g)].filter(m=>m[2]===table.name).length;
   const clientPrivileges={};for(const role of ['anon','authenticated'])clientPrivileges[role]=(await db.query("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') allowed",[role,qualified])).rows[0].allowed;
   const publicACL=(await db.query("select count(*)::int n from pg_class c, lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.oid=$1::regclass and a.grantee=0",[qualified])).rows[0].n;
   const service={};for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])service[privilege]=(await db.query('select has_table_privilege($1,$2,$3) allowed',['service_role',qualified,privilege])).rows[0].allowed;
   const policies=(await db.query("select count(*)::int n from pg_policies where schemaname='public' and tablename=$1",[table.name])).rows[0].n;
   const checks={columns_match_baseline:JSON.stringify(columns)===JSON.stringify(table.columns),constraint_counts_match:JSON.stringify(counts)===JSON.stringify(table.counts),index_count_match:indexes.length===explicitIndexes+table.counts.p+table.counts.u};
   if(!rls||Object.values(checks).some(v=>!v)||Object.values(clientPrivileges).some(Boolean)||publicACL||policies||Object.values(service).some(v=>!v))result.findings.push('Divergência: '+table.name);
   result.tables.push({name:table.name,rls,...checks,columns,constraints,indexes,client_privileges:clientPrivileges,public_grants:publicACL,policies,service_role:service});
  }
  result.migrations=(await db.query('select version,name from supabase_migrations.schema_migrations order by version')).rows;
  if(result.migrations.map(v=>v.version).join(',')!=='20261103221114,20261103230507')result.findings.push('Histórico de migrações divergiu.');
  for(const path of [foundation,'supabase/migrations/20261103230507_organization_onboarding.sql']){const before=execFileSync('git',['show',base+':'+path]);const current=readFileSync(path);if(!before.equals(current))result.findings.push('Migração modificada: '+path);result.migrations_sha256[path]=createHash('sha256').update(current).digest('hex');}
  await db.query('rollback');
 }finally{await db.end();}
 writeFileSync('operations/evidence/incremento-3-b10-b12-c01-c08/catalog.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({read_only:true,tables_checked:result.tables.length,findings:result.findings}));if(result.findings.length)process.exitCode=1;
}
inspect().catch(()=>{console.error('Inspeção não concluída; detalhes omitidos para proteger credenciais.');process.exitCode=1;});
