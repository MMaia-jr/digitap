import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createActivityService } from '../../src/lib/activities/service.server';
import { closeDatabasePool, withTransaction, type Transaction, type Sql } from '../../src/lib/database.server';
import {createPublicQueries} from '../../src/lib/queries/public.server';
vi.mock('server-only', () => ({}));
let db: Client, admin: SupabaseClient;
const users: string[] = [], subjects: string[] = [];
const services: ReturnType<typeof createActivityService>[] = [];
const draft = () => ({ titulo: 'Oficina Fictícia ' + randomUUID(), descricao: 'Encontro fictício de saberes comunitários.', inicio_previsto: new Date(Date.now() + 86400000 * 3).toISOString(), orientacao_acesso: 'Acesso gratuito fictício.', referencia_oficial: null });
beforeAll(async () => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') throw new Error('Fixtures locais não autorizadas.');
  const local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  if (local.API_URL !== 'http://127.0.0.1:56151' || new URL(local.DB_URL).hostname !== '127.0.0.1' || new URL(local.DB_URL).port !== '56152') throw new Error('Alvo não autorizado.');
  process.env.SUPABASE_DB_URL = local.DB_URL;
  db = new Client(local.DB_URL); await db.connect();
  admin = createClient(local.API_URL, local.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  for (let i = 0; i < 3; i++) {
    const result = await admin.auth.admin.createUser({ email: `mvp-pf-${randomUUID()}@example.invalid`, password: randomUUID() + 'aA1!', email_confirm: true });
    if (result.error || !result.data.user) throw new Error('Criação da fixture Auth falhou.');
    const user = result.data.user; users.push(user.id);
    const registered = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: user.id, p_nome_publico: 'Pessoa Fictícia MVP ' + i });
    if (registered.error) throw new Error('Criação da fixture PF falhou.');
    subjects.push(registered.data);
    if(i===2)await db.query("update public.contas_acesso set papel='editor' where auth_user_id=$1",[user.id]);
    services.push(createActivityService({ verifyUser: async () => user }));
  }
}, 30000);
afterAll(async () => {
  await closeDatabasePool();
  if (db && users.length) {
    await db.query('begin');
    try {
      const ids=(await db.query('select id from public.atividades where sujeito_id=any($1::uuid[])',[subjects])).rows.map(r=>r.id);
      await db.query('delete from public.eventos_editoriais where objeto_id=any($1::uuid[]) or objeto_id=any($2::uuid[])',[ids,subjects]);
      await db.query('delete from public.casos_moderacao where sujeito_id=any($1::uuid[])',[subjects]);
      await db.query("delete from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=any($1::uuid[])",[ids]);
      await db.query('delete from public.atividades where criada_por_conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))', [users]);
      await db.query('delete from public.vinculos_publicadores where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))', [users]);
      await db.query('delete from public.pessoas_fisicas where conta_id in (select id from public.contas_acesso where auth_user_id=any($1::uuid[]))', [users]);
      await db.query('delete from public.sujeitos_publicadores where id=any($1::uuid[])', [subjects]);
      await db.query('delete from public.contas_acesso where auth_user_id=any($1::uuid[])', [users]);
      await db.query('commit');
    } catch (e) { await db.query('rollback'); throw e; }
    for (const id of users) if ((await admin.auth.admin.deleteUser(id)).error) throw new Error('Limpeza Auth falhou.');
  }
  await db?.end();
});

