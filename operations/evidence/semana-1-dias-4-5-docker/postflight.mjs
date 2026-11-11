// Read-only closeout: migration state and fixture cleanup, no application tests.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import pg from 'pg';
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const u=new URL(local.DB_URL);if(u.hostname!=='127.0.0.1'||u.port!=='56152')throw new Error('Alvo não autorizado');
const db=new pg.Client({connectionString:local.DB_URL,connectionTimeoutMillis:5000});
try{
 await db.connect();await db.query('begin read only');
 const migrated=(await db.query("select exists(select 1 from supabase_migrations.schema_migrations where version='20261111222337') as applied")).rows[0].applied;
 const rows=(await db.query('select count(*)::int n from public.confirmacoes')).rows[0].n;
 const users=(await db.query("select count(*)::int n from auth.users where email like 'confirmacao-%@example.invalid' or email like 'participacao-e2e-%@example.invalid'")).rows[0].n;
 const rls=(await db.query("select relrowsecurity from pg_class where oid='public.confirmacoes'::regclass")).rows[0].relrowsecurity;
 await db.query('commit');
 const report={checked_at:new Date().toISOString(),target:'127.0.0.1:56152',migration_applied:migrated,confirmacoes_rows_remaining:rows,new_module_fixture_users_remaining:users,rls_enabled:rls,application_tests_after_p0_stop:false,cloud_access:false};
 writeFileSync('operations/evidence/semana-1-dias-4-5-docker/postflight.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await db.end();}
