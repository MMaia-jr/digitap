import pg from 'pg';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fingerprint } from '../../../scripts/i4-backfill.mjs';

const phase=process.argv[2];
if(!['before','after'].includes(phase))throw new Error('Fase inválida.');
const dir='operations/evidence/incremento-i4-compat';
const db=new pg.Client('postgresql://postgres:postgres@127.0.0.1:56152/postgres');
await db.connect();
try {
  await db.query('begin isolation level repeatable read read only');
  const tables=['organizacoes','contas_acesso','atividades','registros_realizacao','evidencias','autorizacoes_publicacao','apoios','parceiros','eventos_editoriais'];
  const permissions=(await db.query(`select c.relname,c.relrowsecurity,c.relacl::text,
    (select coalesce(jsonb_agg(to_jsonb(p) order by p.policyname),'[]') from pg_policies p where p.schemaname='public' and p.tablename=c.relname) policies
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[]) order by c.relname`,[tables])).rows;
  const legacy=(await db.query("select pg_get_functiondef('public.criar_organizacao_pendente(uuid,text,text)'::regprocedure) definition")).rows[0].definition;
  const current={fingerprints:await fingerprint(db),permissions,legacyFunctionSha256:createHash('sha256').update(legacy).digest('hex')};
  const baseline=phase==='after'?JSON.parse(readFileSync(dir+'/before.json','utf8')):null;
  const preserved=baseline?JSON.stringify(current)===JSON.stringify(baseline):null;
  writeFileSync(dir+'/'+phase+'.json',JSON.stringify(current,null,2)+'\n');
  await db.query('commit');
  if(baseline){writeFileSync(dir+'/preservation-result.json',JSON.stringify({preserved},null,2)+'\n');if(!preserved)throw new Error('Preservação divergiu.');}
  console.log(JSON.stringify({phase,preserved,counts:Object.fromEntries(Object.entries(current.fingerprints).map(([k,v])=>[k,v.count]))}));
} finally {await db.end();}
