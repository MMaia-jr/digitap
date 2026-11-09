import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
const origin='http://127.0.0.1:3215',dir=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/registro-evidencia';
if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(dir))throw new Error('Diretório inválido.');
const title='Mutirão da horta — demonstração fictícia',relato='Na nossa demonstração fictícia, preparamos os canteiros, compartilhamos sementes e conversamos sobre o cuidado com a horta. O encontro reuniu vizinhos para aprender juntos e deixar o espaço mais acolhedor. Nenhum encontro real é representado por este teste.';
const photo='https://example.invalid/horta-demonstracao.jpg';
let db,admin,owner,editor;const fixtures=[];
async function makePerson(name,role){
 const email='relato-'+randomUUID()+'@example.invalid',password=randomUUID()+'aA1!';
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');
 const person={user:created.data.user.id,email,password};fixtures.push(person);
 const registered=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:person.user,p_nome_publico:name});if(registered.error)throw new Error('Fixture PF falhou.');person.subject=registered.data;
 if(role==='editor')await db.query("update public.contas_acesso set papel='editor' where auth_user_id=$1",[person.user]);return person;
}
test.beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures não autorizadas.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
 db=new Client(local.DB_URL);await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 owner=await makePerson('Ana — titular fictícia');editor=await makePerson('Editor de teste — fictício','editor');
});
test.afterAll(async()=>{
 try{for(const person of fixtures){await db.query('begin');try{
  const ids=(await db.query('select id from public.atividades where sujeito_id=$1',[person.subject])).rows.map(r=>r.id);
  const records=(await db.query('select id from public.registros_realizacao where atividade_id=any($1::uuid[])',[ids])).rows.map(r=>r.id);
  await db.query('delete from public.eventos_editoriais where objeto_id=any($1::uuid[]) or objeto_id=any($2::uuid[]) or objeto_id=$3',[ids,records,person.subject]);
  await db.query('delete from public.evidencias where registro_id=any($1::uuid[])',[records]);
  await db.query('delete from public.autorizacoes_publicacao where objeto_id=any($1::uuid[]) or objeto_id=any($2::uuid[])',[ids,records]);
  await db.query('delete from public.registros_realizacao where id=any($1::uuid[])',[records]);
  await db.query('delete from public.casos_moderacao where sujeito_id=$1',[person.subject]);
  await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
  await db.query('delete from public.vinculos_publicadores where sujeito_id=$1',[person.subject]);
  await db.query('delete from public.pessoas_fisicas where sujeito_id=$1',[person.subject]);
  await db.query('delete from public.sujeitos_publicadores where id=$1',[person.subject]);
  await db.query('delete from public.contas_acesso where auth_user_id=$1',[person.user]);await db.query('commit');
 }catch(error){await db.query('rollback');throw error;}
 if((await admin.auth.admin.deleteUser(person.user)).error)throw new Error('Limpeza Auth falhou.');}}finally{await db?.end();}
});
async function login(page,person){await page.goto('/login');await page.getByLabel('E-mail',{exact:true}).fill(person.email);await page.getByLabel('Senha',{exact:true}).fill(person.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(origin+(person===editor?'/admin/atividades':'/dashboard/pessoa-fisica'));}
async function capture(page,path){
 await page.evaluate(()=>{document.activeElement?.blur?.();document.documentElement.style.scrollBehavior='auto';});
 await expect.poll(()=>page.evaluate(()=>{window.scrollTo({top:0,behavior:'instant'});return window.scrollY;})).toBe(0);
 await page.screenshot({path,fullPage:true,animations:'disabled'});
}
test('EVID-01: publicar atividade → registrar relato PF → revisão editorial → evidência pública',async({browser})=>{
 const ownerContext=await browser.newContext({viewport:{width:1440,height:1050}}),editorContext=await browser.newContext(),visitorContext=await browser.newContext({viewport:{width:1440,height:1050}});
 try{
  const page=await ownerContext.newPage(),reviewer=await editorContext.newPage(),visitor=await visitorContext.newPage();
  await login(page,owner);await login(reviewer,editor);
  const created=await page.request.post('/api/atividades',{headers:{origin},data:{titulo:title,descricao:'Atividade de demonstração para testar o registro de realização e a revisão editorial. Todos os dados desta atividade são fictícios.',inicio_previsto:new Date().toISOString(),acontecendo_agora:true,orientacao_acesso:'Demonstração fictícia, sem local ou participação real.'}});expect(created.status()).toBe(200);const id=(await created.json()).atividade.id;
  expect((await page.request.post('/api/atividades/'+id+'/enviar',{headers:{origin},data:{versao_esperada:1,autoriza_publicacao:true}})).status()).toBe(200);
  expect((await reviewer.request.post('/api/admin/atividades/'+id+'/decidir',{headers:{origin},data:{acao:'aprovar_publicacao',versao_esperada:1,pedido_id:randomUUID()}})).status()).toBe(200);
  const snapshotBefore=(await db.query('select versao_publicada from public.atividades where id=$1',[id])).rows[0].versao_publicada;
  const endpoint='/api/atividades/'+id+'/realizacao';
  const body={pedido_id:randomUUID(),versao_esperada:1,relato,participantes:12,url:photo,autoriza_publicacao:true};
  expect((await visitor.request.post(endpoint,{headers:{origin},data:body})).status()).toBe(401);
  expect((await reviewer.request.post(endpoint,{headers:{origin},data:body})).status()).toBe(404);
  expect((await page.request.post(endpoint,{headers:{origin},data:{...body,url:'http://127.0.0.1/private.jpg'}})).status()).toBe(422);
  expect((await db.query('select count(*)::int as n from public.registros_realizacao where atividade_id=$1',[id])).rows[0].n).toBe(0);
  await page.goto('/dashboard/pessoa-fisica');await page.getByRole('link',{name:'Registrar que aconteceu',exact:true}).click();
  await expect(page).toHaveURL(origin+'/dashboard/pessoa-fisica/atividade/'+id+'/evidencia');
  await page.getByLabel('O que aconteceu?',{exact:true}).fill(relato);await page.getByLabel('Quantas pessoas participaram?',{exact:true}).fill('12');await page.getByLabel('Link da foto ou vídeo (opcional)',{exact:true}).fill(photo);await page.getByLabel('Autorizo divulgar este relato',{exact:false}).check();
  await capture(page,dir+'/formulario.png');
  const saved=page.waitForResponse(r=>r.url()===origin+endpoint&&r.request().method()==='POST');const sent=page.waitForRequest(r=>r.url()===origin+endpoint&&r.method()==='POST');await page.getByRole('button',{name:'Salvar e enviar para revisão',exact:true}).click();const submitted=(await sent).postDataJSON();expect((await saved).status()).toBe(200);
  await expect(page).toHaveURL(origin+'/dashboard/pessoa-fisica?registro=enviado');await expect(page.getByText('✓ Evidência registrada',{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Registrar que aconteceu',exact:true})).toHaveCount(0);
  expect((await page.request.post(endpoint,{headers:{origin},data:submitted})).status()).toBe(200);
  expect((await db.query('select count(*)::int as n from public.registros_realizacao where atividade_id=$1',[id])).rows[0].n).toBe(1);
  expect((await visitor.request.get('/api/public/atividades/'+id+'/registro')).status()).toBe(404);
  expect((await page.request.post('/api/admin/atividades/'+id+'/relato',{headers:{origin},data:{acao:'aprovar',conteudo_esperado:'a'.repeat(64),evidencias_aprovadas:[]}})).status()).toBe(403);
  await visitor.goto('/atividade/'+id);await expect(visitor.getByRole('heading',{name:'Esta atividade já aconteceu',exact:true})).toHaveCount(0);
  await reviewer.goto('/admin/atividades');const item=reviewer.locator('article').filter({has:reviewer.getByRole('heading',{name:title,exact:true})});await expect(item.getByText('12 participantes declarados',{exact:true})).toBeVisible();await item.getByLabel('Autorizar esta referência na página pública',{exact:true}).check();await item.getByRole('button',{name:'Aprovar e publicar relato',exact:true}).click();await expect(item).toHaveCount(0);
  await visitor.route(photo,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500"><defs><linearGradient id="g"><stop stop-color="#0f766e"/><stop offset="1" stop-color="#99f6cf"/></linearGradient></defs><rect width="1200" height="500" fill="url(#g)"/><path d="M0 420Q300 150 650 370T1200 280V500H0" fill="#065f46"/><circle cx="960" cy="100" r="55" fill="#fde68a"/><text x="60" y="110" fill="white" font-family="sans-serif" font-size="35">Horta compartilhada · demonstração visual</text><text x="60" y="160" fill="white" font-family="sans-serif" font-size="22">Ilustração fictícia — nenhum encontro real representado</text></svg>'}));
  await visitor.reload();const section=visitor.locator('.realization-public');await expect(section.getByRole('heading',{name:'Esta atividade já aconteceu',exact:true})).toBeVisible();await expect(section.getByText('12',{exact:true})).toBeVisible();await expect(section.getByRole('img')).toBeVisible();await expect(section.getByText(/^Registrado em/)).toBeVisible();await expect(section.locator('.realization-story')).toHaveText(Array.from(relato).slice(0,200).join('')+'…');
  const published=(await visitor.request.get('/api/public/atividades/'+id+'/registro'));expect(published.status()).toBe(200);
  expect((await db.query('select estado_apuracao from public.registros_realizacao where atividade_id=$1',[id])).rows[0].estado_apuracao).toBe('declarado');
  expect((await db.query('select versao_publicada from public.atividades where id=$1',[id])).rows[0].versao_publicada).toEqual(snapshotBefore);
  await capture(visitor,dir+'/atividade-com-evidencia.png');await section.screenshot({path:dir+'/evidencia-publica.png'});
  await visitor.setViewportSize({width:390,height:844});expect(await visitor.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await capture(visitor,dir+'/atividade-mobile.png');
  console.log('EVID-01: isolamento 401/404/403; rollback de URL inválida; envio idempotente; privado antes da revisão; público após aprovação; apuração declarado; snapshot da atividade preservado.');
 }finally{await ownerContext.close();await editorContext.close();await visitorContext.close();}
});
