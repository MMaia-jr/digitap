import {execFileSync,spawn} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
const out='operations/evidence/semana-1-dias-4-5-docker',task=process.argv[2];
const jsonPath=`/tmp/digitap-local-${process.pid}-${task}.json`;
const commands={
 focused:['npm',['run','test:onboarding:db','--','tests/integration/participation.database.test.ts','--bail=1','--reporter=json',`--outputFile=${jsonPath}`]],
 integration:['npm',['run','test:onboarding:db','--','--bail=1','--reporter=json',`--outputFile=${jsonPath}`]],
 'integration-rest':['npm',['run','test:onboarding:db','--','--bail=1','--testNamePattern=^(?!.*B12 PostgreSQL: sem publicações elegíveis).*','--reporter=json',`--outputFile=${jsonPath}`]],
 'e2e-focused':['npm',['run','test:e2e','--','tests/e2e/participation.spec.mjs','--max-failures=1']],
 e2e:['npm',['run','test:e2e','--','--max-failures=1']],
 build:['npm',['run','build']],lint:['npm',['run','lint']],typecheck:['npm',['run','typecheck']],
};
if(!commands[task])throw new Error('Tarefa inválida');
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const u=new URL(local.DB_URL);if(local.API_URL!=='http://127.0.0.1:56151'||u.hostname!=='127.0.0.1'||u.port!=='56152')throw new Error('Alvo fora do escopo local.');
const secrets=[local.SECRET_KEY,local.PUBLISHABLE_KEY,local.SERVICE_ROLE_KEY,local.ANON_KEY,local.JWT_SECRET,local.DB_URL].filter(Boolean);
function sanitize(value){let text=value;for(const secret of secrets)text=text.replaceAll(secret,'[OMITIDO]');return text.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT_OMITIDO]').replace(/sb_secret_[A-Za-z0-9_-]+/g,'[SECRET_OMITIDO]').replace(/token_hash=[^\s&"<>]+/g,'token_hash=[OMITIDO]');}
const [cmd,args]=commands[task],started_at=new Date().toISOString();
const child=spawn(cmd,args,{env:{...process.env,A_PRACA_ALLOW_FIXTURE_CLEANUP:'1',A_PRACA_EVIDENCE_DIR:out,PLAYWRIGHT_BROWSERS_PATH:process.cwd()+'/.playwright-browsers'},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);
child.on('close',(code,signal)=>{
 writeFileSync(`${out}/${task}.log`,sanitize(output));
 const result={command:[cmd,...args].join(' '),started_at,finished_at:new Date().toISOString(),exit_code:code,signal};
 if(existsSync(jsonPath)){
  const raw=readFileSync(jsonPath,'utf8');unlinkSync(jsonPath);writeFileSync(`${out}/${task}-vitest.json`,sanitize(raw));
  const report=JSON.parse(raw);const counts={PASS:0,FAIL:0,SKIP:0};
  for(const suite of report.testResults??[])for(const t of suite.assertionResults??[]){const status={passed:'PASS',failed:'FAIL',pending:'SKIP',skipped:'SKIP'}[t.status];if(status)counts[status]++;if(t.status==='failed')console.log(sanitize(`${t.fullName}: ${t.failureMessages?.[0]?.slice(0,1500)}`));}
  result.counts=counts;
 }
 writeFileSync(`${out}/${task}-result.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 if(task.startsWith('e2e'))console.log(sanitize(output));
 process.exitCode=code??1;
});
