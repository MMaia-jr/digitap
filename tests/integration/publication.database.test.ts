import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {Client} from 'pg';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {createActivityService} from '../../src/lib/activities/service.server';
import {approvedContentHash} from '../../src/lib/activities/publication.server';
import {createPublicQueries} from '../../src/lib/queries/public.server';
import {withTransaction,closeDatabasePool,type Transaction,type Sql} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
let db:Client,admin:SupabaseClient,localPublishableKey:string;const users:string[]=[],orgs:string[]=[],auths:string[]=[],ids:string[]=[],clients:SupabaseClient[]=[];
const services:ReturnType<typeof createActivityService>[]=[],publicQuery=createPublicQueries();
const input=()=>({titulo:'Publicação Fictícia '+randomUUID(),descricao:'Descrição fictícia aprovada para publicação local.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Entrada fictícia de teste.',referencia_oficial:'https://example.invalid/atividade'});
const command=()=>({versao_esperada:1,pedido_id:randomUUID()});
async function authorization(id:string,version=1){const auth=randomUUID();await db.query("insert into public.autorizacoes_publicacao(id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em,validade_ate) values($1,'atividade',$2,$3,'Responsável fictício','Comprovação fictícia restrita',now()-interval '1 minute',now()+interval '1 hour')",[auth,id,['divulgacao','atividade:versao:'+version]]);auths.push(auth);return auth;}
async function approved(owner=0){const activity=await services[owner].create(input());ids.push(activity.id);await services[owner].submit(activity.id,{versao_esperada:1,autoriza_publicacao:true});await services[2].review(activity.id,{acao:'iniciar',estado_esperado:'enviada',...command()});const auth=await authorization(activity.id);await services[2].review(activity.id,{acao:'aprovar',estado_esperado:'em_revisao',...command(),autorizacao_id:auth});return {id:activity.id,auth,activity};}
async function publications(id:string){return Number((await db.query("select count(*) n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_publicada'",[id])).rows[0].n);}
beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures exigem autorização específica.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
 localPublishableKey=local.PUBLISHABLE_KEY;
 process.env.SUPABASE_DB_URL=local.DB_URL;db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<4;i++){
  const email=`publication-db-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';const c=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{papel:'administrador'}});if(c.error||!c.data.user)throw new Error('Fixture Auth falhou.');users.push(c.data.user.id);
  if(i<2){const r=await admin.rpc('criar_organizacao_com_sujeito',{p_auth_user_id:users[i],p_nome_publico:'Organização Fictícia Publicação '+randomUUID(),p_canal_publico:null});if(r.error)throw new Error('Fixture organização falhou.');orgs.push(r.data);if(i===0)await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[r.data]);}
  else await db.query('insert into public.contas_acesso(auth_user_id,papel) values($1,$2)',[users[i],i===2?'editor':'administrador']);
  const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');clients.push(client);
  services.push(createActivityService({verifyUser:async()=>{const r=await client.auth.getUser();if(r.error)throw new Error('Auth indisponível.');return r.data.user;}}));
 }
},30000);
afterAll(async()=>{
 await closeDatabasePool();if(!db)return;
 try{
  const generated=(await db.query<{id:string}>("select id from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids])).rows.map(row=>row.id);
  const authorizationIds=[...new Set([...auths,...generated])];
  const accountIds=(await db.query<{id:string}>('select id from public.contas_acesso where auth_user_id=any($1::uuid[])',[users])).rows.map(row=>row.id);
  const subjectIds=(await db.query<{id:string}>('select id from public.sujeitos_publicadores where organizacao_legada_id=any($1::uuid[])',[orgs])).rows.map(row=>row.id);
  const counts=async()=> (await db.query(`select
   (select count(*)::int from auth.users where id=any($1::uuid[])) as auth,
   (select count(*)::int from public.organizacoes where id=any($2::uuid[])) as organizations,
   (select count(*)::int from public.contas_acesso where id=any($3::uuid[])) as accounts,
   (select count(*)::int from public.sujeitos_publicadores where id=any($4::uuid[])) as subjects,
   (select count(*)::int from public.vinculos_publicadores where conta_id=any($3::uuid[])) as links,
   (select count(*)::int from public.atividades where id=any($5::uuid[])) as activities,
   (select count(*)::int from public.autorizacoes_publicacao where id=any($6::uuid[])) as authorizations,
   (select count(*)::int from public.eventos_editoriais where
     (objeto_tipo='atividade' and objeto_id=any($5::uuid[]))
     or (objeto_tipo='autorizacao' and objeto_id=any($6::uuid[]))) as events
  `,[users,orgs,accountIds,subjectIds,ids,authorizationIds])).rows[0];
  const before=await counts();
  await db.query('begin');
  try{
   await db.query("delete from public.eventos_editoriais where (objeto_tipo='atividade' and objeto_id=any($1::uuid[])) or (objeto_tipo='autorizacao' and objeto_id=any($2::uuid[]))",[ids,authorizationIds]);
   await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[authorizationIds]);
   await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
   await db.query('delete from public.vinculos_publicadores where conta_id=any($1::uuid[])',[accountIds]);
   await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])',[subjectIds]);
   await db.query('delete from public.contas_acesso where id=any($1::uuid[])',[accountIds]);
   await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
   await db.query('commit');
  }catch(error){await db.query('rollback');throw error;}
  for(const client of clients)await client.auth.signOut({scope:'local'});
  for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');
  const after=await counts();
  const output=process.env.A_PRACA_EVIDENCE_DIR;
  if(output&&/^operations\/evidence\/aflora-aut-org-01-[a-zA-Z0-9-]+$/.test(output)){
   writeFileSync(`${output}/publication-fixtures-${process.pid}.json`,JSON.stringify({before,after},null,2)+'\n',{flag:'wx'});
  }
  console.log(JSON.stringify({cleanup:'publication',before,after}));
  expect(Object.values(after).every(value=>value===0)).toBe(true);
 }finally{await db.end();}
});

it('A07/B07 real: anônimo, organizações e privilégios de metadata/payload não publicam',async()=>{
 const {id}=await approved();await expect(createActivityService({verifyUser:async()=>null}).publish(id,command())).rejects.toMatchObject({status:401});
 for(const service of services.slice(0,2))await expect(service.publish(id,command())).rejects.toMatchObject({status:403});
 await expect(services[0].publish(id,{...command(),papel:'administrador'})).rejects.toMatchObject({status:400});expect(await publications(id)).toBe(0);
});
it('A07/B07 real: organização pendente bloqueia publicação mesmo por editor',async()=>{const {id}=await approved(1);await expect(services[2].publish(id,command())).rejects.toMatchObject({status:422});await expect(publicQuery.get(id)).rejects.toMatchObject({status:404});});
it('B07 real: estado confiável bloqueia editor e administrador ativos podem publicar',async()=>{
 const {id}=await approved();await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1",[users[2]]);try{await expect(services[2].publish(id,command())).rejects.toMatchObject({status:403});}finally{await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1",[users[2]]);}
 await expect(services[3].publish(id,command())).resolves.toMatchObject({estado_editorial:'publicada',repetida:false});
});
const invalid:[string,string,unknown][]=[['revogada','situacao','revogada'],['expirada','situacao','expirada'],['prazo vencido','validade_ate',new Date(0)],['revogação inconsistente','revogada_em',new Date()],['futura','autorizada_em',new Date(Date.now()+86400000)],['objeto alheio','objeto_id',randomUUID()],['tipo incompatível','objeto_tipo','organizacao'],['escopo','escopo_autorizado',['registro','atividade:versao:1']],['versão','escopo_autorizado',['divulgacao','atividade:versao:2']],['sem versão','escopo_autorizado',['divulgacao']],['sem comprovante','comprovante_restrito','']];
it.each(invalid)('B07 real: autorização %s bloqueia, sem substituição por outra válida',async(_label,column,value)=>{
 const {id,auth}=await approved();await db.query(`update public.autorizacoes_publicacao set ${column}=$2 where id=$1`,[auth,value]);await authorization(id);
 await expect(services[2].publish(id,command())).rejects.toMatchObject({status:422});expect(await publications(id)).toBe(0);expect((await services[0].get(id)).estado_editorial).toBe('aprovada');
});
it('B07 real: ausência de autorização bloqueia sem snapshot',async()=>{const {id,auth}=await approved();await db.query('delete from public.autorizacoes_publicacao where id=$1',[auth]);await expect(services[2].publish(id,command())).rejects.toMatchObject({status:422});expect(await publications(id)).toBe(0);});
it('B07 real: versão divergente, aprovação sem hash ou conteúdo alterado são recusados',async()=>{
 for(const mode of ['version','legacy','changed']){const {id}=await approved();if(mode==='legacy')await db.query("update public.eventos_editoriais set justificativa_restrita=(justificativa_restrita::jsonb-'conteudo_sha256')::text where objeto_id=$1 and estado_novo='aprovada'",[id]);if(mode==='changed')await db.query("update public.atividades set titulo='Conteúdo divergente fictício' where id=$1",[id]);await expect(services[2].publish(id,{...command(),versao_esperada:mode==='version'?2:1})).rejects.toMatchObject({status:409});expect(await publications(id)).toBe(0);}
});
it('B07 real: snapshot autorizado é persistido com número, timestamp e evento, sem apoios',async()=>{
 const {id,activity}=await approved();await services[2].publish(id,command());const row=(await db.query('select versao_publicada,numero_versao_publicada,publicada_em,apoios_abertos from public.atividades where id=$1',[id])).rows[0];
 expect(row.numero_versao_publicada).toBe(1);expect(row.publicada_em).toBeInstanceOf(Date);expect(row.apoios_abertos).toBe(false);expect(row.versao_publicada.titulo).toBe(activity.titulo);expect(await publications(id)).toBe(1);
 const result=await publicQuery.get(id);expect(result).toEqual(row.versao_publicada);expect(JSON.stringify(result)).not.toMatch(/comprovante|pedido_id|motivo|auth_user|chave|senha/);
});
it('B07 real: seis repetições concorrentes geram uma publicação e um evento',async()=>{const {id}=await approved(),request=command();const result=await Promise.all(Array.from({length:6},()=>services[2].publish(id,request)));expect(result.filter(r=>!r.repetida)).toHaveLength(1);expect(await publications(id)).toBe(1);await expect(services[3].publish(id,request)).rejects.toMatchObject({status:409});});
it('B07 real: pedidos concorrentes distintos não republicam',async()=>{const {id}=await approved();const result=await Promise.allSettled([services[2].publish(id,command()),services[3].publish(id,command())]);expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(result.filter(r=>r.status==='rejected'&&r.reason.status===409)).toHaveLength(1);expect(await publications(id)).toBe(1);});
it('B07 real: FK inválida no evento reverte todos os campos da publicação',async()=>{
 const {id}=await approved();let code='';const fault:Transaction=op=>withTransaction(sql=>op({query:async(text:string,values?:unknown[])=>{try{const changed=values?[...values]:undefined;if(text.includes("'atividade_publicada'"))changed![1]=randomUUID();return await sql.query(text,changed);}catch(error){code=(error as {code:string}).code;throw error;}}} as Sql));
 const service=createActivityService({transaction:fault,verifyUser:async()=>(await clients[2].auth.getUser()).data.user});await expect(service.publish(id,command())).rejects.toMatchObject({status:503});expect(code).toBe('23503');expect((await db.query('select estado_editorial,versao_publicada,numero_versao_publicada,publicada_em,apoios_abertos from public.atividades where id=$1',[id])).rows[0]).toEqual({estado_editorial:'aprovada',versao_publicada:null,numero_versao_publicada:null,publicada_em:null,apoios_abertos:false});expect(await publications(id)).toBe(0);
});
it('B07 real: retry revalida autorização e organização e público falha fechado',async()=>{
 const {id,auth}=await approved(),request=command();await services[2].publish(id,request);await db.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=now() where id=$1",[auth]);await authorization(id);await expect(services[2].publish(id,request)).rejects.toMatchObject({status:422});await expect(publicQuery.get(id)).rejects.toMatchObject({status:404});
 const second=await approved();await services[2].publish(second.id,request);await db.query("update public.organizacoes set estado_validacao='pendente' where id=$1",[orgs[0]]);try{await expect(services[2].publish(second.id,request)).rejects.toMatchObject({status:422});await expect(publicQuery.get(second.id)).rejects.toMatchObject({status:404});}finally{await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[orgs[0]]);}expect(await publications(id)).toBe(1);
});
it('B07 real: leituras públicas ignoram colunas privadas e campos extras do JSON',async()=>{
 const {id}=await approved(),request=command();await services[2].publish(id,request);const before=await publicQuery.get(id);const name=(await db.query('select nome_publico from public.organizacoes where id=$1',[orgs[0]])).rows[0].nome_publico;
 await db.query("update public.atividades set titulo='Rascunho privado divergente',versao_publicada=versao_publicada||'{\"comprovante_restrito\":\"SEGREDO_FICTICIO_NAO_PUBLICAR\"}'::jsonb where id=$1",[id]);await db.query("update public.organizacoes set nome_publico='Nome privado alterado' where id=$1",[orgs[0]]);
 try{expect(await publicQuery.get(id)).toEqual(before);await expect(services[2].publish(id,request)).resolves.toMatchObject({repetida:true});expect((await publicQuery.list()).some(a=>a.id===id)).toBe(true);}finally{await db.query('update public.organizacoes set nome_publico=$2 where id=$1',[orgs[0],name]);}
 await db.query("update public.atividades set versao_publicada=jsonb_set(versao_publicada,'{titulo}','\"Snapshot adulterado fictício\"') where id=$1",[id]);await expect(publicQuery.get(id)).rejects.toMatchObject({status:404});
});
it('B07 real: rascunho, enviada e aprovada não são públicos; edição publicada preserva snapshot anterior (B08)',async()=>{
 const draft=await services[0].create(input());ids.push(draft.id);await expect(publicQuery.get(draft.id)).rejects.toMatchObject({status:404});await services[0].submit(draft.id,{versao_esperada:1,autoriza_publicacao:true});await expect(publicQuery.get(draft.id)).rejects.toMatchObject({status:404});const {id}=await approved();await expect(publicQuery.get(id)).rejects.toMatchObject({status:404});await services[2].publish(id,command());const before=await publicQuery.get(id);await expect(services[0].update(id,{...input(),versao_esperada:1})).resolves.toMatchObject({estado_editorial:'rascunho',versao_submetida:2});expect(await publicQuery.get(id)).toEqual(before);
});
it('B07 real: revogação concorrente confirmada impede publicação que esperava lock',async()=>{
 const {id,auth}=await approved();await db.query('begin');await db.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=now() where id=$1",[auth]);const result=services[2].publish(id,command()).then(value=>({value,error:undefined}),error=>({value:undefined,error}));let waiting=false;
 try{for(let i=0;i<75;i++){await db.query('select pg_stat_clear_snapshot()');waiting=(await db.query("select exists(select 1 from pg_stat_activity where pid<>pg_backend_pid() and wait_event_type='Lock' and pg_backend_pid()=any(pg_blocking_pids(pid))) waiting")).rows[0].waiting;if(waiting)break;await new Promise(r=>setTimeout(r,20));}await db.query('commit');}finally{await db.query('rollback');}expect(waiting).toBe(true);expect((await result).error?.status).toBe(422);expect(await publications(id)).toBe(0);
});

it('AFLORA-02C: declaração retrospectiva é específica da atividade, versão e horário',async()=>{
 const owner=services[0], outsider=services[1], reviewer=services[2];
 const ini='2026-11-17T12:30:00.000Z';
 const data={...input(),inicio_previsto:ini,retrospectiva:true};
 await expect(createActivityService({verifyUser:async()=>null}).create(data)).rejects.toMatchObject({status:401});
 await expect(reviewer.create(data)).rejects.toMatchObject({status:403});
 const activity=await owner.create(data);ids.push(activity.id);
 const id=activity.id;
 expect(await owner.get(id)).toMatchObject({retrospectiva:true,inicio_previsto:ini,estado_editorial:'rascunho'});
 await expect(outsider.update(id,{...data,versao_esperada:1})).rejects.toMatchObject({status:404});
 const edited='2026-11-18T17:15:00.000Z';
 await expect(owner.update(id,{...data,inicio_previsto:edited,versao_esperada:1})).resolves.toMatchObject({versao_submetida:2});
 expect(await owner.get(id)).toMatchObject({retrospectiva:true,inicio_previsto:edited});
 const events=(await db.query(`
   select e.id,e.objeto_id,e.justificativa_restrita::jsonb as meta,c.auth_user_id
   from public.eventos_editoriais e join public.contas_acesso c on c.id=e.executada_por_conta_id
   where e.objeto_tipo='atividade' and e.objeto_id=$1 and e.acao='atividade_horario_retrospectivo'
   order by (e.justificativa_restrita::jsonb->>'versao')::int
 `,[id])).rows;
 expect(events).toMatchObject([
  {objeto_id:id,auth_user_id:users[0],meta:{tipo:'horario-retrospectivo.v1',versao:1,inicio_previsto:ini}},
  {objeto_id:id,auth_user_id:users[0],meta:{tipo:'horario-retrospectivo.v1',versao:2,inicio_previsto:edited}},
 ]);
 const alter=(meta:unknown)=>db.query('update public.eventos_editoriais set justificativa_restrita=$2 where id=$1',[events[1].id,JSON.stringify(meta)]);
 await alter({...events[1].meta,inicio_previsto:ini});
 await expect(owner.submit(id,{versao_esperada:2,autoriza_publicacao:true})).rejects.toMatchObject({status:422});
 await db.query("update public.eventos_editoriais set acao='fixture_ocultada' where id=$1",[events[1].id]);
 await expect(owner.submit(id,{versao_esperada:2,autoriza_publicacao:true})).rejects.toMatchObject({status:422});
 await alter(events[1].meta);
 await db.query("update public.eventos_editoriais set acao='atividade_horario_retrospectivo' where id=$1",[events[1].id]);
 await owner.submit(id,{versao_esperada:2,autoriza_publicacao:true});
 await expect(publicQuery.get(id)).rejects.toMatchObject({status:404});
 const step=()=>({...command(),versao_esperada:2});
 await reviewer.review(id,{...step(),acao:'iniciar',estado_esperado:'enviada'});
 await expect(reviewer.review(id,{...step(),acao:'aprovar',estado_esperado:'em_revisao',autorizacao_id:randomUUID()})).rejects.toMatchObject({status:422});
 const authorizationId=await authorization(id,2);
 await reviewer.review(id,{...step(),acao:'aprovar',estado_esperado:'em_revisao',autorizacao_id:authorizationId});
 await expect(owner.publish(id,step())).rejects.toMatchObject({status:403});
 await reviewer.publish(id,step());
 expect(await publicQuery.get(id)).toMatchObject({inicio_previsto:edited,estado_programacao:'realizada',versao:2});
});

async function ownConsent(activityId:string){
 return (await db.query(`select id,situacao,revogada_em,escopo_autorizado,comprovante_restrito::jsonb as proof
   from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=$1
     and papel_autorizante='Representação organizacional autenticada'
   order by autorizada_em,id`,[activityId])).rows;
}

it('AUT-ORG-01: T01–T04, concessão afirmativa vinculada à versão e publicação somente editorial',async()=>{
 const owner=services[0], reviewer=services[2];
 const activity=await owner.create(input());ids.push(activity.id);
 expect(activity.estado_editorial).toBe('rascunho');
 expect(await ownConsent(activity.id)).toEqual([]);
 await expect(owner.submit(activity.id,{versao_esperada:1,autoriza_publicacao:false})).rejects.toMatchObject({status:422});
 await expect(services[1].submit(activity.id,{versao_esperada:1,autoriza_publicacao:true})).rejects.toMatchObject({status:404});
 await expect(owner.submit(activity.id,{versao_esperada:2,autoriza_publicacao:true})).rejects.toMatchObject({status:409});
 const identity=(await db.query(`
  select v.id,v.versao,v.escopos,v.sujeito_id,c.id as conta_id
  from public.vinculos_publicadores v join public.contas_acesso c on c.id=v.conta_id
  where c.auth_user_id=$1 and v.atual
 `,[users[0]])).rows[0];
 const email=`publication-db-limited-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
 if(created.error||!created.data.user)throw new Error('Fixture de representação insuficiente indisponível.');
 const limitedUser=created.data.user.id;users.push(limitedUser);
 const limitedAccount=(await db.query<{id:string}>("insert into public.contas_acesso(auth_user_id,organizacao_id,papel) values($1,$2,'organizacao') returning id",[limitedUser,orgs[0]])).rows[0].id;
 await db.query(`
  insert into public.vinculos_publicadores(sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,ativada_em)
  values($1,$2,'representante',ARRAY['enviar'],'ativo','cadastro',clock_timestamp())
 `,[identity.sujeito_id,limitedAccount]);
 const limitedClient=createClient('http://127.0.0.1:56151',localPublishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 clients.push(limitedClient);
 if((await limitedClient.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');
 const limited=createActivityService({verifyUser:async()=>(await limitedClient.auth.getUser()).data.user});
 await expect(limited.submit(activity.id,{versao_esperada:1,autoriza_publicacao:true})).rejects.toMatchObject({status:403});
 expect(await ownConsent(activity.id)).toEqual([]);
 await expect(owner.submit(activity.id,{versao_esperada:1,autoriza_publicacao:true})).resolves.toMatchObject({estado_editorial:'enviada'});
 const [authorization]=await ownConsent(activity.id);
 expect(authorization).toMatchObject({
  situacao:'vigente',escopo_autorizado:['divulgacao','atividade:versao:1'],
  proof:{tipo:'consentimento-organizacao.v1',atividade_id:activity.id,versao:1,conta_id:identity.conta_id,organizacao_id:orgs[0],sujeito_id:identity.sujeito_id,conteudo_sha256:approvedContentHash(activity)},
 });
 await expect(publicQuery.get(activity.id)).rejects.toMatchObject({status:404});
 await expect(owner.publish(activity.id,command())).rejects.toMatchObject({status:403});
 await reviewer.editorialDecision(activity.id,{...command(),acao:'aprovar_publicacao'});
 const snapshot=await publicQuery.get(activity.id);
 expect(snapshot).toMatchObject({id:activity.id,versao:1,titulo:activity.titulo});
 expect(JSON.stringify(snapshot)).not.toMatch(/conta_id|comprovante|conteudo_sha256|consentimento-organizacao/);
});

it('AUT-ORG-01: T05, concorrência, revogação e nova versão mantêm autorizações distintas',async()=>{
 const owner=services[0], reviewer=services[2];
 const activity=await owner.create(input());ids.push(activity.id);
 const id=activity.id, consent={versao_esperada:1,autoriza_publicacao:true};
 const responses=await Promise.all(Array.from({length:6},()=>owner.submit(id,consent)));
 expect(responses.every(response=>response.estado_editorial==='enviada')).toBe(true);
 const first=await ownConsent(id);expect(first).toHaveLength(1);
 await reviewer.editorialDecision(id,{...command(),acao:'aprovar_publicacao'});
 await owner.update(id,{...input(),versao_esperada:1});
 await expect(owner.submit(id,consent)).rejects.toMatchObject({status:409});
 await expect(owner.submit(id,{versao_esperada:2})).rejects.toMatchObject({status:422});
 await owner.submit(id,{...consent,versao_esperada:2});
 const current=await ownConsent(id);expect(current.map(item=>item.proof.versao)).toEqual([1,2]);
 await reviewer.revokeAuthorization(id,{pedido_id:randomUUID(),autorizacao_id:current[1].id,motivo:'Revogação sintética para verificar idempotência da autorização.'});
 await owner.submit(id,{...consent,versao_esperada:2});
 const after=await ownConsent(id);
 expect(after).toHaveLength(2);
 expect(after[1]).toMatchObject({id:current[1].id,situacao:'revogada',revogada_em:expect.any(Date)});
 await expect(reviewer.editorialDecision(id,{...command(),versao_esperada:2,acao:'aprovar_publicacao'})).rejects.toMatchObject({status:422});
});

it('AUT-ORG-01: T01, falha na auditoria do envio reverte também a autorização',async()=>{
 const activity=await services[0].create(input());ids.push(activity.id);
 const fault:Transaction=operation=>withTransaction(sql=>operation({
  query:async(text:string,values?:unknown[])=>{
   if(text.includes("'atividade_enviada'"))return sql.query('select 1/0');
   return sql.query(text,values);
  },
 } as Sql));
 const service=createActivityService({transaction:fault,verifyUser:async()=>(await clients[0].auth.getUser()).data.user});
 await expect(service.submit(activity.id,{versao_esperada:1,autoriza_publicacao:true})).rejects.toMatchObject({status:503});
 expect(await ownConsent(activity.id)).toEqual([]);
 expect((await services[0].get(activity.id)).estado_editorial).toBe('rascunho');
 expect((await db.query("select id from public.eventos_editoriais where objeto_id=$1 and acao='atividade_divulgacao_autorizada'",[activity.id])).rowCount).toBe(0);
});

async function editRepresentative(mode:'sem-editar'|'editar'|'suspenso'|'revogado'|'substituido'){
 const email=`publication-db-edit-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';
 const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
 if(created.error||!created.data.user)throw new Error('Fixture de representação indisponível.');
 const user=created.data.user.id;users.push(user);
 const account=(await db.query<{id:string}>("insert into public.contas_acesso(auth_user_id,organizacao_id,papel) values($1,$2,'organizacao') returning id",[user,orgs[0]])).rows[0].id;
 const subject=(await db.query<{id:string}>('select id from public.sujeitos_publicadores where organizacao_legada_id=$1',[orgs[0]])).rows[0].id;
 const link=randomUUID();
 const full=['editar','enviar','publicar'],send=['enviar','publicar'];
 const state=mode==='suspenso'||mode==='revogado'?mode:'ativo';
 await db.query(`
  insert into public.vinculos_publicadores
   (id,sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,ativada_em,suspensa_em,revogada_em,atual)
  values($1,$2,$3,'representante',$4,$5,'cadastro',clock_timestamp(),
   case when $5='suspenso' then clock_timestamp() end,
   case when $5='revogado' then clock_timestamp() end,$6)
 `,[link,subject,account,mode==='sem-editar'?send:full,state,mode!=='substituido']);
 if(mode==='substituido')await db.query(`
  insert into public.vinculos_publicadores
   (id,versao,sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,ativada_em)
  values($1,2,$2,$3,'representante',$4,'ativo','cadastro',clock_timestamp())
 `,[link,subject,account,send]);
 const client=createClient('http://127.0.0.1:56151',localPublishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 clients.push(client);
 if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');
 return createActivityService({verifyUser:async()=>(await client.auth.getUser()).data.user});
}

it.each(['sem-editar','suspenso','revogado','substituido'] as const)('FIX-AUT-ORG-01: %s não edita e mantém conteúdo e versão',async mode=>{
 const representative=await editRepresentative(mode);
 const original=input(),activity=await services[0].create(original);ids.push(activity.id);
 const stored=async()=> (await db.query(`select titulo,descricao,inicio_previsto,orientacao_acesso,referencia_oficial,
   versao_submetida,estado_editorial from public.atividades where id=$1`,[activity.id])).rows[0];
 const before=await stored();
 const edit={...original,titulo:'Alteração sintética sem escopo',versao_esperada:1};
 await expect(representative.update(activity.id,edit)).rejects.toMatchObject({status:403});
 expect(await stored()).toEqual(before);
 if(mode==='sem-editar'){
  await expect(representative.submit(activity.id,{versao_esperada:1})).rejects.toMatchObject({status:422});
  await expect(representative.submit(activity.id,{versao_esperada:1,autoriza_publicacao:true})).resolves.toMatchObject({estado_editorial:'enviada'});
  expect(await ownConsent(activity.id)).toHaveLength(1);
 }
});

it('FIX-AUT-ORG-01: titular e representante com editar progridem; alheio e versão obsoleta falham',async()=>{
 const representative=await editRepresentative('editar');
 const original=input(),activity=await services[0].create(original);ids.push(activity.id);
 const edit={...original,titulo:'Alteração sintética autorizada',versao_esperada:1};
 await expect(services[1].update(activity.id,edit)).rejects.toMatchObject({status:404});
 await expect(services[0].update(activity.id,edit)).resolves.toMatchObject({titulo:edit.titulo,versao_submetida:2});
 await expect(representative.update(activity.id,edit)).rejects.toMatchObject({status:409});
 await expect(representative.update(activity.id,{...edit,titulo:'Edição sintética do representante',versao_esperada:2}))
  .resolves.toMatchObject({titulo:'Edição sintética do representante',versao_submetida:3});
});
