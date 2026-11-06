import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

async function fixture(action){
  assert.equal(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP,'1');
  const db=new pg.Client('postgresql://postgres:postgres@127.0.0.1:56152/postgres');await db.connect();
  try{await db.query('begin');await action(db);}finally{await db.query('rollback');await db.end();}
}
test('CUT-PG01: organizacao_id nullable após CUTOVER',()=>fixture(async db=>{
  const sql="SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='atividades' AND column_name='organizacao_id'";
  const rows=(await db.query(sql)).rows;console.log(sql);console.log(rows);
  assert.deepEqual(rows,[{column_name:'organizacao_id',is_nullable:'YES'}]);
}));
test('CUT-PG02: conta publicador sem organização é aceita',()=>fixture(async db=>{
  const user=randomUUID();await db.query('insert into auth.users(id) values($1)',[user]);
  const account=(await db.query("insert into public.contas_acesso(auth_user_id,papel,situacao) values($1,'publicador','ativa') returning papel,organizacao_id",[user])).rows[0];
  assert.deepEqual(account,{papel:'publicador',organizacao_id:null});
}));
test('CUT-PG03: atividade híbrida PF+organização é recusada pelo trigger',()=>fixture(async db=>{
  const user=randomUUID();await db.query('insert into auth.users(id) values($1)',[user]);
  const org=(await db.query("select public.criar_organizacao_com_sujeito($1,'Organização fictícia CUTOVER',null) id",[user])).rows[0].id;
  const conta=(await db.query('select id from public.contas_acesso where auth_user_id=$1',[user])).rows[0].id;
  const s=(await db.query("insert into public.sujeitos_publicadores(tipo,nome_publico,origem,criado_por_conta_id) values('pessoa_fisica','Pessoa fictícia','cadastro',$1) returning id",[conta])).rows[0].id;
  await db.query('insert into public.pessoas_fisicas(sujeito_id,conta_id) values($1,$2)',[s,conta]);
  await db.query('savepoint hybrid');
  await assert.rejects(db.query("insert into public.atividades(organizacao_id,sujeito_id,criada_por_conta_id,titulo,descricao,inicio_previsto,orientacao_acesso) values($1,$2,$3,'Atividade fictícia','Descrição fictícia',now(),'Acesso fictício')",[org,s,conta]),error=>{
    console.log('Fixture híbrida:',error.code,error.message);return error.code==='23514';
  });
  await db.query('rollback to savepoint hybrid');
}));
test('CUT-PG04: PF com publicador cria atividade sem organização',()=>fixture(async db=>{
  const user=randomUUID();await db.query('insert into auth.users(id) values($1)',[user]);
  const conta=(await db.query("insert into public.contas_acesso(auth_user_id,papel) values($1,'publicador') returning id",[user])).rows[0].id;
  const sid=(await db.query("insert into public.sujeitos_publicadores(tipo,nome_publico,origem,criado_por_conta_id) values('pessoa_fisica','Pessoa fictícia CUTOVER','cadastro',$1) returning id",[conta])).rows[0].id;
  await db.query('insert into public.pessoas_fisicas(sujeito_id,conta_id) values($1,$2)',[sid,conta]);
  const a=(await db.query("insert into public.atividades(sujeito_id,criada_por_conta_id,titulo,descricao,inicio_previsto,orientacao_acesso) values($1,$2,'Atividade fictícia','Descrição fictícia',now(),'Acesso fictício') returning organizacao_id,sujeito_id,politica_publicacao",[sid,conta])).rows[0];
  assert.deepEqual(a,{organizacao_id:null,sujeito_id:sid,politica_publicacao:'i4'});
  await db.query('set constraints all immediate');
}));
