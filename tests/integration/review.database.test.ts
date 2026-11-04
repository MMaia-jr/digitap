import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {createActivityService} from '../../src/lib/activities/service.server';
import {withTransaction,closeDatabasePool,type Transaction,type Sql} from '../../src/lib/database.server';
vi.mock('server-only',()=>({}));
let db:Client,admin:SupabaseClient;const users:string[]=[],orgs:string[]=[],auths:string[]=[],ids:string[]=[],clients:SupabaseClient[]=[];
const services:ReturnType<typeof createActivityService>[]=[];
const input=()=>({titulo:'Revisão Fictícia '+randomUUID(),descricao:'Descrição fictícia para revisão local.',inicio_previsto:new Date(Date.now()+86400000*3).toISOString(),orientacao_acesso:'Entrada fictícia de teste.'});
const command=(acao='iniciar',estado_esperado='enviada',extra:Record<string,unknown>={})=>({acao,estado_esperado,versao_esperada:1,pedido_id:randomUUID(),...extra});
async function submitted(review=false){const row=await services[0].create(input());ids.push(row.id);await services[0].submit(row.id,{versao_esperada:1});if(review)await services[2].review(row.id,command());return row.id;}
async function authorization(id:string,patch:Record<string,unknown>={}){
 const record={id:randomUUID(),objeto_tipo:'atividade',objeto_id:id,escopo_autorizado:['divulgacao','atividade:versao:1'],papel_autorizante:'Responsável fictício',comprovante_restrito:'Comprovação fictícia exclusiva de teste',autorizada_em:new Date(Date.now()-10000),situacao:'vigente',validade_ate:new Date(Date.now()+3600000),revogada_em:null,...patch};
 await db.query('insert into public.autorizacoes_publicacao (id,objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em,situacao,validade_ate,revogada_em) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',Object.values(record));auths.push(record.id);return record.id;
}
beforeAll(async()=>{
 if(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1')throw new Error('Criação/limpeza das fixtures exige autorização específica.');
 const local=JSON.parse(execFileSync('./node_modules/.bin/supabase',['status','--workdir',process.cwd(),'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(local.API_URL!=='http://127.0.0.1:56151'||new URL(local.DB_URL).hostname!=='127.0.0.1'||new URL(local.DB_URL).port!=='56152')throw new Error('Alvo fora do escopo.');
 process.env.SUPABASE_DB_URL=local.DB_URL;db=new Client({connectionString:local.DB_URL});await db.connect();admin=createClient(local.API_URL,local.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(let i=0;i<4;i++){
  const email=`review-db-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{papel:'administrador'}});if(created.error||!created.data.user)throw new Error('Fixture Auth falhou.');users.push(created.data.user.id);
  if(i<2){const link=await admin.rpc('criar_organizacao_pendente',{p_auth_user_id:users[i],p_nome_publico:'Organização Fictícia Revisão '+randomUUID()});if(link.error)throw new Error('Fixture organização falhou.');orgs.push(link.data);}
  else await db.query('insert into public.contas_acesso(auth_user_id,papel) values($1,$2)',[users[i],i===2?'editor':'administrador']);
  const client=createClient(local.API_URL,local.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});if((await client.auth.signInWithPassword({email,password})).error)throw new Error('Login fixture falhou.');clients.push(client);
  services.push(createActivityService({verifyUser:async()=>{const r=await client.auth.getUser();if(r.error)throw new Error('Auth indisponível.');return r.data.user;}}));
 }
},30000);
afterAll(async()=>{
 await closeDatabasePool();
 if(db){
  await db.query('rollback');
  await db.query("delete from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);
  await db.query('delete from public.autorizacoes_publicacao where id=any($1::uuid[])',[auths]);await db.query('delete from public.atividades where id=any($1::uuid[])',[ids]);
  await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])',[users]);await db.query('delete from public.organizacoes where id=any($1::uuid[])',[orgs]);
  for(const c of clients)await c.auth.signOut({scope:'local'});for(const id of users)if((await admin.auth.admin.deleteUser(id)).error)throw new Error('Limpeza fixture Auth falhou.');await db.end();
 }
});
it('B05 real: visitante, proprietário e organização alheia não revisam; metadata não eleva papel',async()=>{
 const id=await submitted();const guest=createActivityService({verifyUser:async()=>null});await expect(guest.review(id,command())).rejects.toMatchObject({status:401});
 for(const s of services.slice(0,2))await expect(s.review(id,command())).rejects.toMatchObject({status:403});
 await expect(services[0].review(id,{...command(),papel:'editor'})).rejects.toMatchObject({status:400});
});
it('B05 real: editor/admin ativos iniciam e bloqueio é relido sem renovar JWT',async()=>{
 for(const i of [2,3]){const id=await submitted();await expect(services[i].review(id,command())).resolves.toMatchObject({estado_editorial:'em_revisao'});}
 await db.query("update public.contas_acesso set situacao='bloqueada' where auth_user_id=$1",[users[2]]);
 try{await expect(services[2].review(await submitted(),command())).rejects.toMatchObject({status:403});}finally{await db.query("update public.contas_acesso set situacao='ativa' where auth_user_id=$1",[users[2]]);}
});
it('B05 real: não aprova rascunho/enviada sem revisão e detecta versão antiga',async()=>{
 const id=await submitted();const auth=await authorization(id);await expect(services[2].review(id,command('aprovar','enviada',{autorizacao_id:auth}))).rejects.toMatchObject({status:409});
 await expect(services[2].review(id,command('iniciar','enviada',{versao_esperada:2}))).rejects.toMatchObject({status:409});
});
const invalidAuthorizations:[string,Record<string,unknown>][]=[
 ['ausente',{id:randomUUID()}],['revogada',{situacao:'revogada'}],['expirada',{situacao:'expirada'}],['prazo vencido',{validade_ate:new Date(0)}],['revogada com status inconsistente',{revogada_em:new Date()}],['autorização futura',{autorizada_em:new Date(Date.now()+86400000)}],['outro objeto',{objeto_id:randomUUID()}],['outro tipo',{objeto_tipo:'organizacao'}],['outro escopo',{escopo_autorizado:['registro','atividade:versao:1']}],['genérica sem versão',{escopo_autorizado:['divulgacao']}],['outra versão',{escopo_autorizado:['divulgacao','atividade:versao:2']}],['sem papel autorizante',{papel_autorizante:''}],['sem comprovação',{comprovante_restrito:''}]
];
it.each(invalidAuthorizations)('B05 real: autorização %s impede aprovação',async(label,patch)=>{
 const id=await submitted(true);const auth=label==='ausente'?String(patch.id):await authorization(id,patch);
 await expect(services[2].review(id,command('aprovar','em_revisao',{autorizacao_id:auth}))).rejects.toMatchObject({status:422});
 expect((await services[0].get(id)).estado_editorial).toBe('em_revisao');expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and estado_novo='aprovada'",[id])).rows[0].n).toBe(0);
});
it('B05 real: aprovação autorizada audita versão sem snapshot, publicação ou apoio',async()=>{
 const id=await submitted(true),auth=await authorization(id);await expect(services[2].review(id,command('aprovar','em_revisao',{autorizacao_id:auth}))).resolves.toMatchObject({estado_editorial:'aprovada'});
 const row=(await db.query('select estado_editorial,versao_publicada,numero_versao_publicada,publicada_em,apoios_abertos from public.atividades where id=$1',[id])).rows[0];expect(row).toEqual({estado_editorial:'aprovada',versao_publicada:null,numero_versao_publicada:null,publicada_em:null,apoios_abertos:false});
 const e=(await db.query("select justificativa_restrita,executada_por_conta_id is not null author from public.eventos_editoriais where objeto_id=$1 and estado_novo='aprovada'",[id])).rows[0];expect(e.author).toBe(true);expect(JSON.parse(e.justificativa_restrita)).toMatchObject({versao_esperada:1,autorizacao_id:auth});
 await expect(services[0].submit(id,{versao_esperada:1})).rejects.toMatchObject({status:409});
});
it.each(['devolver','rejeitar'])('B06 real: %s exige motivo e só dono/editor o consultam',async acao=>{
 const id=await submitted(),motivo='Justificativa fictícia restrita desta decisão.';
 await expect(services[2].review(id,command(acao,'enviada',{motivo:''}))).rejects.toMatchObject({status:422});
 const request=command(acao,'enviada',{motivo});await services[2].review(id,request);
 const own=await services[0].get(id);expect(own.motivo_editorial).toBe(motivo);expect(JSON.stringify(own)).not.toContain(request.pedido_id);await expect(services[1].get(id)).rejects.toMatchObject({status:404});
 expect((await services[2].get(id)).motivo_editorial).toBe(motivo);
});
it('B05 real: 6 aprovações com a mesma chave geram um evento e retries',async()=>{
 const id=await submitted(true),auth=await authorization(id),request=command('aprovar','em_revisao',{autorizacao_id:auth});const results=await Promise.all(Array.from({length:6},()=>services[2].review(id,request)));
 expect(results.every(v=>v.estado_editorial==='aprovada')).toBe(true);expect(results.filter(v=>!v.repetida).length).toBe(1);expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and estado_novo='aprovada'",[id])).rows[0].n).toBe(1);
});
it('B05 real: retry após revogar autorização é negado, sem duplicar aprovação',async()=>{
 const id=await submitted(true),auth=await authorization(id),request=command('aprovar','em_revisao',{autorizacao_id:auth});await services[2].review(id,request);
 await db.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=now() where id=$1",[auth]);
 await expect(services[2].review(id,request)).rejects.toMatchObject({status:422});expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and estado_novo='aprovada'",[id])).rows[0].n).toBe(1);
});
it('B05/B06 real: decisões concorrentes diferentes conflitam e não sobrescrevem',async()=>{
 const id=await submitted(true),auth=await authorization(id);const results=await Promise.allSettled([services[2].review(id,command('aprovar','em_revisao',{autorizacao_id:auth})),services[3].review(id,command('rejeitar','em_revisao',{motivo:'Divergência fictícia justificada.'}))]);
 expect(results.filter(v=>v.status==='fulfilled').length).toBe(1);expect(results.filter(v=>v.status==='rejected'&&v.reason.status===409).length).toBe(1);
});
it('B06 real: reuso da chave com outro motivo/autor conflita e preserva o primeiro',async()=>{
 const id=await submitted(),motivo='Motivo fictício original.',request=command('devolver','enviada',{motivo});await services[2].review(id,request);
 await expect(services[2].review(id,{...request,motivo:'Outro motivo fictício.'})).rejects.toMatchObject({status:409});await expect(services[3].review(id,request)).rejects.toMatchObject({status:409});expect((await services[0].get(id)).motivo_editorial).toBe(motivo);
});
it.each(['iniciar','aprovar','devolver','rejeitar'])('B05/B06 real: falha FK na auditoria de %s reverte a transição',async acao=>{
 const id=await submitted(acao==='aprovar');const before=acao==='aprovar'?'em_revisao':'enviada';const auth=acao==='aprovar'?await authorization(id):undefined;
 const request=command(acao,before,acao==='aprovar'?{autorizacao_id:auth}:acao==='iniciar'?{}:{motivo:'Motivo fictício para falha de auditoria.'});let code='';
 const fault:Transaction=op=>withTransaction(sql=>op({query:async(text:string,values?:unknown[])=>{
  try{const changed=values?[...values]:undefined;if(text.includes('insert into public.eventos_editoriais'))changed![2]=randomUUID();return await sql.query(text,changed);}catch(error){code=(error as {code:string}).code;throw error;}
 }} as Sql));
 const faulty=createActivityService({transaction:fault,verifyUser:async()=>(await clients[2].auth.getUser()).data.user});
 await expect(faulty.review(id,request)).rejects.toMatchObject({status:503});expect(code).toBe('23503');expect((await services[0].get(id)).estado_editorial).toBe(before);
 const history=(await db.query("select justificativa_restrita from public.eventos_editoriais where objeto_id=$1 and acao like 'atividade_revisao_%'",[id])).rows;expect(history.some(v=>JSON.parse(v.justificativa_restrita).pedido_id===request.pedido_id)).toBe(false);
});
it('B05 real: revogação concorrente confirmada impede aprovação que esperava lock',async()=>{
 const id=await submitted(true),auth=await authorization(id);await db.query('begin');await db.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=now() where id=$1",[auth]);
 const result=services[2].review(id,command('aprovar','em_revisao',{autorizacao_id:auth})).then(value=>({value,error:undefined}),error=>({value:undefined,error}));
 let waiting=false;
 try{for(let i=0;i<75;i++){await db.query('select pg_stat_clear_snapshot()');waiting=(await db.query("select exists(select 1 from pg_stat_activity where pid<>pg_backend_pid() and wait_event_type='Lock' and query like 'select id from public.autorizacoes_publicacao%') waiting")).rows[0].waiting;if(waiting)break;await new Promise(r=>setTimeout(r,20));}await db.query('commit');}finally{await db.query('rollback');}
 expect(waiting).toBe(true);expect((await result).error?.status).toBe(422);expect((await services[0].get(id)).estado_editorial).toBe('em_revisao');
});
