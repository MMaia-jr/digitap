import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
const origin='http://127.0.0.1:3215',dir=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/portfolio-gestao';
if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(dir))throw new Error('Diretório inválido.');
const relato='Na nossa demonstração fictícia, preparamos os canteiros, compartilhamos sementes e conversamos sobre o cuidado com a horta. O encontro reuniu vizinhos para aprender juntos e deixar o espaço mais acolhedor. Nenhum encontro real é representado por este teste.';
const photo='https://example.invalid/portfolio-horta.jpg';
let db,admin,owner,editor,organization;const fixtures=[];
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
 owner=await makePerson('Ana Ribeiro — produtora cultural fictícia');editor=await makePerson('Editor de teste — fictício','editor');
 const email='portfolio-org-'+randomUUID()+'@example.invalid',password=randomUUID()+'aA1!';
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw new Error('Fixture Auth organização falhou.');
 organization={user:created.data.user.id,email,password};fixtures.push(organization);
 const registered=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:organization.user,p_nome_publico:'Associação Raízes do Vale — fictícia',p_canal_publico:null});if(registered.error)throw new Error('Fixture organização falhou.');organization.org=registered.data;
 organization.subject=(await db.query('select id from public.sujeitos_publicadores where organizacao_legada_id=$1',[organization.org])).rows[0].id;

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
  await db.query('delete from public.contas_acesso where auth_user_id=$1',[person.user]);if(person.org)await db.query('delete from public.organizacoes where id=$1',[person.org]);await db.query('commit');
 }catch(error){await db.query('rollback');throw error;}
 if((await admin.auth.admin.deleteUser(person.user)).error)throw new Error('Limpeza Auth falhou.');}}finally{await db?.end();}
});
async function login(page,person){await page.goto('/login');await page.getByLabel('E-mail',{exact:true}).fill(person.email);await page.getByLabel('Senha',{exact:true}).fill(person.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(origin+(person===editor?'/admin/atividades':person===organization?'/dashboard':'/dashboard/pessoa-fisica'));}
async function capture(page,path){
 await page.evaluate(()=>{document.activeElement?.blur?.();document.documentElement.style.scrollBehavior='auto';});
 await expect.poll(()=>page.evaluate(()=>{window.scrollTo({top:0,behavior:'instant'});return window.scrollY;})).toBe(0);
 await page.screenshot({path,fullPage:true,animations:'disabled'});
}
test('PORT-01: portfólio público reúne atividades e relatos aprovados; gestão PF/organização e impressão',async({browser})=>{
 const ownerContext=await browser.newContext({viewport:{width:1440,height:1050}}),editorContext=await browser.newContext(),orgContext=await browser.newContext({viewport:{width:1440,height:1050}}),visitorContext=await browser.newContext({viewport:{width:1440,height:1050}});
 try{
  const page=await ownerContext.newPage(),reviewer=await editorContext.newPage(),orgPage=await orgContext.newPage(),visitor=await visitorContext.newPage();
  await Promise.all([login(page,owner),login(reviewer,editor),login(orgPage,organization)]);
  const publicIds=[],titles=['Horta comunitária: sementes para o amanhã','Oficina de saberes e reaproveitamento'];
  for(const titulo of [...titles,'RASCUNHO_PRIVADO_PORTFOLIO']){
   const response=await page.request.post('/api/atividades',{headers:{origin},data:{titulo,descricao:'Uma demonstração fictícia de atuação comunitária, reunindo trocas de saberes, cuidado com o território e criação coletiva. Não representa um encontro real.',inicio_previsto:new Date().toISOString(),acontecendo_agora:true,orientacao_acesso:'Demonstração fictícia, sem local ou inscrições reais.'}});expect(response.status()).toBe(200);const id=(await response.json()).atividade.id;
   if(titulo==='RASCUNHO_PRIVADO_PORTFOLIO')continue;
   publicIds.push(id);expect((await page.request.post('/api/atividades/'+id+'/enviar',{headers:{origin},data:{versao_esperada:1,autoriza_publicacao:true}})).status()).toBe(200);
   expect((await reviewer.request.post('/api/admin/atividades/'+id+'/decidir',{headers:{origin},data:{acao:'aprovar_publicacao',versao_esperada:1,pedido_id:randomUUID()}})).status()).toBe(200);
  }
  for(let i=0;i<publicIds.length;i++){
   const id=publicIds[i];expect((await page.request.post('/api/atividades/'+id+'/realizacao',{headers:{origin},data:{pedido_id:randomUUID(),versao_esperada:1,relato:i===0?relato:'RELATO_PRIVADO_PORTFOLIO: esta declaração fictícia ainda está aguardando revisão editorial e não pode aparecer na vitrine pública.',participantes:i===0?12:99,url:i===0?photo:'',autoriza_publicacao:true}})).status()).toBe(200);
   if(i===0){const response=await reviewer.request.get('/api/atividades/'+id+'/registro');expect(response.status()).toBe(200);const {registro}=await response.json();expect((await reviewer.request.post('/api/admin/atividades/'+id+'/relato',{headers:{origin},data:{acao:'aprovar',conteudo_esperado:registro.conteudo_sha256,evidencias_aprovadas:registro.evidencias.map(e=>e.id)}})).status()).toBe(200);}
  }
  expect((await orgPage.request.post('/api/atividades',{headers:{origin},data:{titulo:'Projeto de oficinas e memória do bairro — fictício',descricao:'Plano fictício em preparação, com oficinas e registro da memória local. Nenhuma atividade real anunciada.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Em preparação. Atividade de teste.'}})).status()).toBe(200);
  const illustration='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><defs><linearGradient id="g"><stop stop-color="#174f40"/><stop offset="1" stop-color="#9bbf8b"/></linearGradient></defs><rect width="1200" height="600" fill="url(#g)"/><circle cx="1000" cy="120" r="70" fill="#f3d996"/><path d="M0 500Q300 200 650 430T1200 360V600H0" fill="#103e30"/><path d="M160 520Q190 370 150 280M170 430Q110 380 100 330Q180 335 170 430M174 400Q240 365 240 310Q170 320 174 400" fill="#bdd6a4" stroke="#bdd6a4" stroke-width="5"/><text x="350" y="240" fill="#fffceb" font-family="sans-serif" font-size="40">Cuidar do território. Cultivar encontros.</text><text x="350" y="295" fill="#e3edda" font-family="sans-serif" font-size="23">Ilustração de demonstração · dados fictícios</text></svg>';
  for(const context of [visitorContext,ownerContext])await context.route(photo,route=>route.fulfill({contentType:'image/svg+xml',body:illustration}));
  const response=await visitor.goto('/perfil/'+owner.subject);expect(response.status()).toBe(200);
  await expect(visitor.getByRole('heading',{name:'Ana Ribeiro — produtora cultural fictícia',exact:true})).toBeVisible();
  await expect(visitor.getByRole('heading',{name:'Nossas Atividades',exact:true})).toBeVisible();await expect(visitor.locator('.activity-card')).toHaveCount(2);await expect(visitor.locator('.portfolio-evidence-card')).toHaveCount(1);
  await expect(visitor.locator('.portfolio-stats>div').nth(0).locator('strong')).toHaveText('2');await expect(visitor.locator('.portfolio-stats>div').nth(1).locator('strong')).toHaveText('1');await expect(visitor.locator('.portfolio-stats>div').nth(2).locator('strong')).toHaveText('12');
  const evidence=visitor.locator('.portfolio-evidence-card');await expect(evidence).toContainText(relato);await expect(evidence.getByRole('link',{name:'Abrir foto original'})).toHaveAttribute('href',photo);await evidence.getByRole('img').scrollIntoViewIfNeeded();await expect.poll(()=>evidence.getByRole('img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
  expect(await visitor.content()).not.toMatch(/RASCUNHO_PRIVADO_PORTFOLIO|RELATO_PRIVADO_PORTFOLIO/);expect(await visitor.content()).not.toContain(owner.email);await expect(visitor.locator('.profile-editor')).toHaveCount(0);
  await capture(visitor,dir+'/portfolio-publico.png');
  await visitor.evaluate(()=>{window.print=()=>{document.body.dataset.printRequested='yes';};});await visitor.getByRole('button',{name:'Baixar Portfólio em PDF',exact:true}).click();await expect(visitor.locator('body')).toHaveAttribute('data-print-requested','yes');
  await visitor.emulateMedia({media:'print'});await expect(visitor.getByRole('banner')).toBeHidden();await expect(visitor.locator('.portfolio-toolbar')).toBeHidden();await expect(visitor.locator('.portfolio-evidence-card')).toBeVisible();await expect(visitor.locator('.portfolio-source-url')).toContainText('/perfil/'+owner.subject);await capture(visitor,dir+'/portfolio-impressao.png');await visitor.emulateMedia({media:'screen'});
  await visitor.setViewportSize({width:390,height:844});expect(await visitor.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await capture(visitor,dir+'/portfolio-mobile.png');
  await page.goto('/dashboard/pessoa-fisica');const tools=page.getByRole('navigation',{name:'Ferramentas de gestão'});await expect(tools.getByRole('link')).toHaveCount(3);await expect(tools).toContainText('Minhas Atividades');await expect(tools).toContainText('Minhas Evidências');await expect(tools).toContainText('Meu Portfólio');await expect(tools.locator('.workspace-tool-content>strong').nth(1)).toHaveText('1');await expect(page.locator('.portfolio-evidence-card')).toHaveCount(1);await page.locator('.portfolio-evidence-card img').scrollIntoViewIfNeeded();await capture(page,dir+'/dashboard-pf.png');
  await orgPage.goto('/dashboard');const orgTools=orgPage.getByRole('navigation',{name:'Ferramentas de gestão'});await expect(orgTools.getByRole('link')).toHaveCount(3);await expect(orgTools).toContainText('Meu Portfólio');await expect(orgTools.locator('.workspace-tool-content>strong').nth(0)).toHaveText('1');await expect(orgTools.locator('.workspace-tool-content>strong').nth(1)).toHaveText('0');await expect(orgPage.getByRole('link',{name:'Projeto de oficinas e memória do bairro — fictício',exact:true})).toBeVisible();await capture(orgPage,dir+'/dashboard-organizacao.png');
  await orgTools.locator('.workspace-tool').filter({hasText:'Meu Portfólio'}).click();await expect(orgPage).toHaveURL(origin+'/perfil/'+organization.subject);await expect(orgPage.getByRole('heading',{name:'Associação Raízes do Vale — fictícia',exact:true})).toBeVisible();await expect(orgPage.locator('.profile-editor')).toBeVisible();
 }finally{await ownerContext.close();await editorContext.close();await orgContext.close();await visitorContext.close();}
});
