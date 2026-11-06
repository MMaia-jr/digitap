import pg from 'pg';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const migration='supabase/migrations/20261106030921_i4_cutover.sql';
const sql=readFileSync(migration,'utf8');
const db=new pg.Client('postgresql://postgres:postgres@127.0.0.1:56152/postgres');
await db.connect();
const results=[];
try{
  const preflight="SELECT (SELECT count(*) FROM public.atividades)::int AS atividades, (SELECT count(*) FROM public.organizacoes)::int AS organizacoes, (SELECT count(*) FROM public.contas_acesso)::int AS contas";
  console.log(preflight);const counts=(await db.query(preflight)).rows;console.log(JSON.stringify(counts,null,2));
  if(Object.values(counts[0]).some(n=>n!==0))throw new Error('Executor desta fase só autorizado para base local vazia e fixtures.');
  console.log('begin;');await db.query('begin');
  for(const match of sql.matchAll(/-- CUTOVER STEP ([A-Z]+)\n([\s\S]*?)(?=-- CUTOVER STEP|commit;\s*$)/g)){
    const [,step,statement]=match;console.log(statement.trim());await db.query(statement);
    let verify;
    if(['ROLE','ACCOUNT'].includes(step))verify="SELECT tc.constraint_name, cc.check_clause FROM information_schema.table_constraints tc JOIN information_schema.check_constraints cc ON cc.constraint_schema=tc.constraint_schema AND cc.constraint_name=tc.constraint_name WHERE tc.table_schema='public' AND tc.table_name='contas_acesso' AND tc.constraint_name IN ('contas_acesso_papel_check','papel_vinculo') ORDER BY tc.constraint_name";
    else if(['NULLABLE','REQUIRED'].includes(step))verify="SELECT column_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='atividades' AND column_name IN ('organizacao_id','sujeito_id','politica_publicacao') ORDER BY column_name";
    else if(step==='FUNCTION')verify="SELECT pg_get_functiondef('public.i4_atividade_sujeito()'::regprocedure) AS definition";
    else verify="SELECT trigger_name,event_manipulation,action_timing,action_statement FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table='atividades' AND trigger_name='i4_atividade_sujeito' ORDER BY event_manipulation";
    console.log(verify);const rows=(await db.query(verify)).rows;console.log(JSON.stringify(rows,null,2));
    if(!rows.length)throw new Error('Confirmação vazia após '+step);
    if(step==='NULLABLE'&&!rows.some(r=>r.column_name==='organizacao_id'&&r.is_nullable==='YES'))throw new Error('Nullability divergente.');
    if(step==='REQUIRED'&&rows.some(r=>r.column_name!=='organizacao_id'&&r.is_nullable!=='NO'))throw new Error('Referência obrigatória ausente.');
    results.push({step,sql:statement.trim(),verify,rows});
  }
  if(results.length!==6)throw new Error('Migration não corresponde às seis etapas esperadas.');
  console.log('commit;');await db.query('commit');
  const result={migration,sha256:createHash('sha256').update(sql).digest('hex'),applied:true,results};
  writeFileSync('operations/evidence/incremento-i4-cutover/migration-applied.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({migration,applied:true,steps:results.length}));
}catch(error){await db.query('rollback');console.error(error.code??'APPLICATION',error.message);process.exitCode=1;}
finally{await db.end();}