async function decide(service:ReturnType<typeof createActivityService>,id:string,body:unknown){
 const fn=Reflect.get(service,'editorialDecision');if(typeof fn!=='function')throw new Error('editorialDecision ainda não existe');return fn(id,body);
}
async function submitted(index=0,ongoing=false){
 const row=await services[index].create({...draft(),...(ongoing?{inicio_previsto:new Date().toISOString(),acontecendo_agora:true}:{})});
 await services[index].submit(row.id,{versao_esperada:1,autoriza_publicacao:true});return row;
}
const approve=()=>({acao:'aprovar_publicacao',versao_esperada:1,pedido_id:randomUUID()});
it('envio PF registra autorização explícita de uma versão e é idempotente',async()=>{
 const row=await submitted();await services[0].submit(row.id,{versao_esperada:1,autoriza_publicacao:true});
 expect((await db.query("select count(*)::int n from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=$1",[row.id])).rows[0].n).toBe(1);
 expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_enviada'",[row.id])).rows[0].n).toBe(1);
});
it('envio sem consentimento ou em nome de outra PF é negado',async()=>{
 const row=await services[0].create(draft());
 await expect(services[0].submit(row.id,{versao_esperada:1})).rejects.toMatchObject({status:422});
 await expect(services[1].submit(row.id,{versao_esperada:1,autoriza_publicacao:true})).rejects.toMatchObject({status:404});
});
it('editor aprova/publica PF agora, faz curadoria e produz snapshot v2 público',async()=>{
 const row=await submitted(0,true),command=approve();
 expect(await decide(services[2],row.id,command)).toMatchObject({estado_editorial:'publicada'});
 const snapshot=await createPublicQueries().get(row.id);expect(snapshot).toMatchObject({tipo:'atividade-publica.v2',sujeito:{id:subjects[0],tipo:'pessoa_fisica'}});
 expect((await db.query('select estado,modo_publicacao from public.sujeitos_publicadores where id=$1',[subjects[0]])).rows[0]).toEqual({estado:'ativo',modo_publicacao:'curadoria_previa'});
 expect((await db.query('select versao,estado from public.casos_moderacao where sujeito_id=$1 order by versao',[subjects[0]])).rows).toEqual([{versao:1,estado:'aberto'},{versao:2,estado:'em_analise'},{versao:3,estado:'encerrado'}]);
 await decide(services[2],row.id,command);
 expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_publicada'",[row.id])).rows[0].n).toBe(1);
});
it('fila inclui sujeito e data, mas não rascunhos não submetidos',async()=>{
 const row=await submitted(),draftOnly=await services[0].create(draft());
 const queue=await services[2].reviewQueue();expect(queue.find(r=>r.id===row.id)).toMatchObject({nome_publicador:'Pessoa Fictícia MVP 0'});expect(queue.some(r=>r.id===draftOnly.id)).toBe(false);
});
it('PF não consegue acessar fila ou executar decisão editorial',async()=>{
 const row=await submitted();await expect(services[0].reviewQueue()).rejects.toMatchObject({status:403});
 await expect(decide(services[0],row.id,approve())).rejects.toMatchObject({status:403});
});
it('rejeição exige motivo e continua privada',async()=>{
 const row=await submitted(),command={acao:'rejeitar',versao_esperada:1,pedido_id:randomUUID(),motivo:'Descrição incompleta para a divulgação solicitada.'};await decide(services[2],row.id,command);await decide(services[2],row.id,command);
 expect((await db.query("select count(*)::int n from public.eventos_editoriais where objeto_id=$1 and acao='atividade_revisao_rejeitada'",[row.id])).rows[0].n).toBe(1);
 expect((await services[0].list()).find(r=>r.id===row.id)).toMatchObject({estado_editorial:'rejeitada',motivo_editorial:'Descrição incompleta para a divulgação solicitada.'});
 await expect(createPublicQueries().get(row.id)).rejects.toMatchObject({status:404});
});
it('consentimento revogado impede aprovação/publicação',async()=>{
 const row=await submitted();await db.query("update public.autorizacoes_publicacao set situacao='revogada',revogada_em=now() where objeto_id=$1",[row.id]);
 await expect(decide(services[2],row.id,approve())).rejects.toMatchObject({status:422});
 expect((await db.query('select estado_editorial from public.atividades where id=$1',[row.id])).rows[0].estado_editorial).toBe('enviada');
});
it('falha de publicação reverte aprovação, curadoria e ativação da PF',async()=>{
 const row=await submitted(1);
 const transaction:Transaction=operation=>withTransaction(sql=>operation({query:async(text:string,values?:unknown[])=>{
  if(text.includes("'atividade_publicada'"))return sql.query('select 1/0');return sql.query(text,values);
 }} as Sql));
 const editor=createActivityService({transaction,verifyUser:async()=>({id:users[2],email_confirmed_at:new Date().toISOString()})});
 await expect(decide(editor,row.id,approve())).rejects.toMatchObject({status:503});
 expect((await db.query('select estado_editorial,versao_publicada from public.atividades where id=$1',[row.id])).rows[0]).toEqual({estado_editorial:'enviada',versao_publicada:null});
 expect((await db.query('select estado from public.sujeitos_publicadores where id=$1',[subjects[1]])).rows[0].estado).toBe('pendente');
 expect((await db.query('select count(*)::int n from public.casos_moderacao where sujeito_id=$1',[subjects[1]])).rows[0].n).toBe(0);
});
