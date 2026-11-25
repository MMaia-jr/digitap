/* eslint-disable @typescript-eslint/no-require-imports -- Roteiro CJS de QA carrega as dependências da worktree a partir de um diretório temporário. */
const root=process.cwd();
const { chromium, devices } = require(root+'/node_modules/playwright');
const { expect } = require(root+'/node_modules/@playwright/test');
const { createClient } = require(root+'/node_modules/@supabase/supabase-js');
const { Client } = require(root+'/node_modules/pg');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const origin='http://127.0.0.1:3215', supabase='http://127.0.0.1:56151';
const mode=process.env.QA03_MODE, out='/private/tmp/digitap-qa-03/'+mode;
const fixtureName='Pessoa titular do ensaio cultural sintético QA-03';
const proposal='Organizar uma oficina gratuita de leitura para a vizinhança.';
const activityTitle='Atividade fictícia QA-03';
const describe='Realizar a atividade gratuitamente, decidido pela titular.';
const fixtureData={ records: [], actors:[], bucketCreated:false };
const observations={ mode, head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), conversion:null, anchor:[], cleanup:null };
const validId=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const id=process.env.AI_BETA_AUTH_USER_ID, bucket=process.env.SUPABASE_PRIVATE_EVIDENCE_BUCKET;
if (!['red','green'].includes(mode) || process.env.DIGITAP_G4_03B_GATEWAY_MOCK!=='1' || process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1' ||
process.env.AI_GATEWAY_API_KEY!=='g4-03b-synthetic-only' || !validId.test(id||'') || !/^oss01d-private-qa03-[a-z0-9]+$/.test(bucket||'')) throw Error('Guarda sintética QA-03 recusou execução.');
fs.mkdirSync(out,{recursive:true,mode:0o700});
const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const database=new URL(local.DB_URL);
if(local.API_URL!==supabase || database.hostname!=='127.0.0.1' || database.port!=='56152' || database.pathname!=='/postgres') throw Error('Destino local recusado.');
const admin=createClient(supabase,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new Client(local.DB_URL);
const dateFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short',hourCycle:'h23'});
const dayFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',dateStyle:'short'});
async function createActor(browser, name, identifier) {
 const email='qa03-'+randomUUID()+'@example.invalid', password=randomUUID()+'aA1!';
 const result=await admin.auth.admin.createUser({email,password,email_confirm:true,...(identifier?{id:identifier}:{})});
 if(result.error||!result.data.user) throw Error('Cadastro da fixture Auth falhou.');
 const actor={user:result.data.user.id,subject:null};
 fixtureData.actors.push(actor);
 const subject=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:actor.user,p_nome_publico:name});
 if(subject.error) throw Error('Cadastro da fixture PF falhou.');
 actor.subject=subject.data;
 const context=await browser.newContext({...devices['iPhone 13'], deviceScaleFactor:1, baseURL:origin});
 await context.route('**/*',route=>[origin,supabase].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
 const page=await context.newPage();
 await page.goto('/login');
 await page.getByLabel('E-mail',{exact:true}).fill(email);
 await page.getByLabel('Senha',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page).toHaveURL(origin+'/');
 return {...actor,page,context};
}
async function capture(page,name){
 await page.screenshot({path:out+'/'+name+'.png',animations:'disabled',style:'nextjs-portal { display: none; }'});
}
async function geometry(page, hash, label) {
 const data = await page.evaluate(async hash=>{
  const target=document.getElementById(hash);
  if(!target) return;
  const heading=target.matches('h1,h2,h3')?target:target.querySelector('h1,h2,h3,h4')||target;
  let gap=0,last=-1;
  for(let i=0;i<60&&gap<8;i++){
    await new Promise(resolve=>requestAnimationFrame(resolve));
    if(last===scrollY) gap++;
    else {last=scrollY;gap=0;}
  }
  const header=document.querySelector('.app-header');
  const box=heading.getBoundingClientRect();
  const headerFloor=header?Math.max(0,header.getBoundingClientRect().bottom):0;
  const position={ top:Math.round(box.top), bottom:Math.round(box.bottom), headerBottom:Math.round(headerFloor), viewport:innerHeight };
  return { ...position, visible:position.top>=position.headerBottom&&position.bottom<=position.viewport,
   focusAtTarget:target===document.activeElement||target.contains(document.activeElement),
   viewportWidth:innerWidth, scrollWidth:document.documentElement.scrollWidth, scrollY:Math.round(scrollY) };
 },hash);
 if(!data) throw Error('Âncora '+hash+' não encontrada.');
 observations.anchor.push({label,hash,...data});
 await capture(page,label);
 return data;
}
async function anchorJourney(page, title, activityId){
 await page.goto('/dashboard/pessoa-fisica');
 await page.getByRole('link',{name:'Acompanhar '+title,exact:true}).click();
 await expect(page).toHaveURL(new RegExp('/dashboard/atividade/'+activityId+'#acompanhamento$'));
 await geometry(page,'acompanhamento','entrada-acompanhamento');
 const navigation=page.getByRole('navigation',{name:'Seções do acompanhamento'});
 const sections=await navigation.getByRole('link').evaluateAll(links=>links.map(link=>({href:link.getAttribute('href'),name:link.textContent.trim()})));
 for (const [index, {href,name}] of sections.entries()) {
  if(index>0){
   await page.goBack();
   await expect(page).toHaveURL(/#acompanhamento$/);
   await geometry(page,'acompanhamento','retorno-historico-'+index);
  }
  await navigation.getByRole('link',{name,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(href+'$'));
  await geometry(page,href.slice(1),'salto-'+href.slice(1));
 }
 const internal=page.locator('a[href="#acompanhamento"]').filter({hasText:/voltar|acompanhamento/i});
 if(await internal.count()){
  await internal.first().click();
  await expect(page).toHaveURL(/#acompanhamento$/);
  await geometry(page,'acompanhamento','voltar-acompanhamento');
 }
 const exit = page.getByRole('link',{name:/voltar à área restrita|voltar.*atividades/i}).first();
 const href=await exit.getAttribute('href');
 await exit.click();
 await page.waitForURL(url=>!url.pathname.startsWith('/dashboard/atividade/'+activityId));
 observations.returnRoute={expected:'/dashboard/pessoa-fisica',path:new URL(page.url()).pathname,href, accessDenied:await page.getByRole('heading',{name:'Acesso indisponível',exact:true}).count()>0};
}
async function cleanup(){
 const a=fixtureData.actors.map(x=>x.user),s=fixtureData.actors.map(x=>x.subject).filter(Boolean);
 const records=(await db.query('select r.id from public.registros_realizacao r join public.atividades a on r.atividade_id=a.id where a.sujeito_id=any($1::uuid[])',[s])).rows.map(x=>x.id);
 const activities=(await db.query('select id from public.atividades where sujeito_id=any($1::uuid[])',[s])).rows.map(x=>x.id);
 const files=(await db.query('select object_key from public.evidencias_arquivos_privados where registro_id=any($1::uuid[])',[records])).rows.map(x=>x.object_key);
 if(files.length && (!fixtureData.bucketCreated || (await admin.storage.from(bucket).remove(files)).error)) throw Error('Falha no cleanup dos objetos sintéticos.');
 await db.query('begin');
 try{
  await db.query("delete from public.eventos_editoriais where (objeto_tipo='atividade' and objeto_id=any($1::uuid[])) or (objeto_tipo='registro' and objeto_id=any($2::uuid[])) or objeto_id=any($3::uuid[])",[activities,records,s]);
  for(const table of ['evidencias_arquivos_privados','evidencias']) await db.query('delete from public.'+table+' where registro_id=any($1::uuid[])',[records]);
  await db.query('delete from public.registros_realizacao where id=any($1::uuid[])',[records]);
  await db.query('delete from public.itens_planejamento_execucao where plano_id in (select id from public.planos_execucao where atividade_id=any($1::uuid[]))',[activities]);
  await db.query('delete from public.planos_execucao where atividade_id=any($1::uuid[])',[activities]);
  await db.query('delete from public.atividades where id=any($1::uuid[])',[activities]);
  await db.query('delete from public.ideias_privadas where owner_id=any($1::uuid[])',[a]);
  await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])',[s]);
  await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])',[s]);
  await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[s]);
  await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[a]);
  await db.query('commit');
 }catch(error){await db.query('rollback');throw error;}
 for(const user of a) if((await admin.auth.admin.deleteUser(user)).error) throw Error('Falha no cleanup do Auth sintético.');
 if(fixtureData.bucketCreated){
  const listed=await admin.storage.from(bucket).list('');
  if(listed.error||listed.data.length||(await admin.storage.deleteBucket(bucket)).error) throw Error('Falha no cleanup do bucket sintético.');
 }
 const remaining=await db.query('select (select count(*)::int from auth.users where id=any($1::uuid[])) as users,(select count(*)::int from public.atividades where id=any($2::uuid[])) as activities,(select count(*)::int from public.registros_realizacao where id=any($3::uuid[])) as records',[a,activities,records]);
 observations.cleanup={fixtures:a.length,bucketRemoved:fixtureData.bucketCreated,remaining:remaining.rows[0]};
}
async function run(){
 let browser,stage='connect';
 await db.connect();
 try{
  stage='prepare';
  if(mode==='green'){
   const buckets=await admin.storage.listBuckets();
   if(buckets.error||buckets.data.some(item=>item.name===bucket)) throw Error('Bucket já ocupado ou indisponível.');
   const created=await admin.storage.createBucket(bucket,{public:false,fileSizeLimit:25*1024*1024,allowedMimeTypes:['image/png']});
   if(created.error) throw Error('Bucket sintético indisponível.');
   fixtureData.bucketCreated=true;
  }
  browser=await chromium.launch({headless:true,chromiumSandbox:true});
  const {page,subject}=await createActor(browser,fixtureName,id);
  stage='idea';
  await page.goto('/meu-espaco/ideia');
  await page.getByLabel('Título do rascunho').fill('Ideia fictícia QA-03');
  await page.getByLabel('Sua proposta').fill(proposal);
  await page.getByLabel('Usar contexto autorizado').check();
  await page.getByLabel('Sujeito do contexto').selectOption(subject);
  await page.getByLabel('Autorizo o envio do contexto selecionado ao provedor de IA').check();
  await page.getByRole('button',{name:'Interpretar proposta',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Prévia para revisão humana'})).toBeVisible();
  await page.getByRole('button',{name:'Salvar rascunho',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Rascunho privado salvo'})).toBeVisible();
  await page.getByRole('button',{name:'Consultar decisões'}).click();
  const editor=page.getByRole('region',{name:'Decisões da ideia'});
  await editor.getByLabel('Chave da decisão').fill('gratuidade');
  await editor.getByLabel('Estado da decisão').selectOption('DEFINIDO');
  await editor.getByLabel('Descrição da decisão').fill(describe);
  await editor.getByRole('button',{name:'Confirmar decisão',exact:true}).click();
  await expect(editor).toContainText(describe);
  stage='conversion';
  await page.getByRole('link',{name:'Usar esta ideia para criar uma atividade'}).click();
  await page.getByLabel('Título',{exact:true}).fill(activityTitle);
  await page.getByLabel('Descrição',{exact:true}).fill('Ensaio local de conversão e navegação.');
  await page.getByLabel('Orientação de acesso',{exact:true}).fill('Ensaio sintético privado.');
  const ongoing=page.getByLabel('A atividade está acontecendo agora');
  await ongoing.check();
  const convert=page.getByRole('button',{name:'Criar rascunho privado a partir desta ideia'});
  const submit=async()=> {
   const started=Date.now();
   const response=page.waitForResponse(r=>r.request().method()==='POST'&&/\/api\/ideias\/[^/]+\/atividade$/.test(new URL(r.url()).pathname));
   await convert.click();
   const result=await response;
   return {status:result.status(),started,finished:Date.now(),body:result.status()===200?null:await result.json(),sentStart:result.request().postDataJSON()?.inicio_previsto};
  };
  let result=await submit();
  observations.conversion={http:result.status, safeMessage:result.status===400&&result.body.message==='Pedido inválido.'?'Pedido inválido.':undefined};
  if(result.status!==200){
   await expect(page.getByRole('alert').filter({hasText:'Pedido inválido.'})).toBeVisible();
   await capture(page,'conversao-em-andamento-reprovada');
   if(mode==='green') throw Error('Conversão em andamento segue reprovada.');
   await ongoing.uncheck();
   await page.getByLabel('Data e horário (America/Sao_Paulo)',{exact:true}).fill(dateFormat.format(new Date(Date.now()+120_000)).replace(' ','T'));
   result=await submit();
   expect(result.status).toBe(200);
   observations.conversion.anchorFixtureScheduled=true;
  }
  await expect(page.getByRole('heading',{name:activityTitle,exact:true})).toBeVisible();
  const {rows:[activity]}=await db.query('select a.id,a.inicio_previsto,a.estado_editorial,a.numero_versao_publicada,d.versao_ideia,d.decisoes from public.atividades a left join public.atividade_decisoes_origem d on d.atividade_id=a.id where a.sujeito_id=$1',[subject]);
  if(!activity) throw Error('Conversão não persistida.');
  observations.conversion.privateDraft=activity.estado_editorial==='rascunho'&&activity.numero_versao_publicada===null;
  observations.conversion.snapshotMatches=Array.isArray(activity.decisoes)&&activity.decisoes.some(d=>d.chave==='gratuidade'&&d.estado==='DEFINIDO'&&d.descricao===describe);
  if(mode==='green'){
   const start=new Date(activity.inicio_previsto).getTime();
   observations.conversion.timestamp={ startAt:new Date(start).toISOString(), betweenClickAndResponse:start>=result.started-1000&&start<=result.finished+1000, matchesSubmittedInstant:new Date(result.sentStart).getTime()===start };
   expect(observations.conversion.timestamp.betweenClickAndResponse).toBe(true);
   expect(observations.conversion.timestamp.matchesSubmittedInstant).toBe(true);
   expect(observations.conversion.privateDraft).toBe(true);
   expect(observations.conversion.snapshotMatches).toBe(true);
   const timing=(await db.query("select justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and acao='atividade_horario_atual'",[activity.id])).rows;
   const recorded=timing.length===1&&JSON.parse(timing[0].justificativa_restrita);
   observations.conversion.timingEventMatches=!!recorded&&recorded.tipo==='horario-atual.v1'&&recorded.inicio_previsto===new Date(start).toISOString();
   expect(observations.conversion.timingEventMatches).toBe(true);

  }
  stage='activity-private';
  await page.getByRole('link',{name:'Acompanhar '+activityTitle,exact:true}).click();
  const followUp=page.getByRole('region',{name:'Acompanhamento da atividade'});
  if(mode==='red'){
   await db.query('insert into public.registros_realizacao(atividade_id,data_realizacao,descricao_factual,origem_informacao) values($1,current_date,$2,$3)',[activity.id,'Declaração sintética preparada para medir a âncora.','Fixture QR de geometria.']);
  }else{
   await page.reload();
   const recordForm=followUp.getByRole('form',{name:'Registro de realização'});
   await expect(recordForm.getByRole('button',{name:'Salvar declaração privada'})).toBeEnabled();
   await recordForm.getByLabel('Data efetiva').fill(dayFormat.format(new Date(activity.inicio_previsto)));
   await recordForm.getByLabel('Descrição factual').fill('Declaração sintética em andamento, registrada pela titular.');
   await recordForm.getByLabel('Origem da informação').fill('Declaração da titular da fixture sintética QA-03.');
   await recordForm.getByRole('button',{name:'Salvar declaração privada'}).click();
   await expect(followUp.getByRole('region',{name:'Registro privado'})).toBeVisible();
   const file=followUp.getByLabel('Arquivo de evidência privada');
   const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII=','base64');
   await expect(file).toBeEnabled();
   await file.setInputFiles({name:'evidencia-sintetica.png',mimeType:'image/png',buffer:bytes});
   await followUp.getByRole('button',{name:'Enviar evidência privada'}).click();
   const attachment=followUp.getByRole('link',{name:'Abrir anexo privado'});
   await expect(attachment).toBeVisible();
   await page.reload();
   await expect(followUp.getByRole('region',{name:'Decisões na origem da atividade'})).toContainText(describe);
   await expect(followUp.getByRole('region',{name:'Registro privado'})).toContainText('Declaração sintética em andamento');
   await expect(attachment).toBeVisible();
   const attachmentHref=await attachment.getAttribute('href');
   expect(attachmentHref).toMatch(/^\/api\/registros\/[a-z0-9-]+\/arquivos\/[a-z0-9-]+$/);
   const redirection=await page.request.get(origin+attachmentHref,{maxRedirects:0});
   expect(redirection.status()).toBe(302);
   const signed=new URL(redirection.headers().location);
   expect(signed.origin).toBe(supabase);
   expect(await (await page.request.get(signed.href,{maxRedirects:0})).body()).toEqual(bytes);
   const outsider=await createActor(browser,'Outra pessoa física sintética QA-03');
   await outsider.page.goto('/dashboard/atividade/'+activity.id+'#acompanhamento');
   await expect(outsider.page.getByText(activityTitle,{exact:true})).toHaveCount(0);
   const denied=await outsider.page.request.get(origin+attachmentHref,{maxRedirects:0});
   expect([403,404]).toContain(denied.status());
   const publicActivity=await page.request.get(origin+'/api/public/atividades/'+activity.id,{maxRedirects:0});
   expect(publicActivity.status()).toBe(404);
   observations.private={persistedAfterReload:true,ownerBytesMatch:true,thirdPartyStatus:denied.status(),publicActivityStatus:publicActivity.status()};
  }
  stage='mobile-anchor';
  await anchorJourney(page,activityTitle,activity.id);
  if(mode==='green') {
   expect(observations.anchor.every(item=>item.visible)).toBe(true);
   expect(observations.returnRoute.path).toBe(observations.returnRoute.expected);
   stage='secondary-route-read-only';
   const orgSignup=page.getByRole('navigation',{name:'Taps para participar'}).getByRole('link',{name:'Cadastrar uma organização',exact:true});
   const href=await orgSignup.getAttribute('href');
   await orgSignup.click();
   const signUpTarget=page.getByRole('heading',{name:'Crie seu acesso',exact:true});
   await expect(page.getByRole('main')).toBeVisible();
   await expect(page).toHaveURL(new RegExp(href+'(?:[?#].*)?$'));
   observations.secondary={organizationCardAsPerson:{path:new URL(page.url()).pathname,asksForNewAccess:await signUpTarget.count()>0}};

  }
  console.log('QA-03 '+mode,JSON.stringify({http:observations.conversion.http,anchors:observations.anchor.map(x=>[x.label,x.visible]),back:observations.returnRoute?.path}));
 }catch(error){
  observations.error={ stage, name:error.name, reason:String(error.message.split('\n').find(line=>line.trim().length)||'Falha').replace(/\u001b\[[0-9;]+m/g,'').slice(0,140) };
  process.exitCode=1;
 }finally{
  try{await browser?.close();await cleanup();}
  catch(error){observations.cleanup={error:error.name,code:error.code??null};process.exitCode=1;}
  await db.end();
  fs.writeFileSync(out+'/observacoes.json',JSON.stringify(observations,null,2)+'\n',{mode:0o600});
 }
}
run().catch(error=>{console.error('QA-03 falhou antes da jornada.',error.name);process.exitCode=1;});
