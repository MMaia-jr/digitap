import pg from 'pg';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {fingerprint} from '../../../scripts/i4-backfill.mjs';
const phase=process.argv[2],dir='operations/evidence/incremento-i5-pf';
if(!['before','after'].includes(phase))throw new Error('Fase inválida.');
const db=new pg.Client('postgresql://postgres:postgres@127.0.0.1:56152/postgres');await db.connect();
try{
 await db.query('begin isolation level repeatable read read only');
 const names=['organizacoes','contas_acesso','atividades','registros_realizacao','evidencias','autorizacoes_publicacao','apoios','parceiros','eventos_editoriais','sujeitos_publicadores','pessoas_fisicas','coletivos_informais','vinculos_publicadores','atestacoes_representacao','casos_moderacao'];
 const permissions=(await db.query(`select c.relname,c.relrowsecurity,c.relacl::text,(select coalesce(jsonb_agg(to_jsonb(p) order by p.policyname),'[]') from pg_policies p where p.schemaname='public' and p.tablename=c.relname) policies from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1) order by c.relname`,[names])).rows;
 const definitions={};for(const signature of ['public.criar_organizacao_pendente(uuid,text,text)','public.criar_organizacao_com_sujeito(uuid,text,text)','public.i4_atividade_sujeito()']){
  const text=(await db.query('select pg_get_functiondef($1::regprocedure) definition',[signature])).rows[0].definition;
  definitions[signature]=createHash('sha256').update(text).digest('hex');
 }
 const state={fingerprints:await fingerprint(db),permissions,definitions};
 writeFileSync(dir+'/'+phase+'.json',JSON.stringify(state,null,2)+'\n');await db.query('commit');
 if(phase==='after'){
  const preserved=JSON.stringify(state)===JSON.stringify(JSON.parse(readFileSync(dir+'/before.json','utf8')));
  console.log(JSON.stringify({phase,preserved}));writeFileSync(dir+'/preservation-result.json',JSON.stringify({preserved},null,2)+'\n');if(!preserved)process.exitCode=1;
 }else console.log(JSON.stringify({phase,counts:Object.fromEntries(Object.entries(state.fingerprints).map(([k,v])=>[k,v.count]))}));
}finally{await db.end();}
