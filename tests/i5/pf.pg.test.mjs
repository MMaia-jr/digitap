import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { fingerprint } from '../../scripts/i4-backfill.mjs';

async function fixture(action){
 assert.equal(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP,'1');
 const db=new pg.Client('postgresql://postgres:postgres@127.0.0.1:56152/postgres');await db.connect();
 try{
  await db.query('begin');const user=randomUUID();await db.query('insert into auth.users(id,email_confirmed_at) values($1,now())',[user]);
  const call=async(name='Pessoa Fictícia PF')=>(await db.query('select public.criar_pf_com_sujeito($1,$2) id',[user,name])).rows[0].id;
  const state=async()=>(await db.query(`select c.id conta,c.papel,c.organizacao_id,s.*,p.sujeito_id pf_sujeito_id,p.conta_id pf_conta_id,v.id vinculo,v.conta_id,v.sujeito_id,v.escopos,v.papel_vinculo,v.situacao,v.origem vinculo_origem,v.versao vinculo_versao,v.atual
   from public.contas_acesso c join public.pessoas_fisicas p on p.conta_id=c.id join public.sujeitos_publicadores s on s.id=p.sujeito_id join public.vinculos_publicadores v on v.conta_id=c.id and v.sujeito_id=s.id where c.auth_user_id=$1`,[user])).rows;
  await action({db,user,call,state});
 }finally{await db.query('rollback');await db.end();}
}
test('PF-01: cria publicador sem organização como service_role',()=>fixture(async({db,call,state})=>{
 await db.query('set local role service_role');await call();await db.query('set constraints all immediate');
 const rows=await state();assert.equal(rows.length,1);assert.equal(rows[0].papel,'publicador');assert.equal(rows[0].organizacao_id,null);
}));
test('PF-02: sujeito é PF pendente, risco médio e curadoria prévia',()=>fixture(async({call,state})=>{
 const id=await call();const s=(await state())[0];assert.equal(s.id,id);assert.equal(s.tipo,'pessoa_fisica');assert.equal(s.organizacao_legada_id,null);assert.equal(s.estado,'pendente');assert.equal(s.modo_publicacao,'curadoria_previa');assert.equal(s.risco,'medio');assert.equal(s.origem,'cadastro');assert.equal(s.criado_por_conta_id,s.conta);
}));
test('PF-03: filha aponta para sujeito e conta corretos',()=>fixture(async({call,state})=>{
 const id=await call();const s=(await state())[0];assert.equal(s.pf_sujeito_id,id);assert.equal(s.pf_conta_id,s.conta);assert.equal(s.conta_id,s.conta);assert.equal(s.sujeito_id,id);
}));
test('PF-04: titular ativo tem somente ler_privado, editar e enviar',()=>fixture(async({call,state})=>{
 await call();const s=(await state())[0];assert.deepEqual(s.escopos,['ler_privado','editar','enviar']);assert.equal(s.papel_vinculo,'titular');assert.equal(s.situacao,'ativo');assert.equal(s.vinculo_origem,'cadastro');assert.equal(s.vinculo_versao,1);assert.equal(s.atual,true);
}));
test('PF-05: retry preserva IDs, timestamps e nome sem duplicar',()=>fixture(async({call,state})=>{
 const id=await call(),before=await state();assert.equal(await call('Outro nome fictício'),id);assert.deepEqual(await state(),before);assert.equal(before.length,1);
}));
test('PF-06: nome vazio não deixa conta/sujeito/filha/vínculo',()=>fixture(async({db,user,call})=>{
 await db.query('savepoint invalid_name');await assert.rejects(call(''),{code:'22023'});await db.query('rollback to savepoint invalid_name');
 assert.equal((await db.query('select count(*)::int n from public.contas_acesso where auth_user_id=$1',[user])).rows[0].n,0);
}));
test('PF-06 rollback tardio: falha no vínculo desfaz as quatro inserções',()=>fixture(async({db,user,call})=>{
 await db.query("create function pg_temp.pf_fail() returns trigger language plpgsql as $$ begin raise exception 'Falha fictícia PF' using errcode='23514'; end $$");
 await db.query('create trigger pf_fail before insert on public.vinculos_publicadores for each row execute function pg_temp.pf_fail()');
 const before=await fingerprint(db);await db.query('savepoint fail_link');await assert.rejects(call(),{code:'23514'});await db.query('rollback to savepoint fail_link');
 assert.deepEqual(await fingerprint(db),before);assert.equal((await db.query('select count(*)::int n from public.contas_acesso where auth_user_id=$1',[user])).rows[0].n,0);
}));
test('PF segurança: não converte organização/editor, nem dá EXECUTE a clientes',()=>fixture(async({db,user,call})=>{
 await db.query("select public.criar_organizacao_com_sujeito($1,'Organização Fictícia PF',null)",[user]);
 await db.query('savepoint forbidden');await assert.rejects(call(),{code:'42501'});await db.query('rollback to savepoint forbidden');
 for(const role of ['anon','authenticated']){
  assert.equal((await db.query("select has_function_privilege($1,'public.criar_pf_com_sujeito(uuid,text)','EXECUTE') allowed",[role])).rows[0].allowed,false);
 }
}));
test('PF-14: CUTOVER mantém organização nullable e papel publicador',()=>fixture(async({db})=>{
 assert.equal((await db.query("select is_nullable from information_schema.columns where table_schema='public' and table_name='atividades' and column_name='organizacao_id'")).rows[0].is_nullable,'YES');
 const check=(await db.query("select pg_get_constraintdef(oid) d from pg_constraint where conrelid='public.contas_acesso'::regclass and conname='contas_acesso_papel_check'")).rows[0].d;assert.ok(check.includes('publicador'));
}));
test('PF-15: cadastro não altera conteúdo, snapshots, hashes, eventos ou registros',()=>fixture(async({db,call})=>{
 const u=randomUUID(),activity=randomUUID(),record=randomUUID();await db.query('insert into auth.users(id) values($1)',[u]);
 const org=(await db.query("select public.criar_organizacao_com_sujeito($1,'Organização Fictícia Preservação PF',null) id",[u])).rows[0].id;
 const account=(await db.query('select id from public.contas_acesso where auth_user_id=$1',[u])).rows[0].id;
 const snapshot={tipo:'atividade-publica.v1',id:activity,versao:1,titulo:'Atividade Fictícia PF',descricao:'Descrição exclusivamente fictícia.',inicio_previsto:'2030-01-01T12:00:00.000Z',orientacao_acesso:'Acesso fictício.',referencia_oficial:null,organizacao:{id:org,nome_publico:'Organização Fictícia Preservação PF'},estado_programacao:'programada',publicada_em:'2026-11-06T12:00:00.000Z'};
 await db.query("insert into public.atividades(id,organizacao_id,criada_por_conta_id,titulo,descricao,inicio_previsto,orientacao_acesso,versao_publicada,numero_versao_publicada,publicada_em,estado_editorial) values($1,$2,$3,$4,$5,$6,$7,$8,1,now(),'publicada')",[activity,org,account,snapshot.titulo,snapshot.descricao,snapshot.inicio_previsto,snapshot.orientacao_acesso,JSON.stringify(snapshot)]);
 await db.query("insert into public.registros_realizacao(id,atividade_id,data_realizacao,descricao_factual,origem_informacao,versao_publicada,numero_versao_publicada,publicada_em) values($1,$2,current_date,'Relato exclusivamente fictício','Fixture PF',$3,1,now())",[record,activity,JSON.stringify({tipo:'registro-publico.v1',versao:1,id:record,atividade_id:activity,descricao_factual:'Relato exclusivamente fictício'})]);
 await db.query("insert into public.evidencias(registro_id,tipo_fonte,url_publica,afirmacao_sustentada,consultada_em) values($1,'Fonte fictícia','https://example.invalid/pf','Afirmação fictícia',now())",[record]);
 await db.query("insert into public.apoios(atividade_id,chave_anonima_hash) values($1,$2)",[activity,'f'.repeat(64)]);
 await db.query("insert into public.autorizacoes_publicacao(objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em) values('atividade',$1,array['divulgacao','atividade:versao:1'],'titular','Comprovante fictício',now())",[activity]);
 await db.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,justificativa_restrita) values('atividade',$1,'fixture_preservacao_pf',$2)",[activity,JSON.stringify({snapshot,snapshot_sha256:createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')})]);
 const before=await fingerprint(db);await call();const after=await fingerprint(db);
 for(const t of ['atividades','registros_realizacao','evidencias','autorizacoes_publicacao','apoios','parceiros','eventos_editoriais'])assert.deepEqual(after[t],before[t],t);
}));
