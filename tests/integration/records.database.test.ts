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
beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Fixtures exigem autorização específica.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
 process.env.SUPABASE_DB_URL=local.DB_URL;db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<4;i++){
  const email=`record-db-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';const c=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{papel:'administrador'}});if(c.error||!c.data.user)throw new Error('Fixture Auth falhou.');users.push(c.data.user.id);
  if(i<2){const r=await admin.rpc('criar_organizacao_pendente',{p_auth_user_id:users[i],p_nome_publico:'Organização Fictícia Publicação '+randomUUID()});if(r.error)throw new Error('Fixture organização falhou.');orgs.push(r.data);if(i===0)await db.query("update public.organizacoes set estado_validacao='validada' where id=$1",[r.data]);}
  else await db.query('insert into public.contas_acesso(auth_user_id,papel) values($1,$2)',[users[i],i===2?'editor':'administrador']);
  const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');clients.push(client);
  services.push(createActivityService({verifyUser:async()=>{const r=await client.auth.getUser();if(r.error)throw new Error('Auth indisponível.');return r.data.user;}}));
 }
},30000);
afterAll(async()=>{
 await closeDatabasePool();if(!db)return;await db.query('rollback');
 await db.query("delete from public.eventos_editoriais where objeto_tipo='registro' and objeto_id in (select id from public.registros_realizacao where atividade_id=any($1::uuid[]))",[ids]);
 await db.query('delete from public.evidencias where registro_id in (select id from public.registros_realizacao where atividade_id=any($1::uuid[]))',[ids]);
 await db.query('delete from public.registros_realizacao where atividade_id=any($1::uuid[])',[ids]);
 await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[auths]);await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
 for(const client of clients)await client.auth.signOut({scope:'local'});for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture falhou.');await db.end();
});

const recordCommand=()=>({...command(),data_realizacao:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()),descricao_factual:'Relato fictício de realização declarada.',origem_informacao:'Declaração da organização fictícia.'});
async function draft(){const row=await services[0].create(input());ids.push(row.id);return row;}
it('C01 PostgreSQL: futura negada, data efetiva privada persiste com auditoria atômica',async()=>{
 const activity=await draft();await expect(services[0].createRecord(activity.id,{...recordCommand(),data_realizacao:'2099-01-01'})).rejects.toMatchObject({status:422});
 expect((await db.query('select count(*)::int n from public.registros_realizacao where atividade_id=$1',[activity.id])).rows[0].n).toBe(0);
 const body=recordCommand(),row=await services[0].createRecord(activity.id,body);expect(row).toMatchObject({estado_editorial:'rascunho',estado_apuracao:'declarado'});expect(await services[0].getRecord(activity.id)).toMatchObject({id:row.id,descricao_factual:body.descricao_factual});await expect(publicQuery.get(activity.id)).rejects.toMatchObject({status:404});
 expect((await db.query("select executada_por_conta_id,ocorrida_em from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao='registro_criado'",[row.id])).rows[0].ocorrida_em).toBeInstanceOf(Date);
});
it('C01 PostgreSQL: proprietário, tenant alheio, visitante, papel editorial e versões são verificados',async()=>{
 const {id}=await draft(),body=recordCommand();await expect(services[1].createRecord(id,body)).rejects.toMatchObject({status:404});await expect(services[2].createRecord(id,body)).rejects.toMatchObject({status:403});await expect(createActivityService({verifyUser:async()=>null}).createRecord(id,body)).rejects.toMatchObject({status:401});await expect(services[0].createRecord(id,{...body,versao_esperada:2})).rejects.toMatchObject({status:409});await services[0].createRecord(id,body);await expect(services[1].getRecord(id)).rejects.toMatchObject({status:404});expect(await services[2].getRecord(id)).toMatchObject({estado_apuracao:'declarado'});
});
it('C01 PostgreSQL: seis retries concorrentes geram um registro e um evento; outro pedido conflita',async()=>{
 const {id}=await draft(),body=recordCommand();const results=await Promise.all(Array.from({length:6},()=>services[0].createRecord(id,body)));expect(results.filter(r=>!r.repetida)).toHaveLength(1);expect(new Set(results.map(r=>r.id)).size).toBe(1);await expect(services[0].createRecord(id,{...body,pedido_id:randomUUID()})).rejects.toMatchObject({status:409});
});
it('C01 PostgreSQL: falha de auditoria reverte inserção do relato',async()=>{
 const {id}=await draft();let code='';const fault:Transaction=op=>withTransaction(sql=>op({query:async(text:string,values?:unknown[])=>{const v=values?[...values]:undefined;if(text.includes('insert into public.eventos_editoriais')&&text.includes('registro_criado'))v![1]=randomUUID();try{return await sql.query(text,v);}catch(error){code=(error as {code:string}).code;throw error;}}} as Sql));
 const service=createActivityService({transaction:fault,verifyUser:async()=>(await clients[0].auth.getUser()).data.user});await expect(service.createRecord(id,recordCommand())).rejects.toMatchObject({status:503});expect(code).toBe('23503');await expect(services[0].getRecord(id)).rejects.toMatchObject({status:404});
});
it('C02 PostgreSQL: só declaração permanece declarada, privada e sem corroboração automática',async()=>{
 const {id}=await draft(),body=recordCommand();await expect(services[0].createRecord(id,{...body,estado_apuracao:'corroborado'})).rejects.toMatchObject({status:400});
 const row=await services[0].createRecord(id,body);const stored=(await db.query('select estado_apuracao,estado_editorial,versao_publicada,numero_versao_publicada from public.registros_realizacao where id=$1',[row.id])).rows[0];expect(stored).toEqual({estado_apuracao:'declarado',estado_editorial:'rascunho',versao_publicada:null,numero_versao_publicada:null});
});
const evidenceCommand=()=>({pedido_id:randomUUID(),tipo_fonte:'Fonte pública fictícia',url_publica:'https://example.invalid/relato',afirmacao_sustentada:'A fonte documenta somente a abertura fictícia.',consultada_em:new Date(Date.now()-60000).toISOString()});
it('C03 PostgreSQL: referência parcial permanece não aprovada e não corrobora o relato total; retry é único',async()=>{
 const {id}=await draft();const record=await services[0].createRecord(id,recordCommand()),request=evidenceCommand();const rows=await Promise.all(Array.from({length:6},()=>services[0].addEvidence(id,request)));expect(rows.filter(r=>!r.repetida)).toHaveLength(1);expect(rows[0]).toMatchObject({aprovada_publicacao:false,afirmacao_sustentada:request.afirmacao_sustentada});
 const stored=await services[0].getRecord(id);expect(stored.estado_apuracao).toBe('declarado');expect(stored.evidencias).toHaveLength(1);expect((await db.query('select versao_publicada from public.registros_realizacao where id=$1',[record.id])).rows[0].versao_publicada).toBeNull();
 await expect(services[1].addEvidence(id,evidenceCommand())).rejects.toMatchObject({status:404});await expect(services[0].addEvidence(id,{...request,afirmacao_sustentada:'Mudança fictícia no mesmo pedido.'})).rejects.toMatchObject({status:409});
});
it('C03 PostgreSQL: falha de auditoria da referência reverte evidência',async()=>{
 const {id}=await draft();await services[0].createRecord(id,recordCommand());let code='';const fault:Transaction=op=>withTransaction(sql=>op({query:async(text:string,values?:unknown[])=>{const v=values?[...values]:undefined;if(text.includes('insert into public.eventos_editoriais')&&text.includes('evidencia_referenciada'))v![1]=randomUUID();try{return await sql.query(text,v);}catch(error){code=(error as {code:string}).code;throw error;}}} as Sql));
 await expect(createActivityService({transaction:fault,verifyUser:async()=>(await clients[0].auth.getUser()).data.user}).addEvidence(id,evidenceCommand())).rejects.toMatchObject({status:503});expect(code).toBe('23503');expect((await services[0].getRecord(id)).evidencias).toHaveLength(0);
});
it('C04 PostgreSQL: fontes impróprias/sensíveis são rejeitadas sem evidências ou eventos novos',async()=>{
 const {id}=await draft(),record=await services[0].createRecord(id,recordCommand());
 for(const url_publica of ['javascript:alert(1)','http://127.0.0.1/arquivo','https://example.invalid/relato?cpf=12345678901','https://example.invalid/relato?token=ficticio'])await expect(services[0].addEvidence(id,{...evidenceCommand(),url_publica})).rejects.toMatchObject({status:422});
 expect((await services[0].getRecord(id)).evidencias).toHaveLength(0);expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_tipo='registro' and objeto_id=$1 and acao='evidencia_referenciada'",[record.id])).rows[0].n).toBe(0);
});
