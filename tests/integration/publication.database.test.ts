import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {createActivityService} from '../../src/lib/activities/service.server';
import {createPublicQueries} from '../../src/lib/queries/public.server';
import {withTransaction,closeDatabasePool,type Transaction,type Sql} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
let db:Client,admin:SupabaseClient;const users:string[]=[],orgs:string[]=[],auths:string[]=[],ids:string[]=[],clients:SupabaseClient[]=[];
const services:ReturnType<typeof createActivityService>[]=[],publicQuery=createPublicQueries();
const input=()=>({titulo:'Publicação Fictícia '+randomUUID(),descricao:'Descrição fictícia aprovada para publicação local.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Entrada fictícia de teste.',referencia_oficial:'https://example.invalid/atividade'});
const command=()=>({versao_esperada:1,pedido_id:randomUUID()});
async function authorization(id:string){const auth=randomUUID();await db.query("insert into public.autorizacoes_publicacao(id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em,validade_ate) values($1,'atividade',$2,$3,'Responsável fictício','Comprovação fictícia restrita',now()-interval '1 minute',now()+interval '1 hour')",[auth,id,['divulgacao','atividade:versao:1']]);auths.push(auth);return auth;}
async function approved(owner=0){const activity=await services[owner].create(input());ids.push(activity.id);await services[owner].submit(activity.id,{versao_esperada:1});await services[2].review(activity.id,{acao:'iniciar',estado_esperado:'enviada',...command()});const auth=await authorization(activity.id);await services[2].review(activity.id,{acao:'aprovar',estado_esperado:'em_revisao',...command(),autorizacao_id:auth});return {id:activity.id,auth,activity};}
async function publications(id:string){return Number((await db.query("select count(*) n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_publicada'",[id])).rows[0].n);}
beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures exigem autorização específica.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
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
 await closeDatabasePool();if(!db)return;await db.query('rollback');
 await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[auths]);await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))',[users]);await db.query('delete from public.sujeitos_publicadores where organizacao_legada_id=any($1::uuid[])',[orgs]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
 for(const client of clients)await client.auth.signOut({scope:'local'});for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');await db.end();
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
 const draft=await services[0].create(input());ids.push(draft.id);await expect(publicQuery.get(draft.id)).rejects.toMatchObject({status:404});await services[0].submit(draft.id,{versao_esperada:1});await expect(publicQuery.get(draft.id)).rejects.toMatchObject({status:404});const {id}=await approved();await expect(publicQuery.get(id)).rejects.toMatchObject({status:404});await services[2].publish(id,command());const before=await publicQuery.get(id);await expect(services[0].update(id,{...input(),versao_esperada:1})).resolves.toMatchObject({estado_editorial:'rascunho',versao_submetida:2});expect(await publicQuery.get(id)).toEqual(before);
});
it('B07 real: revogação concorrente confirmada impede publicação que esperava lock',async()=>{
 const {id,auth}=await approved();await db.query('begin');await db.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=now() where id=$1",[auth]);const result=services[2].publish(id,command()).then(value=>({value,error:undefined}),error=>({value:undefined,error}));let waiting=false;
 try{for(let i=0;i<75;i++){await db.query('select pg_stat_clear_snapshot()');waiting=(await db.query("select exists(select 1 from pg_stat_activity where pid<>pg_backend_pid() and wait_event_type='Lock' and query like 'select id from public.autorizacoes_publicacao%') waiting")).rows[0].waiting;if(waiting)break;await new Promise(r=>setTimeout(r,20));}await db.query('commit');}finally{await db.query('rollback');}expect(waiting).toBe(true);expect((await result).error?.status).toBe(422);expect(await publications(id)).toBe(0);
});
