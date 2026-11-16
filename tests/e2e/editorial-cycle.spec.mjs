import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
test.describe.configure({mode:'serial'});
const origin='http://127.0.0.1:3215',people=[],subjects=[],ideaIds=[],activityIds=[],title='Roda de saberes comunitários — atividade fictícia';
const evidenceDir=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/mvp-ciclo-editorial';
let db,admin;
const ideaSource='Relato fictício: pessoa propõe oficina comunitária em data ainda a combinar.';
const ideaInterpretation={estado:'revisao_humana_pendente',verificacao:'nao_verificada',dados:{sujeitos:[],projetos:[],atividades:[{descricao:'Oficina comunitária proposta pela pessoa',trecho:'oficina comunitária'}],capacidades:[],relacoes:[],fontes:[],informacoes_nao_verificadas:[]}};
test.beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures não autorizadas.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
 db=new Client(local.DB_URL);await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<2;i++){
  const email=`ciclo-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!',name=i?'Editor Fictício':'Ana — participante fictícia';
  const r=await admin.auth.admin.createUser({email,password,email_confirm:true});if(r.error||!r.data.user)throw new Error('Fixture Auth falhou.');
  people.push({id:r.data.user.id,email,password,name});
  const s=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:r.data.user.id,p_nome_publico:name});if(s.error)throw new Error('Fixture PF falhou.');subjects.push(s.data);
  if(i===0){const ideaId=randomUUID();await db.query('insert into public.ideias_privadas(id,owner_id,title,original_text,original_interpretation,revised_interpretation) values($1,$2,$3,$4,$5::jsonb,$5::jsonb)',[ideaId,r.data.user.id,'Raízes em Movimento',ideaSource,JSON.stringify(ideaInterpretation)]);ideaIds.push(ideaId);}
  if(i)await db.query("update public.contas_acesso set papel='editor' where auth_user_id=$1",[r.data.user.id]);
 }
});
test.afterAll(async()=>{
 try{if(people.length){
  const users=people.map(p=>p.id);await db.query('begin');
  try{
   const ids=(await db.query('select id from public.atividades where sujeito_id=any($1::uuid[])',[subjects])).rows.map(r=>r.id);
   await db.query('delete from public.eventos_editoriais where objeto_id=any($1::uuid[]) or objeto_id=any($2::uuid[])',[ids,subjects]);
   await db.query('delete from public.casos_moderacao where sujeito_id=any($1::uuid[])',[subjects]);
   await db.query("delete from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);
   await db.query('delete from public.itens_planejamento_execucao where plano_id in (select id from public.planos_execucao where atividade_id=any($1::uuid[]))',[ids]);
   await db.query('delete from public.planos_execucao where atividade_id=any($1::uuid[])',[ids]);
   await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
   await db.query('delete from public.ideias_privadas where id=any($1::uuid[])',[ideaIds]);
   await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])',[subjects]);
   await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])',[subjects]);
   await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[subjects]);
   await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('commit');
  }catch(e){await db.query('rollback');throw e;}
  for(const person of people)if((await admin.auth.admin.deleteUser(person.id)).error)throw new Error('Limpeza Auth falhou.');
 }}finally{await db?.end();}
});
async function login(page,person){await page.goto('/login');await page.getByLabel('E-mail',{exact:true}).fill(person.email);await page.getByLabel('Senha',{exact:true}).fill(person.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();}
test('CICLO-01: PF cria agora, envia, editor aprova e visitante vê na home',async({browser})=>{
 const ownerContext=await browser.newContext(),editorContext=await browser.newContext(),visitorContext=await browser.newContext();
 try{
  const owner=await ownerContext.newPage(),editor=await editorContext.newPage(),visitor=await visitorContext.newPage();
  await login(owner,people[0]);await expect(owner).toHaveURL(origin+'/');await owner.goto('/dashboard/pessoa-fisica');
  await expect(owner.getByRole('banner').getByRole('link',{name:'Admin',exact:true})).toHaveCount(0);
  await owner.getByRole('link',{name:'Criar Atividade',exact:true}).click();
  await owner.getByRole('checkbox',{name:'A atividade está acontecendo agora',exact:true}).check();
  await expect(owner.getByLabel('Data e horário (America/Sao_Paulo)',{exact:true})).toHaveAttribute('readonly','');
  await owner.getByLabel('Título',{exact:true}).fill(title);await owner.getByLabel('Descrição',{exact:true}).fill('Encontro fictício para trocar saberes, cuidar de uma horta e conversar sobre o bairro.');
  await owner.getByLabel('Orientação de acesso',{exact:true}).fill('Participação gratuita. Local e encontro exclusivamente fictícios para este teste.');
  await owner.screenshot({path:evidenceDir+'/ciclo-form-agora.png',fullPage:true});
  await owner.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(owner).toHaveURL(origin+'/dashboard/pessoa-fisica');
  const draft=owner.getByRole('main').locator('article').filter({has:owner.getByRole('heading',{name:title,exact:true})});
  await draft.getByRole('checkbox',{name:/Autorizo divulgar meu nome público/}).check();await draft.getByRole('button',{name:'Enviar atividade para revisão',exact:true}).click();
  await expect(draft.getByText('Enviada para revisão',{exact:true})).toBeVisible();
  await login(editor,people[1]);await expect(editor).toHaveURL(origin+'/');await editor.goto('/admin/atividades');
  await expect(editor.getByRole('banner').getByRole('link',{name:'Admin',exact:true})).toBeVisible();
  const review=editor.getByRole('article',{name:title,exact:true});await expect(review.getByText(people[0].name,{exact:true})).toBeVisible();
  await editor.screenshot({path:evidenceDir+'/ciclo-admin.png',fullPage:true});
  await review.getByRole('button',{name:'Aprovar Publicação',exact:true}).click();await expect(review).toHaveCount(0);
  await visitor.goto('/');await expect(visitor.getByRole('main').getByRole('link',{name:title,exact:true})).toBeVisible();
  await visitor.screenshot({path:evidenceDir+'/ciclo-home-publicada.png',fullPage:true});
  const row=(await db.query('select id,estado_editorial,versao_publicada from public.atividades where sujeito_id=$1 and titulo=$2',[subjects[0],title])).rows[0];
  expect(row.estado_editorial).toBe('publicada');expect(row.versao_publicada.tipo).toBe('atividade-publica.v2');
  expect((await visitor.request.get('/api/public/atividades/'+row.id)).status()).toBe(200);
  await editor.goto('/dashboard/pessoa-fisica/nova');await expect(editor.getByRole('heading',{name:'Criar atividade',exact:true})).toBeVisible();
 }finally{await ownerContext.close();await editorContext.close();await visitorContext.close();}
});
test('CICLO-02: admin protegido e rejeição motivada não aparece publicamente',async({browser})=>{
 const ownerContext=await browser.newContext(),editorContext=await browser.newContext(),visitorContext=await browser.newContext();
 try{
  const owner=await ownerContext.newPage(),editor=await editorContext.newPage(),visitor=await visitorContext.newPage();
  await visitor.goto('/admin/atividades');await expect(visitor).toHaveURL(origin+'/login');
  await login(owner,people[0]);await expect(owner).toHaveURL(origin+'/');await owner.goto('/dashboard/pessoa-fisica');await owner.goto('/admin/atividades');await expect(owner.getByRole('heading',{name:'Acesso editorial indisponível',exact:true})).toBeVisible();
  const created=await owner.request.post('/api/atividades',{headers:{origin},data:{titulo:'Atividade fictícia a revisar',descricao:'Descrição factual fictícia que será rejeitada.',inicio_previsto:new Date(Date.now()+86400000).toISOString(),orientacao_acesso:'Entrada fictícia.'}});expect(created.status()).toBe(200);const id=(await created.json()).atividade.id;
  expect((await owner.request.post('/api/atividades/'+id+'/enviar',{headers:{origin},data:{versao_esperada:1,autoriza_publicacao:true}})).status()).toBe(200);
  expect((await owner.request.post('/api/admin/atividades/'+id+'/decidir',{headers:{origin},data:{acao:'aprovar_publicacao',versao_esperada:1,pedido_id:randomUUID()}})).status()).toBe(403);
  await login(editor,people[1]);await expect(editor).toHaveURL(origin+'/');await editor.goto('/admin/atividades');const review=editor.getByRole('article',{name:'Atividade fictícia a revisar',exact:true});
  await review.getByLabel('Motivo da rejeição',{exact:true}).fill('Faltam informações suficientes sobre como participar.');await review.getByRole('button',{name:'Rejeitar',exact:true}).click();await expect(review).toHaveCount(0);
  await owner.goto('/dashboard/pessoa-fisica');await expect(owner.getByText('Motivo da decisão: Faltam informações suficientes sobre como participar.',{exact:true})).toBeVisible();
  expect((await visitor.request.get('/api/public/atividades/'+id)).status()).toBe(404);
 }finally{await ownerContext.close();await editorContext.close();await visitorContext.close();}
});

test('E3 conectado: ideia privada vira rascunho, segue curadoria autorizada e entra na descoberta pública',async({browser})=>{
 const ownerContext=await browser.newContext({baseURL:origin}),editorContext=await browser.newContext({baseURL:origin}),visitorContext=await browser.newContext({baseURL:origin});
 try{
  const owner=await ownerContext.newPage(),editor=await editorContext.newPage(),visitor=await visitorContext.newPage();
  for(const context of [ownerContext,editorContext,visitorContext])await context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'&&['3215','56151','56154'].includes(u.port)?route.continue():route.abort();});
  await login(owner,people[0]);await expect(owner).toHaveURL(origin+'/');await owner.goto('/meu-espaco/ideia');
  await expect(owner.getByRole('heading',{name:'Minhas ideias',exact:true})).toBeVisible();await owner.getByText('Ver conteúdo da ideia',{exact:true}).click();await expect(owner.getByText(ideaSource,{exact:true})).toBeVisible();
  await owner.getByRole('link',{name:'Usar esta ideia para criar uma atividade',exact:true}).click();await expect(owner).toHaveURL(new RegExp('/dashboard/pessoa-fisica/nova\\?ideia='+ideaIds[0]));
  await expect(owner.getByRole('heading',{name:'Conteúdo da ideia selecionada',exact:true})).toBeVisible();const suggestion=owner.locator('section[aria-labelledby="ideia-origem"] ul li').first();await expect(suggestion).toContainText('Oficina comunitária proposta pela pessoa');await expect(suggestion).toContainText('Trecho de origem: oficina comunitária');
  const activityTitle='Oficina Raízes em Movimento — fixture E3';await owner.getByLabel('Título',{exact:true}).fill(activityTitle);await owner.getByLabel('Descrição',{exact:true}).fill('Encontro fictício proposto pela pessoa para uma oficina comunitária.');
  const future=new Date(Date.now()+5*86400000),dateValue=future.toISOString().slice(0,16);await owner.getByLabel('Data e horário (America/Sao_Paulo)',{exact:true}).fill(dateValue);await owner.getByLabel('Orientação de acesso',{exact:true}).fill('A participação e o local serão combinados pela pessoa.');
  let conversionBody;owner.on('request',request=>{if(new URL(request.url()).pathname==='/api/ideias/'+ideaIds[0]+'/atividade')conversionBody=request.postDataJSON();});
  await owner.getByRole('button',{name:'Criar rascunho privado a partir desta ideia',exact:true}).click();await expect(owner).toHaveURL(origin+'/dashboard/pessoa-fisica');
  const draft=owner.getByRole('article').filter({has:owner.getByRole('heading',{name:activityTitle,exact:true})});await expect(draft.getByText('Rascunho privado',{exact:true})).toBeVisible();
  const activity=(await db.query('select id,estado_editorial,versao_publicada,numero_versao_publicada,sujeito_id,criada_por_conta_id from public.atividades where sujeito_id=$1 and titulo=$2',[subjects[0],activityTitle])).rows[0];expect(activity).toBeTruthy();activityIds.push(activity.id);expect(activity).toMatchObject({estado_editorial:'rascunho',versao_publicada:null,numero_versao_publicada:null,sujeito_id:subjects[0]});
  expect((await db.query('select title,original_text,version from public.ideias_privadas where id=$1',[ideaIds[0]])).rows[0]).toMatchObject({title:'Raízes em Movimento',original_text:ideaSource,version:1});
  const privateCostMarker='CUSTO_PREVISTO_PRIVADO_ECO01_INTEGRADO';
  await owner.goto('/dashboard/atividade/'+activity.id);await expect(owner.getByRole('region',{name:'Planejamento privado de recursos e custos previstos'})).toBeVisible();
  await owner.getByLabel('Descrição do recurso',{exact:true}).fill(privateCostMarker);await owner.getByLabel('Valor previsto (R$)',{exact:true}).fill('73,84');
  await owner.getByRole('button',{name:'Salvar planejamento',exact:true}).click();await expect(owner.getByRole('status').filter({hasText:'Planejamento privado salvo.'})).toBeVisible();
  expect((await db.query('select p.total_previsto_centavos::text total,i.descricao from public.planos_execucao p join public.itens_planejamento_execucao i on i.plano_id=p.id where p.atividade_id=$1',[activity.id])).rows).toEqual([{total:'7384',descricao:privateCostMarker}]);
  await owner.goto('/dashboard/pessoa-fisica');
  expect((await visitor.request.get('/api/public/atividades/'+activity.id)).status()).toBe(404);await visitor.goto('/');await expect(visitor.getByRole('main').getByRole('link',{name:activityTitle,exact:true})).toHaveCount(0);
  const duplicate=await owner.request.post(origin+'/api/ideias/'+ideaIds[0]+'/atividade',{headers:{origin},data:conversionBody});expect(duplicate.status()).toBe(200);expect(await duplicate.json()).toMatchObject({atividade:{id:activity.id,repetida:true}});
  await login(editor,people[1]);await expect(editor).toHaveURL(origin+'/');
  const foreign=await editor.request.post(origin+'/api/ideias/'+ideaIds[0]+'/atividade',{headers:{origin},data:conversionBody});expect(foreign.status()).toBe(404);
  const visitorAttempt=await visitor.request.post(origin+'/api/ideias/'+ideaIds[0]+'/atividade',{headers:{origin},data:conversionBody});expect(visitorAttempt.status()).toBe(401);
  await db.query('update public.ideias_privadas set version=version+1 where id=$1',[ideaIds[0]]);const stale={...conversionBody,pedido_id:randomUUID()};expect((await owner.request.post(origin+'/api/ideias/'+ideaIds[0]+'/atividade',{headers:{origin},data:stale})).status()).toBe(409);
  await draft.getByRole('checkbox',{name:/Autorizo divulgar meu nome público/}).check();await draft.getByRole('button',{name:'Enviar atividade para revisão',exact:true}).click();await expect(draft.getByText('Enviada para revisão',{exact:true})).toBeVisible();expect((await visitor.request.get('/api/public/atividades/'+activity.id)).status()).toBe(404);
  await editor.goto('/admin/atividades');const review=editor.getByRole('article',{name:activityTitle,exact:true});await expect(review.getByText(people[0].name,{exact:true})).toBeVisible();await review.getByRole('button',{name:'Aprovar Publicação',exact:true}).click();await expect(review).toHaveCount(0);
  const published=(await db.query('select estado_editorial,versao_publicada from public.atividades where id=$1',[activity.id])).rows[0];expect(published.estado_editorial).toBe('publicada');expect(published.versao_publicada.titulo).toBe(activityTitle);
  const publicResponse=await visitor.request.get('/api/public/atividades/'+activity.id);expect(publicResponse.status()).toBe(200);expect(JSON.stringify(await publicResponse.json())).not.toContain(privateCostMarker);
  await visitor.goto('/');await expect(visitor.getByRole('main').getByRole('link',{name:activityTitle,exact:true})).toBeVisible();await expect(visitor.getByRole('heading',{name:'Quem faz a Praça',exact:true})).toBeVisible();expect(await visitor.locator('body').innerText()).not.toContain(privateCostMarker);
  const publisherLink=visitor.getByRole('link',{name:'Ver perfil e portfólio de '+people[0].name,exact:true});await expect(publisherLink).toHaveAttribute('href','/perfil/'+subjects[0]);await publisherLink.click();await expect(visitor).toHaveURL(origin+'/perfil/'+subjects[0]);await expect(visitor.getByRole('heading',{name:activityTitle,exact:true})).toBeVisible();expect(await visitor.locator('body').innerText()).not.toContain(privateCostMarker);
 }finally{await ownerContext.close();await editorContext.close();await visitorContext.close();}
});
