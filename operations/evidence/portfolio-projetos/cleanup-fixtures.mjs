// Exact fixture subjects from the two interrupted local setup attempts.
import {execFileSync} from 'node:child_process';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
const ids=['7ab95163-4114-4d7f-9270-27262d36db9f','074281e9-4502-413a-8c5c-97910ce23b05','61b080a8-6a50-4102-9bc9-7e5aa63c204c','8f045e75-1ef9-4c18-a32f-3462dfc595c5','56f10dd7-0cb7-4d46-9f30-684eb4521120','f521f6c9-c9ba-49f7-b24c-cfc9511d8721','1f4720b1-19e1-492f-a7b1-03dc37e54b53','a8b67b66-c6cf-4879-ab00-a755a9f1f13e'];
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).port!=='56152')throw new Error('Somente stack local.');
const db=new Client(local.DB_URL);await db.connect();
try{
 const rows=(await db.query(`select s.id,s.organizacao_legada_id,c.id as conta_id,c.auth_user_id,u.email from public.sujeitos_publicadores s join public.contas_acesso c on c.id=s.criado_por_conta_id join auth.users u on u.id=c.auth_user_id where s.id=any($1::uuid[])`,[ids])).rows;
 if(rows.some(r=>! /^(relato-|portfolio-org-)[0-9a-f-]+@example\.invalid$/.test(r.email)))throw new Error('Fixture incompatível.');
 const activityCount=(await db.query('select count(*)::int as n from public.atividades where sujeito_id=any($1::uuid[])',[ids])).rows[0].n;
 if(activityCount)throw new Error('Setup deveria estar sem atividades.');
 await db.query('begin');
 await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])',[ids]);
 await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])',[ids]);
 await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[ids]);
 await db.query('delete from public.contas_acesso where id=any($1::uuid[])',[rows.map(r=>r.conta_id)]);
 await db.query('delete from public.organizacoes where id=any($1::uuid[])',[rows.flatMap(r=>r.organizacao_legada_id?[r.organizacao_legada_id]:[])]);
 await db.query('commit');
 const admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(const row of rows)if((await admin.auth.admin.deleteUser(row.auth_user_id)).error)throw new Error('Limpeza Auth falhou.');
 console.log(JSON.stringify({removedFixtures:rows.length,scope:'Exact IDs from interrupted setup; no activities present'}));
}finally{await db.end();}
