import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
const origin='http://127.0.0.1:3215',out=process.env.A_PRACA_EVIDENCE_DIR??'operations/evidence/colaboracao-projetos';
const fixtures=[];let db,admin,alice,bob,editor,organization,project;
const title='Oficina de sementes — colaboração fictícia';
const draft=(project_id)=>({titulo:title,descricao:'Uma oficina fictícia de cultivo e troca de saberes para demonstrar colaboração entre pessoa e organização.',inicio_previsto:'2027-07-15T17:00:00.000Z',orientacao_acesso:'Demonstração fictícia, sem inscrições reais.',projeto_id:project_id});
async function person(name,role){
 const fixture={email:'collab-'+randomUUID()+'@example.invalid',password:randomUUID()+'aA1!'};
 const created=await admin.auth.admin.createUser({email:fixture.email,password:fixture.password,email_confirm:true});if(created.error)throw new Error('Fixture Auth falhou.');fixture.user=created.data.user.id;fixtures.push(fixture);
 const registered=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:fixture.user,p_nome_publico:name});if(registered.error)throw new Error('Fixture PF falhou.');fixture.subject=registered.data;
 if(role==='editor')await db.query("update public.contas_acesso set papel='editor' where auth_user_id=$1",[fixture.user]);return fixture;
}
test.beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1'||!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(out))throw new Error('Fixtures não autorizadas.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo não autorizado.');
 db=new Client(local.DB_URL);await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 alice=await person('Ana Sementes — colaboradora fictícia');bob=await person('Bruno Saberes — apoiador fictício');editor=await person('Editor colaboração — fictício','editor');
 organization={email:'collab-org-'+randomUUID()+'@example.invalid',password:randomUUID()+'aA1!'};
 const created=await admin.auth.admin.createUser({email:organization.email,password:organization.password,email_confirm:true});if(created.error)throw new Error('Fixture organização falhou.');organization.user=created.data.user.id;fixtures.push(organization);
 const registered=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:organization.user,p_nome_publico:'Associação Raízes do Vale — colaboração fictícia',p_canal_publico:null});if(registered.error)throw new Error('Fixture organização falhou.');organization.org=registered.data;
 organization.subject=(await db.query('select id from public.sujeitos_publicadores where organizacao_legada_id=$1',[organization.org])).rows[0].id;
 await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[organization.org]);
 project=(await db.query('insert into public.projetos(sujeito_id,titulo,descricao,ano) values($1,$2,$3,2027) returning id',[organization.subject,'Raízes em Rede','Pessoas, saberes e cuidado com o território. Projeto fictício para demonstrar colaboração.'])).rows[0].id;
});
test.afterAll(async()=>{
 try{if(!db)return;await db.query('rollback');
 const subjects=fixtures.map(f=>f.subject).filter(Boolean),users=fixtures.map(f=>f.user).filter(Boolean);
 await db.query('begin');
 const ids=(await db.query('select id from public.atividades where sujeito_id=any($1::uuid[])',[subjects])).rows.map(r=>r.id);
 await db.query('delete from public.eventos_editoriais where objeto_id=any($1::uuid[]) or objeto_id=any($2::uuid[])',[ids,subjects]);
 await db.query('delete from public.autorizacoes_publicacao where objeto_id=any($1::uuid[])',[ids]);
 await db.query('delete from public.casos_moderacao where sujeito_id=any($1::uuid[])',[subjects]);
 await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
 await db.query('delete from public.vinculos_colaboracao where sujeito_id=any($1::uuid[]) or projeto_id in (select id from public.projetos where sujeito_id=any($1::uuid[]))',[subjects]);
 await db.query('delete from public.projetos where sujeito_id=any($1::uuid[])',[subjects]);
 await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])',[subjects]);
 await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])',[subjects]);
 await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[subjects]);
 await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);
 if(organization?.org)await db.query('delete from public.organizacoes where id=$1',[organization.org]);
 await db.query('commit');
 for(const user of users)if((await admin.auth.admin.deleteUser(user)).error)throw new Error('Limpeza de fixture falhou.');
 }finally{await db?.end();}
});
async function login(page,fixture){await page.goto('/login');await page.getByLabel('E-mail',{exact:true}).fill(fixture.email);await page.getByLabel('Senha',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(origin+(fixture===organization?'/dashboard':fixture===editor?'/admin/atividades':'/dashboard/pessoa-fisica'));}
async function capture(page,name){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:out+'/'+name,fullPage:true,animations:'disabled'});}
async function invite(page,name,role='colaborador'){
 await page.getByLabel('Nome público da pessoa',{exact:true}).fill(name);await page.getByRole('button',{name:'Buscar pessoa',exact:true}).click();
 const result=page.locator('.collaboration-people>li').filter({hasText:name});await result.getByRole('combobox').selectOption(role);await result.getByRole('button',{name:'Enviar convite',exact:true}).click();await expect(page.locator('.feedback[role=status]')).toContainText('Convite enviado');
}
test('COLAB-01: convite, aceite, proposta, rejeição/reenvio, aprovação, publicação e remoção',async({browser})=>{
 test.setTimeout(150000);mkdirSync(out,{recursive:true});
 const contexts=await Promise.all(Array.from({length:5},()=>browser.newContext({viewport:{width:1440,height:1050}})));
 try{
 const [org,pf,other,reviewer,visitor]=await Promise.all(contexts.map(c=>c.newPage()));
 await Promise.all([login(org,organization),login(pf,alice),login(other,bob),login(reviewer,editor)]);
 const path='/dashboard/projetos/'+project+'/colaboradores';
 await org.getByRole('link',{name:'Gerenciar Colaboradores',exact:true}).click();await expect(org).toHaveURL(origin+path);
 expect((await visitor.goto(path)).url()).toContain('/login');expect((await other.goto(path)).status()).toBe(404);
 await invite(org,'Ana Sementes','colaborador');
 expect((await pf.request.post('/api/atividades',{headers:{origin},data:draft(project)})).status()).toBe(422);
 await pf.goto('/dashboard/pessoa-fisica/nova');await expect(pf.getByLabel('Projeto (opcional)')).toHaveCount(0);
 await pf.goto('/dashboard/pessoa-fisica');const invitation=pf.locator('.collaboration-invitations>li').filter({hasText:'Raízes em Rede'});
 await invitation.getByRole('button',{name:'Aceitar convite',exact:true}).click();await expect(pf.locator('.feedback[role=status]')).toContainText('Resposta ao convite');
 await pf.getByRole('link',{name:'Criar atividade para este projeto',exact:true}).click();await pf.getByLabel('Projeto (opcional)').selectOption(project);
 await pf.getByLabel('Título',{exact:true}).fill(title);await pf.getByLabel('Descrição',{exact:true}).fill(draft(project).descricao);await pf.getByLabel('Data e horário (America/Sao_Paulo)').fill('2027-07-15T14:00');await pf.getByLabel('Orientação de acesso').fill(draft(project).orientacao_acesso);await pf.getByRole('button',{name:'Salvar rascunho',exact:true}).click();await expect(pf).toHaveURL(origin+'/dashboard/pessoa-fisica');
 const activity=(await db.query('select id,criado_por_sujeito_id,sujeito_id from public.atividades where sujeito_id=$1 and projeto_id=$2',[alice.subject,project])).rows[0];expect(activity.criado_por_sujeito_id).toBe(alice.subject);expect(activity.sujeito_id).toBe(alice.subject);
 await org.goto(path);await expect(org.locator('.collaboration-submissions')).toHaveCount(0);expect((await org.request.get('/api/atividades/'+activity.id)).status()).toBe(404);
 const send=async()=>{const card=pf.locator('.activity-list>li').filter({hasText:title});await card.getByRole('checkbox').check();await card.getByRole('button',{name:'Enviar atividade para revisão',exact:true}).click();await expect(card.getByRole('button',{name:'Enviar atividade para revisão',exact:true})).toHaveCount(0);};
 await send();
 expect((await reviewer.request.post('/api/admin/atividades/'+activity.id+'/decidir',{headers:{origin},data:{acao:'aprovar_publicacao',versao_esperada:1,pedido_id:randomUUID()}})).status()).toBe(409);
 await reviewer.goto('/admin/atividades');await expect(reviewer.getByRole('heading',{name:title,exact:true})).toHaveCount(0);
 await org.goto(path);let proposal=org.locator('.collaboration-submissions>li').filter({hasText:title});await proposal.getByLabel('Parecer da coordenação').fill('Ajuste a descrição para explicar melhor a proposta e seu vínculo com o projeto.');await proposal.getByRole('button',{name:'Rejeitar atividade no projeto',exact:true}).click();await expect(org.locator('.feedback[role=status]')).toContainText('Decisão registrada');
 await pf.goto('/dashboard/pessoa-fisica');await expect(pf.locator('.activity-list')).toContainText('rejeitado pela coordenação');await pf.getByRole('link',{name:'Editar atividade',exact:true}).click();await pf.getByLabel('Descrição',{exact:true}).fill(draft(project).descricao+' A proposta reúne participantes para plantar sementes na horta do projeto Raízes em Rede.');await pf.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(pf).toHaveURL(origin+'/dashboard/pessoa-fisica');await send();
 await org.goto(path);await invite(org,'Bruno Saberes','apoiador');
 await capture(org,'gerenciar-colaboradores.png');await org.setViewportSize({width:390,height:844});expect(await org.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await capture(org,'gerenciar-colaboradores-mobile.png');await org.setViewportSize({width:1440,height:1050});
 proposal=org.locator('.collaboration-submissions>li').filter({hasText:title});await proposal.getByRole('button',{name:'Aprovar atividade no projeto',exact:true}).click();await expect(org.locator('.feedback[role=status]')).toContainText('Decisão registrada');
 expect((await reviewer.request.post('/api/admin/atividades/'+activity.id+'/decidir',{headers:{origin},data:{acao:'aprovar_publicacao',versao_esperada:2,pedido_id:randomUUID()}})).status()).toBe(200);
 await visitor.goto('/perfil/'+organization.subject);await expect(visitor.locator('.public-project .activity-card')).toContainText(title);await visitor.goto('/perfil/'+alice.subject);await expect(visitor.locator('.activity-card')).toContainText(title);
 await other.goto('/dashboard/pessoa-fisica');await other.getByRole('button',{name:'Recusar convite',exact:true}).click();await expect(other.locator('.feedback[role=status]')).toContainText('Resposta ao convite');expect((await other.request.post('/api/atividades',{headers:{origin},data:draft(project)})).status()).toBe(422);
 await org.goto(path);await org.locator('.collaboration-members>li').filter({hasText:'Ana Sementes'}).getByRole('button',{name:'Remover colaborador',exact:true}).click();await expect(org.locator('.feedback[role=status]')).toContainText('Colaboração removida');expect((await pf.request.post('/api/atividades',{headers:{origin},data:draft(project)})).status()).toBe(422);
 const schema=(await db.query("select relrowsecurity,has_table_privilege('anon','public.vinculos_colaboracao','select') as anon_select,has_table_privilege('authenticated','public.vinculos_colaboracao','update') as user_update from pg_class where oid='public.vinculos_colaboracao'::regclass")).rows[0];expect(schema).toEqual({relrowsecurity:true,anon_select:false,user_update:false});
 writeFileSync(out+'/flow.json',JSON.stringify({pendingBlocked:true,outsiderDenied:true,authorPreserved:true,unsentDraftPrivate:true,coordinationRequired:true,rejectionAndResubmission:true,editorialPublication:true,bothPortfolios:true,refusalAndRemovalBlockCreation:true,rls:schema},null,2)+'\n');
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
