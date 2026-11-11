import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
test.describe.configure({mode:'serial'});
const origin='http://127.0.0.1:3215',people=[],subjects=[],ids=[],authorizations=[],observations=[];
let db,admin,org,visitorContext,visitor;
const content=()=>({titulo:'Participação Fictícia '+randomUUID(),descricao:'Encontro fictício para testar apoio e intenção de presença.',inicio_previsto:new Date(Date.now()+3*86400000).toISOString(),orientacao_acesso:'Local fictício, sem encontro real.'});
const endpoint=id=>'/api/atividades/'+id+'/confirmacoes';
async function post(page,path,data){return page.request.post(path,{headers:{origin},data});}
async function createActivity(publish=true){
 const response=await post(people[2].page,'/api/atividades',content());expect(response.status()).toBe(200);
 const activity=(await response.json()).atividade;ids.push(activity.id);
 if(!publish)return activity;
 expect((await post(people[2].page,'/api/atividades/'+activity.id+'/enviar',{versao_esperada:1})).status()).toBe(200);
 const auth=randomUUID();authorizations.push(auth);
 await db.query("insert into public.autorizacoes_publicacao(id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em) values($1,'atividade',$2,$3,'Responsável fictício','Autorização fictícia E2E',now()-interval '1 minute')",[auth,activity.id,['divulgacao','atividade:versao:1']]);
 for(const command of [{acao:'iniciar',estado_esperado:'enviada'},{acao:'aprovar',estado_esperado:'em_revisao',autorizacao_id:auth}])expect((await post(people[3].page,'/api/admin/atividades/'+activity.id+'/revisar',{...command,versao_esperada:1,pedido_id:randomUUID()})).status()).toBe(200);
 expect((await post(people[3].page,'/api/admin/atividades/'+activity.id+'/publicar',{versao_esperada:1,pedido_id:randomUUID()})).status()).toBe(200);
 return activity;
}
async function context(browser){
 const context=await browser.newContext({baseURL:origin});
 await context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'&&['3215','56151'].includes(u.port)?route.continue():route.abort();});
 return context;
}
test.beforeAll(async({browser})=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures/limpeza não autorizadas.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const url=new URL(local.DB_URL);if(local.API_URL!=='http://127.0.0.1:56151'||url.hostname!=='127.0.0.1'||url.port!=='56152')throw new Error('Somente ambiente local.');
 db=new Client(local.DB_URL);await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<4;i++){
  const person={email:`participacao-e2e-${randomUUID()}@example.invalid`,password:randomUUID()+'aA1!',name:'Pessoa Fictícia Participação E2E '+i};people.push(person);
  const result=await admin.auth.admin.createUser({email:person.email,password:person.password,email_confirm:true});if(result.error||!result.data.user)throw new Error('Fixture Auth falhou.');person.id=result.data.user.id;
  if(i<2){const result=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:person.id,p_nome_publico:person.name});if(result.error)throw new Error('Fixture PF falhou.');person.subject=result.data;subjects.push(result.data);}
  else if(i===2){const result=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:person.id,p_nome_publico:'Organização Fictícia Participação E2E',p_canal_publico:null});if(result.error)throw new Error('Fixture org falhou.');org=result.data;await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[org]);subjects.push((await db.query('select id from public.sujeitos_publicadores where organizacao_legada_id=$1',[org])).rows[0].id);}
  else await db.query("insert into public.contas_acesso(auth_user_id,papel) values($1,'editor')",[person.id]);
  person.context=await context(browser);person.page=await person.context.newPage();
  await person.page.goto('/login');await person.page.getByLabel('E-mail',{exact:true}).fill(person.email);await person.page.getByLabel('Senha',{exact:true}).fill(person.password);await person.page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(person.page).toHaveURL(origin+(i<2?'/dashboard/pessoa-fisica':i===2?'/dashboard':'/admin/atividades'));
 }
 visitorContext=await context(browser);visitor=await visitorContext.newPage();
},90000);
test.afterAll(async()=>{
 for(const person of people)await person.context?.close();await visitorContext?.close();
 if(db){
  const users=people.map(p=>p.id).filter(Boolean);await db.query('begin');
  try{
   await db.query('delete from public.confirmacoes where atividade_id=any($1::uuid[]) or sujeito_id=any($2::uuid[])',[ids,subjects]);
   await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);
   await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[authorizations]);
   await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
   await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))',[users]);
   await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])',[subjects]);
   await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[subjects]);
   await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);
   if(org)await db.query('delete from public.organizacoes where id=$1',[org]);await db.query('commit');
  }catch(error){await db.query('rollback');throw error;}
  for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza Auth falhou.');await db.end();
 }
 const out=process.env.A_PRACA_EVIDENCE_DIR;if(out&&!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out))throw new Error('Diretório inválido.');
 if(out)writeFileSync(out+'/participation-observations.json',JSON.stringify({observations,backend:'Auth/PostgreSQL/Next reais locais; nenhuma API simulada',cleanup:'Somente fixtures próprias desta execução'},null,2)+'\n');
});
test('PART-01: PF apoia pela UI; organizador recebe somente contadores reais',async()=>{
 const activity=await createActivity();const page=people[0].page;
 await page.goto('/atividade/'+activity.id);await expect(page.getByRole('button',{name:'Apoiar',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Apoiar',exact:true}).click();await expect(page.getByText('Você já registrou apoio simbólico nesta atividade.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Vou Participar',exact:true})).toBeDisabled();
 const counts=await people[2].page.request.get(endpoint(activity.id)+'/resumo');expect(counts.status()).toBe(200);expect(await counts.json()).toEqual({apoios:1,intencoes:0});
 expect((await people[1].page.request.get(endpoint(activity.id)+'/resumo')).status()).toBe(403);
 await people[2].page.goto('/dashboard');const row=people[2].page.locator('li').filter({has:people[2].page.getByRole('link',{name:activity.titulo,exact:true})});await expect(row.getByText('1 apoios',{exact:true})).toBeVisible();
 await expect(row).not.toContainText(people[0].name);observations.push({id:'PART-01',aggregate:{apoios:1,intencoes:0},foreign_counts:403});
});
test('PART-02: intenção privada e consentida; WhatsApp nunca aparece publicamente',async()=>{
 const activity=await createActivity();const phone='+5522999999999';
 for(let i=0;i<2;i++){
  const page=people[i].page;await page.goto('/atividade/'+activity.id);await expect(page.getByRole('button',{name:'Vou Participar',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Vou Participar',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.getByLabel('WhatsApp (opcional)',{exact:true}).fill(phone);await page.getByLabel('Quantidade de pessoas, incluindo você',{exact:true}).fill('3');if(i)await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Registrar intenção',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByText('Você já registrou intenção de presença nesta atividade.',{exact:true})).toBeVisible();
 }
 await visitor.goto('/atividade/'+activity.id);await expect(visitor.locator('.participation-names').getByText(people[1].name,{exact:true})).toBeVisible();await expect(visitor.locator('.participation-names')).not.toContainText(people[0].name);await expect(visitor.locator('.participation-panel')).not.toContainText(phone);
 const response=await visitor.request.get(endpoint(activity.id));expect(response.status()).toBe(200);const data=await response.json();expect(data.minha_confirmacao).toBeNull();expect(data.resumo).toEqual({apoios:0,intencoes:2,nomes_publicos:[people[1].name],aberta:true});expect(JSON.stringify(data)).not.toContain(phone);
 const stored=(await db.query('select acompanhantes,mostrar_nome,whatsapp from public.confirmacoes where atividade_id=$1 order by mostrar_nome',[activity.id])).rows;expect(stored).toEqual([{acompanhantes:3,mostrar_nome:false,whatsapp:phone},{acompanhantes:3,mostrar_nome:true,whatsapp:phone}]);
 expect((await post(people[0].page,endpoint(activity.id),{tipo:'apoio'})).status()).toBe(409);observations.push({id:'PART-02',consented_names:1,intentions:2,duplicate:409,phone_public:false});
});
test('PART-03: visitante, CSRF e identidade forjada não registram; rascunho não vaza',async()=>{
 const activity=await createActivity();await visitor.goto('/atividade/'+activity.id);await expect(visitor.getByRole('button',{name:'Apoiar',exact:true})).toBeDisabled();
 expect((await post(visitor,endpoint(activity.id),{tipo:'apoio'})).status()).toBe(401);
 expect((await people[0].page.request.post(endpoint(activity.id),{headers:{origin:'https://evil.invalid'},data:{tipo:'apoio'}})).status()).toBe(403);
 expect((await post(people[0].page,endpoint(activity.id),{tipo:'apoio',sujeito_id:people[1].subject})).status()).toBe(422);
 const draft=await createActivity(false);await visitor.goto('/');await expect(visitor.getByRole('main')).not.toContainText(draft.titulo);
 const denied=await post(people[0].page,endpoint(draft.id),{tipo:'apoio'});expect(denied.status()).not.toBe(200);
 expect((await db.query('select count(*)::int n from public.confirmacoes where atividade_id=any($1::uuid[])',[[activity.id,draft.id]])).rows[0].n).toBe(0);observations.push({id:'PART-03',anonymous:401,csrf:403,forged_subject:422,draft_confirmation_status:denied.status(),draft_public:false});
});
test('PART-04: UNIQUE em concorrência HTTP e cancelamento bloqueia novas intenções',async()=>{
 const activity=await createActivity();const results=await Promise.all(Array.from({length:4},()=>post(people[0].page,endpoint(activity.id),{tipo:'apoio'})));expect(results.filter(r=>r.status()===200)).toHaveLength(1);expect(results.filter(r=>r.status()===409)).toHaveLength(3);
 expect((await db.query('select count(*)::int n from public.confirmacoes where atividade_id=$1',[activity.id])).rows[0].n).toBe(1);
 await db.query("update public.atividades set estado_programacao='cancelada' where id=$1",[activity.id]);
 expect((await post(people[1].page,endpoint(activity.id),{tipo:'intencao'})).status()).toBe(409);
 await people[1].page.goto('/atividade/'+activity.id);await expect(people[1].page.getByRole('button',{name:'Vou Participar',exact:true})).toBeDisabled();observations.push({id:'PART-04',concurrent_success:1,concurrent_conflicts:3,cancelled:409});
});
