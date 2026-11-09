import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
let db,admin,user,subject;
const origin='http://127.0.0.1:3215',email=`design-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!',name='Ana — participante fictícia';
const evidenceDir=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/design-produto';
if(!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(evidenceDir))throw new Error('Diretório de evidência inválido.');
const titles=['Horta na cidade, conversa no quintal','Uma tarde para trocar saberes','Caminhada e histórias do nosso bairro'];
test.beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures locais não autorizadas.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
 db=new Client(local.DB_URL);await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');user=created.data.user.id;
 const registered=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:user,p_nome_publico:name});if(registered.error)throw new Error('Fixture PF falhou.');subject=registered.data;
 await db.query("update public.contas_acesso set papel='editor' where auth_user_id=$1",[user]);
});
test.afterAll(async()=>{
 try{if(user){await db.query('begin');try{
  const ids=(await db.query('select id from public.atividades where sujeito_id=$1',[subject])).rows.map(row=>row.id);
  await db.query('delete from public.eventos_editoriais where objeto_id=any($1::uuid[]) or objeto_id=$2',[ids,subject]);
  await db.query('delete from public.casos_moderacao where sujeito_id=$1',[subject]);
  await db.query("delete from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);
  await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
  await db.query('delete from public.vinculos_publicadores where sujeito_id=$1',[subject]);
  await db.query('delete from public.pessoas_fisicas where sujeito_id=$1',[subject]);
  await db.query('delete from public.sujeitos_publicadores where id=$1',[subject]);
  await db.query('delete from public.contas_acesso where auth_user_id=$1',[user]);await db.query('commit');
 }catch(error){await db.query('rollback');throw error;}
 if((await admin.auth.admin.deleteUser(user)).error)throw new Error('Limpeza Auth falhou.');}}finally{await db?.end();}
});
test('DESIGN-01: card da Home abre atividade e atividade abre perfil público',async({browser})=>{
 const ownerContext=await browser.newContext(),visitorContext=await browser.newContext({viewport:{width:1440,height:1000}});
 try{
  const owner=await ownerContext.newPage(),page=await visitorContext.newPage();
  await page.goto('/');if(await page.getByText('A Praça está esperando a primeira atividade',{exact:true}).count())await page.screenshot({path:evidenceDir+'/home-vazia.png',fullPage:true});
  await owner.goto('/login');await owner.getByLabel('E-mail',{exact:true}).fill(email);await owner.getByLabel('Senha',{exact:true}).fill(password);await owner.getByRole('button',{name:'Entrar',exact:true}).click();await expect(owner).toHaveURL(origin+'/admin/atividades');
  for(let i=0;i<titles.length;i++){
   const created=await owner.request.post('/api/atividades',{headers:{origin},data:{titulo:titles[i],descricao:'Um encontro fictício para trocar conhecimentos, colocar a mão na terra e fazer boas conversas. Criado exclusivamente para esta demonstração visual.',inicio_previsto:new Date(Date.now()+86400000*(i+2)).toISOString(),orientacao_acesso:'Atividade fictícia, sem local ou inscrições reais. Na demonstração, a participação é aberta à comunidade.'}});expect(created.status()).toBe(200);const id=(await created.json()).atividade.id;
   expect((await owner.request.post('/api/atividades/'+id+'/enviar',{headers:{origin},data:{versao_esperada:1,autoriza_publicacao:true}})).status()).toBe(200);
   expect((await owner.request.post('/api/admin/atividades/'+id+'/decidir',{headers:{origin},data:{acao:'aprovar_publicacao',versao_esperada:1,pedido_id:randomUUID()}})).status()).toBe(200);
  }
  await page.goto('/');const card=page.locator('.activity-card').filter({has:page.getByRole('heading',{name:titles[0],exact:true})});await expect(card).toBeVisible();
  await page.screenshot({path:evidenceDir+'/home.png',fullPage:true});await page.locator('.app-header').screenshot({path:evidenceDir+'/header.png'});
  await page.setViewportSize({width:390,height:844});await expect(page.locator('body')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:evidenceDir+'/home-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
  await card.getByRole('link',{name:'Ver Detalhes',exact:true}).click();await expect(page).toHaveURL(/\/atividade\/[0-9a-f-]+$/);await expect(page.getByRole('heading',{name:titles[0],exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Vou Participar',exact:true})).toBeDisabled();await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);await page.screenshot({path:evidenceDir+'/atividade.png',fullPage:true});
  await page.getByRole('link',{name:'Ver perfil de '+name,exact:true}).click();await expect(page).toHaveURL(origin+'/perfil/'+subject);await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await expect(page.getByText('Pessoa Física',{exact:true})).toBeVisible();await expect(page.locator('.activity-card')).toHaveCount(3);await expect(page.locator('summary').filter({hasText:'Editar Perfil'})).toHaveCount(0);
  await page.screenshot({path:evidenceDir+'/perfil.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:evidenceDir+'/perfil-mobile.png',fullPage:true});
  await owner.goto('/perfil/'+subject);await expect(owner.locator('summary').filter({hasText:'Editar Perfil'})).toBeVisible();
 }finally{await ownerContext.close();await visitorContext.close();}
});
