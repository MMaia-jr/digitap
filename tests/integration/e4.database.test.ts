import { afterAll,beforeAll,describe,expect,it,vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient,type SupabaseClient } from '@supabase/supabase-js';
import { createE4Service } from '../../src/lib/capabilities/service.server';
import { createActivityService } from '../../src/lib/activities/service.server';
import { closeDatabasePool,withTransaction,type Sql,type Transaction } from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
const proposalRoute=vi.hoisted(()=>({user:'',interpret:vi.fn()}));
vi.mock('../../src/lib/supabase/server',()=>({userClient:async()=>({})}));
vi.mock('../../src/lib/supabase/admin.server',()=>({adminClient:()=>({})}));
vi.mock('../../src/lib/auth/gateway.server',()=>({createGateway:()=>({
 currentUser:async()=>({id:proposalRoute.user,email_confirmed_at:'2026-11-24T00:00:00Z'}),
 account:async()=>null,
})}));
vi.mock('../../src/lib/proposals/interpret.server',()=>({interpretProposal:proposalRoute.interpret}));

function barrier(){
 let signal!:()=>void,release!:()=>void;
 const reached=new Promise<void>(resolve=>{signal=resolve;});
 const resume=new Promise<void>(resolve=>{release=resolve;});
 return {reached,release,async pause(){signal();await resume;}};
}

