import { afterAll,beforeAll,describe,expect,it,vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient,type SupabaseClient } from '@supabase/supabase-js';
import { createE4Service } from '../../src/lib/capabilities/service.server';
import { closeDatabasePool } from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));

let db:Client,admin:SupabaseClient,local:Record<string,string>;
const users:string[]=[],subjects:string[]=[],orgs:string[]=[],projects:string[]=[],authClients:SupabaseClient[]=[];
let pfA:string,pfB:string,orgSubject:string,projectId:string;
const prefix=`E4 synthetic ${randomUUID()}`;
const opts={auth:{persistSession:false,autoRefreshToken:false}};
const services=new Map<string,ReturnType<typeof createE4Service>>();
function service(userId:string){let result=services.get(userId);if(!result){result=createE4Service({verifyUser:async()=>({id:userId,email_confirmed_at:new Date().toISOString()})});services.set(userId,result);}return result;}
async function cleanupSynthetic(){
 const syntheticUsers=(await db.query<{id:string;organizacao_id:string|null}>(`select c.auth_user_id as id,c.organizacao_id from public.contas_acesso c join auth.users u on u.id=c.auth_user_id where u.email like 'e4-%@example.invalid' and u.created_at>now()-interval '1 day'`)).rows;
 const userIds=syntheticUsers.map(x=>x.id),subjectRows=(await db.query<{id:string}>(`select s.id from public.sujeitos_publicadores s where s.nome_publico like 'E4 synthetic %' and s.criada_em>now()-interval '1 day'`)).rows,subjectIds=subjectRows.map(x=>x.id);
 const projectRows=(await db.query<{id:string}>(`select id from public.projetos where titulo like 'E4 synthetic %' and criado_em>now()-interval '1 day'`)).rows,projectIds=projectRows.map(x=>x.id),orgIds=syntheticUsers.flatMap(x=>x.organizacao_id?[x.organizacao_id]:[]);
 await db.query('begin');try{await db.query('delete from public.interesses_necessidade where sujeito_id=any($1::uuid[]) or owner_auth_user_id=any($2::uuid[])',[subjectIds,userIds]);await db.query('delete from public.necessidades_projeto where projeto_id=any($1::uuid[])',[projectIds]);await db.query('delete from public.capacidades where sujeito_id=any($1::uuid[])',[subjectIds]);await db.query('delete from public.vinculos_colaboracao where projeto_id=any($1::uuid[])',[projectIds]);await db.query('delete from public.projetos where id=any($1::uuid[])',[projectIds]);await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])',[subjectIds]);await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])',[subjectIds]);await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[subjectIds]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[userIds]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgIds]);await db.query('commit');}catch(error){await db.query('rollback');throw error;}
 for(const id of userIds)await admin.auth.admin.deleteUser(id);
}

describe('E4 — integração com PostgreSQL local, sessão e isolamento',()=>{
 beforeAll(async()=>{
  if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures E4 exigem escopo local explícito.');
  local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']})) as Record<string,string>;
  const api=new URL(local.API_URL),database=new URL(local.DB_URL);
  if(api.origin!=='http://127.0.0.1:56151'||database.hostname!=='127.0.0.1'||database.port!=='56152'||database.pathname!=='/postgres')throw new Error('Alvo fora da allowlist Supabase local E4.');
  process.env.SUPABASE_DB_URL=local.DB_URL;
  db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,opts);await cleanupSynthetic();
  const addUser=async(label:string)=>{const email=`e4-${label}-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw new Error('Fixture sintética Auth falhou.');const id=created.data.user.id;users.push(id);const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,opts);if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Sessão sintética local falhou.');authClients.push(client);return id;};
  const a=await addUser('pf-a'),b=await addUser('pf-b'),o=await addUser('coord');
  for(const [user,name] of [[a,`${prefix} PF A`],[b,`${prefix} PF B`]] as const){const r=await admin.rpc('criar_pf_com_sujeito',{p_auth_user_id:user,p_nome_publico:name});if(r.error)throw new Error('Fixture PF falhou.');subjects.push(r.data);if(user===a)pfA=r.data;else pfB=r.data;}
  const organization=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:o,p_nome_publico:`${prefix} coordenação`,p_canal_publico:null});if(organization.error)throw new Error('Fixture de coordenação falhou.');orgs.push(organization.data);await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[organization.data]);orgSubject=(await db.query('select id from public.sujeitos_publicadores where organizacao_legada_id=$1',[organization.data])).rows[0].id;subjects.push(orgSubject);
  projectId=(await db.query('insert into public.projetos(sujeito_id,titulo,descricao,ano) values($1,$2,$3,2026) returning id',[orgSubject,`${prefix} projeto`,'Projeto sintético E4.'])).rows[0].id;projects.push(projectId);
  await db.query("insert into public.vinculos_colaboracao(sujeito_id,projeto_id,papel,status,origem) values($1,$2,'colaborador','ativo','convite')",[pfA,projectId]);
 },30000);
 afterAll(async()=>{
  await closeDatabasePool();
  if(db){await db.query('begin');try{await db.query('delete from public.interesses_necessidade where sujeito_id=any($1::uuid[]) or owner_auth_user_id=any($2::uuid[])',[subjects,users]);await db.query('delete from public.necessidades_projeto where projeto_id=any($1::uuid[])',[projects]);await db.query('delete from public.capacidades where sujeito_id=any($1::uuid[])',[subjects]);await db.query('delete from public.vinculos_colaboracao where projeto_id=any($1::uuid[])',[projects]);await db.query('delete from public.projetos where id=any($1::uuid[])',[projects]);await db.query('delete from public.vinculos_publicadores where sujeito_id=any($1::uuid[])',[subjects]);await db.query('delete from public.pessoas_fisicas where sujeito_id=any($1::uuid[])',[subjects]);await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[subjects]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);await db.query('commit');}catch(error){await db.query('rollback');throw error;}await db.end();}
  for(const client of authClients)await client.auth.signOut({scope:'local'});for(const id of users)if((await admin?.auth.admin.deleteUser(id)).error)throw new Error('Limpeza de conta sintética E4 falhou.');
 },30000);

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
});