let db:Client,admin:SupabaseClient,local:Record<string,string>;
const users:string[]=[],subjects:string[]=[],orgs:string[]=[],projects:string[]=[],activities:string[]=[],records:string[]=[],authClients:SupabaseClient[]=[];
let pfA:string,pfB:string,orgSubject:string,projectId:string;
let subjectRevocationTarget:{userId:string;subjectId:string}|null=null;
const prefix=`E4 synthetic ${randomUUID()}`;
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const services=new Map<string,ReturnType<typeof createE4Service>>();
function service(userId:string){let result=services.get(userId);if(!result){result=createE4Service({verifyUser:async()=>({id:userId,email_confirmed_at:new Date().toISOString()})});services.set(userId,result);}return result;}
const activityServices=new Map<string,ReturnType<typeof createActivityService>>();
function activityService(userId:string){let result=activityServices.get(userId);if(!result){result=createActivityService({verifyUser:async()=>({id:userId,email_confirmed_at:new Date().toISOString()})});activityServices.set(userId,result);}return result;}
describe('E4 — integração com PostgreSQL local, sessão e isolamento',()=>{
 beforeAll(async()=>{
  if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures E4 exigem escopo local explícito.');
  local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']})) as Record<string,string>;
  const api=new URL(local.API_URL),database=new URL(local.DB_URL);
  if(api.origin!=='http://127.0.0.1:56151'||database.hostname!=='127.0.0.1'||database.port!=='56152'||database.pathname!=='/postgres')throw new Error('Alvo fora da allowlist Supabase local E4.');
  process.env.SUPABASE_DB_URL=local.DB_URL;
  db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,opts);
  const addUser=async(label:string)=>{const email=`e4-${label}-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw new Error('Fixture sintética Auth falhou.');const id=created.data.user.id;users.push(id);const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,opts);if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Sessão sintética local falhou.');authClients.push(client);return id;};
  const a=await addUser('pf-a'),b=await addUser('pf-b'),o=await addUser('coord'),editor=await addUser('editor');
  await db.query("insert into public.contas_acesso(auth_user_id,papel) values($1,'editor')",[editor]);
  for(const [user,name] of [[a,`${prefix} PF A`],[b,`${prefix} PF B`]] as const){const r=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:user,p_nome_publico:name});if(r.error)throw new Error('Fixture PF falhou.');subjects.push(r.data);if(user===a)pfA=r.data;else pfB=r.data;}
  const organization=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:o,p_nome_publico:`${prefix} coordenação`,p_canal_publico:null});if(organization.error)throw new Error('Fixture de coordenação falhou.');orgs.push(organization.data);await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[organization.data]);orgSubject=(await db.query('select id from public.sujeitos_publicadores where organizacao_legada_id=$1',[organization.data])).rows[0].id;subjects.push(orgSubject);
  projectId=(await db.query('insert into public.projetos(sujeito_id,titulo,descricao,ano) values($1,$2,$3,2026) returning id',[orgSubject,`${prefix} projeto`,'Projeto sintético E4.'])).rows[0].id;projects.push(projectId);
  await db.query("insert into public.vinculos_colaboracao(sujeito_id,projeto_id,papel,status,origem) values($1,$2,'colaborador','ativo','convite')",[pfA,projectId]);
 },30000);
 afterAll(async()=>{
  await closeDatabasePool();
  if(db){try{
   await db.query('begin');
   try{
    await db.query("delete from public.eventos_editoriais where (objeto_tipo='atividade' and objeto_id=any($1::uuid[])) or (objeto_tipo='sujeito' and objeto_id=any($2::uuid[]))",[activities,subjects]);
    await db.query('delete from public.casos_moderacao where atividade_id=any($1::uuid[]) and sujeito_id=any($2::uuid[])',[activities,subjects]);
    await db.query("delete from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=any($1::uuid[])",[records]);
    await db.query('delete from public.evidencias where registro_id=any($1::uuid[])',[records]);
    await db.query('delete from public.registros_realizacao where id=any($1::uuid[])',[records]);
    await db.query("delete from public.autorizacoes_publicacao where objeto_tipo='registro' and objeto_id=any($1::uuid[])",[records]);
    await db.query("delete from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[activities]);
    await db.query('delete from public.atividades where id=any($1::uuid[])',[activities]);
    await db.query('delete from public.interesses_necessidade where sujeito_id=any($1::uuid[]) or owner_auth_user_id=any($2::uuid[])',[subjects,users]);
    await db.query('delete from public.necessidades_projeto where projeto_id=any($1::uuid[])',[projects]);
    await db.query('delete from public.capacidades where sujeito_id=any($1::uuid[])',[subjects]);
    await db.query('delete from public.vinculos_colaboracao where projeto_id=any($1::uuid[])',[projects]);
    await db.query('delete from public.projetos where id=any($1::uuid[])',[projects]);
    await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])',[subjects]);
    await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])',[subjects]);
    await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[subjects]);
    await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);
    await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
    await db.query('commit');
   }catch(error){await db.query('rollback');throw error;}
   for(const client of authClients)await client.auth.signOut({scope:'local'});
   for(const id of users)if((await admin?.auth.admin.deleteUser(id)).error)throw new Error('Limpeza de conta sintética E4 falhou.');
   const residuals=(await db.query<{auth_users:number;accounts:number;subjects:number;organizations:number;projects:number;activities:number;moderation_cases:number;capabilities:number;needs:number;interests:number}>(`select
    (select count(*)::int from auth.users where id=any($1::uuid[])) auth_users,
    (select count(*)::int from public.contas_acesso where auth_user_id=any($1::uuid[])) accounts,
    (select count(*)::int from public.sujeitos_publicadores where id=any($2::uuid[])) subjects,
    (select count(*)::int from public.organizacoes where id=any($3::uuid[])) organizations,
    (select count(*)::int from public.projetos where id=any($4::uuid[])) projects,
    (select count(*)::int from public.atividades where id=any($5::uuid[])) activities,
    (select count(*)::int from public.casos_moderacao where atividade_id=any($5::uuid[]) and sujeito_id=any($2::uuid[])) moderation_cases,
    (select count(*)::int from public.capacidades where sujeito_id=any($2::uuid[])) capabilities,
    (select count(*)::int from public.necessidades_projeto where projeto_id=any($4::uuid[])) needs,
    (select count(*)::int from public.interesses_necessidade where sujeito_id=any($2::uuid[]) or owner_auth_user_id=any($1::uuid[])) interests`,[users,subjects,orgs,projects,activities])).rows[0];
   if(Object.values(residuals).some(value=>value!==0))throw new Error('Limpeza E4 deixou resíduos nos IDs próprios da execução.');
  }finally{await db.end();}}
 },30000);

 it.each(['before','after-subjects','after-context','during-inference','active'] as const)(
  'G5 E4: colaboração %s entre consulta e resposta',async phase=>{
   vi.resetModules();
   const runtime=(await import('../../src/lib/capabilities/service.server')).e4Service;
   const {POST}=await import('../../src/app/api/propostas/interpretar/route');
   const point=barrier(),origin='http://127.0.0.1:3215';
   const marker='Projeto sintético E4.';
   proposalRoute.user=users[0];
   proposalRoute.interpret.mockReset();
   vi.stubEnv('APP_ORIGIN',origin);
   const context=runtime.context.bind(runtime);
   const contextSpy=vi.spyOn(runtime,'context').mockImplementation(async sid=>{
    if(phase==='after-subjects')await point.pause();
    const data=await context(sid);
    if(phase==='after-context')await point.pause();
    return data;
   });
   proposalRoute.interpret.mockImplementation(async()=>{
    if(phase==='during-inference')await point.pause();
    return {estado:'revisao_humana_pendente', marcador:marker};
   });
   // The UPDATE commits on the fixture connection; E4 reads through its separate pool.
   const setStatus=async(status:string)=>{
    const result=await db.query('update public.vinculos_colaboracao set status=$1 where sujeito_id=$2 and projeto_id=$3',[status,pfA,projectId]);
    expect(result.rowCount).toBe(1);
   };
   let pending:Promise<Response>|undefined;
   try{
    if(phase==='before')await setStatus('recusado');
    pending=POST(new Request(origin+'/api/propostas/interpretar',{
     method:'POST',headers:{origin,host:'127.0.0.1:3215','content-type':'application/json'},
     body:JSON.stringify({texto:'Organizar uma oficina.',contexto:{subjectId:pfA,consentimento:true}}),
    }));
    if(phase!=='before'&&phase!=='active'){
     await Promise.race([point.reached,pending.then(response=>{throw new Error('Resposta antes da barreira: '+response.status);})]);
     await setStatus('recusado');
     point.release();
    }
    const response=await pending;
    if(phase==='after-context'||phase==='during-inference'){
     expect(response.status).toBe(403);
     expect(await response.text()).not.toContain(marker);
     if(phase==='after-context')expect(proposalRoute.interpret).not.toHaveBeenCalled();
     else expect(proposalRoute.interpret).toHaveBeenCalledOnce();
    }else{
     expect(response.status).toBe(200);
     expect(proposalRoute.interpret).toHaveBeenCalledOnce();
     const projection=proposalRoute.interpret.mock.calls[0][1];
     if(phase==='active')expect(projection.projects).toContainEqual(expect.objectContaining({description:marker}));
     else expect(projection.projects).toEqual([]);
    }
   }finally{
    point.release();
    await pending;
    contextSpy.mockRestore();
    vi.unstubAllEnvs();
    await setStatus('ativo');
    await (await import('../../src/lib/database.server')).closeDatabasePool();
   }
  });

 it('RLS e grants bloqueiam acesso direto de anon/authenticated; somente service_role tem privilégio de tabela',async()=>{
  const tables=['capacidades','necessidades_projeto','interesses_necessidade'];
  const result=await db.query(`select c.relname,c.relrowsecurity,c.relforcerowsecurity,has_table_privilege('anon','public.'||c.relname,'select') anon_select,has_table_privilege('authenticated','public.'||c.relname,'select') auth_select,has_table_privilege('service_role','public.'||c.relname,'select') service_select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[])`,[tables]);
  expect(result.rows).toHaveLength(3);for(const row of result.rows){expect(row.relrowsecurity).toBe(true);expect(row.relforcerowsecurity).toBe(true);expect(row.anon_select).toBe(false);expect(row.auth_select).toBe(false);expect(row.service_select).toBe(true);}
  await db.query('begin');try{await db.query('set local role authenticated');await expect(db.query('select id from public.capacidades')).rejects.toMatchObject({code:'42501'});}finally{await db.query('rollback');}
 });

 it('titular cria e consulta somente capacidades próprias; edição é versionada e falha fechada',async()=>{
  const created=await service(users[0]).createCapability({subjectId:pfA,description:'Facilita oficinas comunitárias.',category:'cultura',conditions:'Condições combinadas em conversa.'});
  expect(created.visibility).toBe('privada');expect(created.version).toBe(1);
  expect(await service(users[1]).listCapabilities(pfB)).toEqual([]);
  await expect(service(users[1]).updateCapability({id:created.id,expectedVersion:1,description:'Tentativa externa.',category:'cultura',visibility:'privada'})).rejects.toMatchObject({status:403});
  await expect(service(users[0]).updateCapability({id:created.id,expectedVersion:1,description:'Versão revisada.',category:'cultura',conditions:'Ainda não verificada.',visibility:'privada'})).resolves.toMatchObject({version:2,visibility:'privada'});
  await expect(service(users[0]).updateCapability({id:created.id,expectedVersion:1,description:'Versão concorrente.',category:'cultura',visibility:'privada'})).rejects.toMatchObject({status:409});
  await expect(service(users[0]).updateCapability({id:created.id,expectedVersion:2,description:'Publicação sem elegibilidade.',category:'cultura',visibility:'publica'})).rejects.toMatchObject({status:403});
  await expect(service(users[0]).archiveCapability({id:created.id,expectedVersion:2})).resolves.toMatchObject({estado:'arquivada',visibilidade:'privada'});
 });

 it('projeção contextual pública E4 preserva atribuição e metadados persistidos sem revelar registros inelegíveis',async()=>{
  const editorial=activityService(users[3]);
  const publishActivity=async(owner:string,label:string)=>{
   const service=activityService(owner),activity=await service.create({titulo:`E4 ${label} ${randomUUID()}`,descricao:'Atividade sintética publicada para elegibilidade E4.',inicio_previsto:new Date(Date.now()+86400000*4).toISOString(),orientacao_acesso:'Acesso sintético de teste.',referencia_oficial:null});
   activities.push(activity.id);
   await service.submit(activity.id,{versao_esperada:1,autoriza_publicacao:true});
   await editorial.editorialDecision(activity.id,{acao:'aprovar_publicacao',versao_esperada:1,pedido_id:randomUUID()});
  };
  await publishActivity(users[0],'PF público');
  await publishActivity(users[2],'projeto público');

  const publicCapability=await service(users[0]).createCapability({subjectId:pfA,description:'Capacidade pública sintética para relação E4.',category:'cultura',conditions:'Condições declaradas no ensaio.'});
  await service(users[0]).updateCapability({id:publicCapability.id,expectedVersion:1,description:'Capacidade pública sintética para relação E4.',category:'cultura',conditions:'Condições declaradas no ensaio.',visibility:'publica'});
  const privateCapability=await service(users[1]).createCapability({subjectId:pfB,description:'MARCADOR_PRIVADO_CAPACIDADE_E4',category:'cultura'});
  const visibleNeed=await service(users[2]).createNeed({projectId,description:'Necessidade pública sintética vinculada ao projeto.',categories:['cultura'],conditions:'Condições declaradas no ensaio.'});
  await service(users[2]).updateNeed({id:visibleNeed.id,expectedVersion:1,description:'Necessidade pública sintética vinculada ao projeto.',categories:['cultura'],conditions:'Condições declaradas no ensaio.',visibility:'visivel'});
  const privateNeed=await service(users[2]).createNeed({projectId,description:'MARCADOR_PRIVADO_NECESSIDADE_E4',categories:['cultura']});
  const closedNeed=await service(users[2]).createNeed({projectId,description:'Necessidade encerrada sintética do ensaio.',categories:['cultura']});
  await db.query("update public.necessidades_projeto set visibilidade='visivel',estado='encerrada' where id=$1",[closedNeed.id]);

  const before=(await db.query<{capabilities:number;needs:number;events:number}>(`select (select count(*)::int from public.capacidades where sujeito_id=any($1::uuid[])) capabilities,(select count(*)::int from public.necessidades_projeto where projeto_id=$2) needs,(select count(*)::int from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($3::uuid[])) events`,[subjects,projectId,activities])).rows[0];
  const statements:string[]=[];
  const readOnlyTransaction:Transaction=operation=>withTransaction(sql=>operation({query:async(text:string,values?:unknown[])=>{statements.push(text);return sql.query(text,values);}} as Sql));
  const matches=await createE4Service({transaction:readOnlyTransaction}).discover();
  const after=(await db.query<{capabilities:number;needs:number;events:number}>(`select (select count(*)::int from public.capacidades where sujeito_id=any($1::uuid[])) capabilities,(select count(*)::int from public.necessidades_projeto where projeto_id=$2) needs,(select count(*)::int from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($3::uuid[])) events`,[subjects,projectId,activities])).rows[0];
  const match=matches.find(item=>item.capabilityId===publicCapability.id&&item.needId===visibleNeed.id);
  expect(match).toMatchObject({subjectId:pfA,needOwnerSubjectId:orgSubject,capabilityVersion:2,needVersion:2,capabilityStatus:'ativa',needStatus:'aberta'});
  const capRow=(await db.query<{versao:number;estado:string;criada_em:Date;atualizada_em:Date}>('select versao,estado,criada_em,atualizada_em from public.capacidades where id=$1',[publicCapability.id])).rows[0];
  const needRow=(await db.query<{versao:number;estado:string;criada_em:Date;atualizada_em:Date}>('select versao,estado,criada_em,atualizada_em from public.necessidades_projeto where id=$1',[visibleNeed.id])).rows[0];
  expect(match).toMatchObject({capabilityCreatedAt:capRow.criada_em.toISOString(),capabilityUpdatedAt:capRow.atualizada_em.toISOString(),needCreatedAt:needRow.criada_em.toISOString(),needUpdatedAt:needRow.atualizada_em.toISOString()});
  expect(matches.some(item=>item.capabilityId===privateCapability.id||item.needId===privateNeed.id||item.needId===closedNeed.id)).toBe(false);
  expect(JSON.stringify(matches)).not.toMatch(/MARCADOR_PRIVADO|conta_id|auth_user_id|comprovante_restrito|senha/);
  expect(statements.length).toBeGreaterThanOrEqual(2);expect(statements.every(statement=>/^\s*select\b/i.test(statement))).toBe(true);
  expect(after).toEqual(before);
 });

 it('contexto autenticado conserva história própria e acesso relacional revogável sem revelar privados alheios',async()=>{
  const own=await service(users[0]).createCapability({subjectId:pfA,description:'Privado sintético de A para contexto.',category:'cultura'});
  const publicOwn=await service(users[0]).createCapability({subjectId:pfA,description:'Público sintético de A para contexto.',category:'educacao'});
  const foreign=await service(users[1]).createCapability({subjectId:pfB,description:'SEGREDO_PRIVADO_B_CONTEXT',category:'cultura'});
  const privateProjectNeed=await service(users[2]).createNeed({projectId,description:'SEGREDO_PRIVADO_PROJETO_CONTEXT',categories:['cultura']});
  const publicProjectNeed=await service(users[2]).createNeed({projectId,description:'Necessidade pública sintética do projeto relacionado.',categories:['cultura']});
  const publishActivity=async(owner:string,label:string)=>{
   const ongoing=owner===users[0];
   const activity=await activityService(owner).create({titulo:`Contexto ${label} ${randomUUID()}`,descricao:'Atividade sintética publicada para habilitar conteúdo público E4.',inicio_previsto:ongoing?new Date().toISOString():'2026-11-20T10:00:00-03:00',...(ongoing?{acontecendo_agora:true}:{retrospectiva:true}),orientacao_acesso:'Acesso sintético de teste.',referencia_oficial:null});
   activities.push(activity.id);await activityService(owner).submit(activity.id,{versao_esperada:1,autoriza_publicacao:true});
   await activityService(users[3]).editorialDecision(activity.id,{acao:'aprovar_publicacao',versao_esperada:1,pedido_id:randomUUID()});return activity.id;
  };
  const ownActivity=await publishActivity(users[0],'PF');await publishActivity(users[2],'organização');
  await service(users[0]).updateCapability({id:publicOwn.id,expectedVersion:1,description:'Público sintético de A para contexto.',category:'educacao',visibility:'publica'});
  await service(users[2]).updateNeed({id:publicProjectNeed.id,expectedVersion:1,description:'Necessidade pública sintética do projeto relacionado.',categories:['cultura'],visibility:'visivel'});

  const contextFor=(userId:string,subjectId:string)=>{
   const retrieve=Reflect.get(service(userId),'context') as (subjectId:string)=>Promise<{
   capabilities:Array<{recordId:string;subjectId:string;source:string;version:number;state:string;visibility:string;authorizedScope:string}>;
   projects:Array<{projectId:string;ownerSubjectId:string;access:string;authorizedScope:string}>;
   needs:Array<{recordId:string;ownerSubjectId:string;source:string;version:number;state:string;visibility:string;authorizedScope:string}>;
   realizations:Array<{recordId:string;activityId:string;subjectId:string;source:string;version:number;state:string;certainty:string;authorizedScope:string}>;
   }>;
   return retrieve.call(service(userId),subjectId);
  };
  const context=await contextFor(users[0],pfA);
  expect(context.capabilities.find(item=>item.recordId===own.id)).toMatchObject({subjectId:pfA,source:'capacidades',version:1,state:'ativa',visibility:'privada',authorizedScope:'titular'});
  expect(context.capabilities.find(item=>item.recordId===publicOwn.id)).toMatchObject({subjectId:pfA,source:'capacidades',version:2,state:'ativa',visibility:'publica',authorizedScope:'publico_e_titular'});
  expect(context.capabilities.some(item=>item.recordId===foreign.id)).toBe(false);
  expect(context.projects).toContainEqual(expect.objectContaining({projectId,ownerSubjectId:orgSubject,access:'colaboracao_ativa',authorizedScope:'vinculo_colaboracao'}));
  expect(context.needs.find(item=>item.recordId===publicProjectNeed.id)).toMatchObject({ownerSubjectId:orgSubject,source:'necessidades_projeto',version:2,state:'aberta',visibility:'visivel',authorizedScope:'publico'});
  expect(context.needs.some(item=>item.recordId===privateProjectNeed.id)).toBe(false);
  const coordinatorContext=await contextFor(users[2],orgSubject);
  expect(coordinatorContext.projects).toContainEqual(expect.objectContaining({projectId,access:'owner',authorizedScope:'titular_do_projeto'}));
  expect(coordinatorContext.needs.find(item=>item.recordId===privateProjectNeed.id)).toMatchObject({ownerSubjectId:orgSubject,visibility:'privada',authorizedScope:'titular_do_projeto'});
  expect(JSON.stringify(context)).not.toMatch(/SEGREDO_PRIVADO|auth_user_id|comprovante_restrito/);
  await expect(contextFor(users[1],pfA)).rejects.toMatchObject({status:403});

  const record=await activityService(users[0]).createRecord(ownActivity,{pedido_id:randomUUID(),versao_esperada:1,data_realizacao:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),descricao_factual:'Relato sintético publicado e posteriormente contestado.',origem_informacao:'Declaração sintética de teste.'});
  records.push(record.id);
  const authId=randomUUID();await db.query("insert into public.autorizacoes_publicacao(id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em) values($1,'registro',$2,array['registro_realizacao','registro:versao:1'],'Titular sintético','Comprovante sintético restrito',clock_timestamp())",[authId,record.id]);
  const transition=async(userId:string,action:string,state:string,extra:Record<string,unknown>={})=>{
   const target=activityService(userId),current=await target.getRecord(ownActivity),operation=Reflect.get(target,'recordTransition') as (id:string,input:Record<string,unknown>)=>Promise<unknown>;
   return operation.call(target,ownActivity,{pedido_id:randomUUID(),acao:action,estado_esperado:state,conteudo_esperado:current.conteudo_sha256,...extra});
  };
  await transition(users[0],'enviar','rascunho');await transition(users[3],'iniciar','enviada');
  await transition(users[3],'aprovar','em_revisao',{autorizacao_id:authId,evidencias_aprovadas:[]});await transition(users[3],'publicar','aprovada');
  const publishedRecord=await activityService(users[0]).getRecord(ownActivity);
  await activityService(users[0]).contestRecord(ownActivity,{pedido_id:randomUUID(),conteudo_esperado:publishedRecord.conteudo_sha256,divergencia:'Divergência sintética registrada para teste, sem decisão sobre sua procedência.'});
  const contested=(await contextFor(users[0],pfA)).realizations.find(item=>item.recordId===record.id);
  expect(contested).toMatchObject({activityId:ownActivity,subjectId:pfA,source:'registros_realizacao',version:1,state:'contestado',certainty:'contestacao_registrada_nao_verificada',authorizedScope:'publico'});

  await db.query("update public.vinculos_colaboracao set status='recusado' where sujeito_id=$1 and projeto_id=$2 and status='ativo'",[pfA,projectId]);
  const afterRevocation=await contextFor(users[0],pfA);
  expect(afterRevocation.projects.some(item=>item.projectId===projectId)).toBe(false);
  expect(afterRevocation.needs.some(item=>item.recordId===publicProjectNeed.id||item.recordId===privateProjectNeed.id)).toBe(false);
  expect(afterRevocation.capabilities.some(item=>item.recordId===own.id)).toBe(true);
  subjectRevocationTarget={userId:users[0],subjectId:pfA};
 });

 it('somente coordenação gerencia necessidades; participante ativo não recebe permissão de coordenação',async()=>{
  const created=await service(users[2]).createNeed({projectId,description:'Apoio declarado em oficinas.',categories:['cultura','comunicacao'],conditions:'Condições serão combinadas.'});
  expect(created.visibilidade).toBe('privada');expect(created.estado).toBe('aberta');
  await expect(service(users[0]).listProjectNeeds(projectId)).rejects.toMatchObject({status:403});
  await expect(service(users[1]).updateNeed({id:created.id,expectedVersion:1,description:'Não autorizado.',categories:['cultura'],visibility:'privada'})).rejects.toMatchObject({status:403});
  await expect(service(users[2]).updateNeed({id:created.id,expectedVersion:1,description:'Necessidade revisada.',categories:['cultura'],visibility:'privada'})).resolves.toMatchObject({versao:2});
  await expect(service(users[2]).closeNeed({id:created.id,expectedVersion:1})).rejects.toMatchObject({status:409});
  await expect(service(users[2]).closeNeed({id:created.id,expectedVersion:2})).resolves.toMatchObject({estado:'encerrada',visibilidade:'privada'});
 });

 it('manifestação é idempotente, privada, removível e não cria vínculo ou publicação',async()=>{
  const need=await service(users[2]).createNeed({projectId,description:'Necessidade sintética para interesse.',categories:['cultura']});
  await db.query("update public.necessidades_projeto set visibilidade='visivel' where id=$1",[need.id]);
  const before=await db.query('select (select count(*)::int from public.vinculos_colaboracao where projeto_id=$1) links,(select count(*)::int from public.eventos_editoriais) events',[projectId]);
  const requestId=randomUUID(),input={needId:need.id,subjectId:pfB,requestId};
  const first=await service(users[1]).manifestInterest(input);expect(first.status).toBe('ativo');
  expect(await service(users[1]).manifestInterest(input)).toMatchObject({id:first.id,repetido:true});
  await expect(service(users[1]).manifestInterest({...input,requestId:randomUUID()})).rejects.toMatchObject({status:409});
  await expect(service(users[0]).myInterests(pfA)).resolves.toEqual([]);
  await expect(service(users[1]).withdrawInterest({id:first.id,subjectId:pfB,expectedVersion:1})).resolves.toMatchObject({status:'retirado',versao:2});
  const after=await db.query('select (select count(*)::int from public.vinculos_colaboracao where projeto_id=$1) links,(select count(*)::int from public.eventos_editoriais) events',[projectId]);expect(after.rows).toEqual(before.rows);
  await expect(service(users[1]).manifestInterest({...input,requestId:randomUUID()})).resolves.toMatchObject({status:'ativo',repetido:false});
 });

 it('itens privados não aparecem na descoberta nem são promovidos pela criação',async()=>{
  const cap=await service(users[0]).createCapability({subjectId:pfA,description:'Declaração exclusivamente privada.',category:'cultura'});
  const need=await service(users[2]).createNeed({projectId,description:'Necessidade exclusivamente privada.',categories:['cultura']});
  const discoveries=await service(users[0]).discover();expect(discoveries.some(row=>row.capabilityId===cap.id||row.needId===need.id)).toBe(false);
  const rows=await db.query('select estado,visibilidade from public.capacidades where id=$1 union all select estado,visibilidade from public.necessidades_projeto where id=$2',[cap.id,need.id]);expect(rows.rows).toEqual([{estado:'ativa',visibilidade:'privada'},{estado:'aberta',visibilidade:'privada'}]);
 });

 it('revogação do vínculo titular bloqueia consultas contextuais privadas subsequentes',async()=>{
  expect(subjectRevocationTarget).not.toBeNull();
  const target=subjectRevocationTarget!;
  const revoked=(await db.query("update public.vinculos_publicadores set situacao='revogado',revogada_em=clock_timestamp(),atualizada_em=clock_timestamp() where sujeito_id=$1 and atual and situacao='ativo' returning id",[target.subjectId])).rows;
  expect(revoked).toHaveLength(1);
  await expect(service(target.userId).context(target.subjectId)).rejects.toMatchObject({status:403});
 });
});
