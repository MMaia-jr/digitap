import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { backfillBatch, fingerprint } from '../../scripts/i4-backfill.mjs';

const scopes = ['ler_privado','editar','enviar','publicar','gerir_vinculo'];
async function fixture(action) {
  assert.equal(process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP, '1');
  const db = new pg.Client('postgresql://postgres:postgres@127.0.0.1:56152/postgres');
  await db.connect();
  try {
    await db.query('begin');
    const user = randomUUID();
    await db.query('insert into auth.users(id) values($1)', [user]);
    const call = async (name = 'Organização Fictícia COMPAT', legacy = false) =>
      (await db.query(`select public.${legacy ? 'criar_organizacao_pendente' : 'criar_organizacao_com_sujeito'}($1,$2,$3) id`, [user,name,null])).rows[0].id;
    const state = async () => (await db.query(`select o.id org,c.id conta,s.*,v.id vinculo,v.sujeito_id,v.conta_id,v.papel_vinculo,v.escopos,v.situacao,v.origem vinculo_origem,v.versao vinculo_versao,v.atual
      from public.contas_acesso c join public.organizacoes o on o.id=c.organizacao_id
      join public.sujeitos_publicadores s on s.organizacao_legada_id=o.id
      join public.vinculos_publicadores v on v.sujeito_id=s.id and v.conta_id=c.id where c.auth_user_id=$1`, [user])).rows;
    await action({db,user,call,state});
  } finally { await db.query('rollback'); await db.end(); }
}

test('CMP-01: wrapper cria organização, conta, sujeito e vínculo atomicamente como service_role', () => fixture(async ({db,call,state}) => {
  await db.query('set local role service_role');
  const org = await call();
  await db.query('set constraints all immediate');
  const rows = await state(); assert.equal(rows.length,1);
  const s = rows[0]; assert.equal(s.org,org); assert.equal(s.tipo,'organizacao');
  assert.equal(s.estado,'pendente'); assert.equal(s.modo_publicacao,'curadoria_previa'); assert.equal(s.risco,'medio');
  assert.equal(s.origem,'cadastro'); assert.equal(s.criado_por_conta_id,s.conta);
  assert.equal(s.vinculo_origem,'cadastro'); assert.equal(s.vinculo_versao,1); assert.equal(s.atual,true);
  assert.equal(s.situacao,'ativo'); assert.equal(s.papel_vinculo,'titular');
}));
test('CMP-02: CHECK do sujeito falha após criação legada e reverte organização e conta', () => fixture(async ({db,user,call}) => {
  // Nome NFD é aceito pelo legado, mas recusado pelo CHECK NFC do sujeito.
  const name = 'Organizac\u0327a\u0303o Fictícia COMPAT';
  await db.query('savepoint failed_subject');
  await assert.rejects(call(name), {code:'23514'});
  await db.query('rollback to savepoint failed_subject');
  assert.equal((await db.query('select count(*)::int n from public.organizacoes where nome_publico=$1',[name])).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from public.contas_acesso where auth_user_id=$1',[user])).rows[0].n,0);
}));
test('CMP-03: retry preserva IDs, timestamps, nomes e vínculo sem duplicação', () => fixture(async ({call,state}) => {
  const org = await call(); const before = await state();
  assert.equal(await call('Outro nome fictício'),org); assert.deepEqual(await state(),before); assert.equal(before.length,1);
}));
test('CMP-04: duas organizações mantêm bijeção e vínculo da conta correta', () => fixture(async ({db,call,state}) => {
  const org = await call(); const other = randomUUID();
  await db.query('insert into auth.users(id) values($1)',[other]);
  const second = (await db.query("select public.criar_organizacao_com_sujeito($1,'Outra Organização Fictícia',null) id",[other])).rows[0].id;
  assert.notEqual(org,second); const s=(await state())[0]; assert.equal(s.org,org); assert.equal(s.sujeito_id,s.id); assert.equal(s.conta_id,s.conta);
  const wrong=await db.query('select v.id from public.vinculos_publicadores v join public.contas_acesso c on c.id=v.conta_id join public.sujeitos_publicadores s on s.id=v.sujeito_id where c.auth_user_id=any($1::uuid[]) and c.organizacao_id<>s.organizacao_legada_id',[[other,(await db.query('select auth_user_id from public.contas_acesso where id=$1',[s.conta])).rows[0].auth_user_id]]);
  assert.equal(wrong.rowCount,0);
}));
test('CMP-05: vínculo tem os cinco escopos completos', () => fixture(async ({call,state}) => {
  await call(); assert.deepEqual((await state())[0].escopos,scopes);
}));
test('CMP-06: RPC legada permanece utilizável sem criar sujeito', () => fixture(async ({db,call}) => {
  const org = await call(undefined,true); assert.ok(org);
  assert.equal((await db.query('select count(*)::int n from public.sujeitos_publicadores where organizacao_legada_id=$1',[org])).rows[0].n,0);
}));
test('CMP-11: rede de segurança preenche apenas fixture criada pela RPC legada', () => fixture(async ({db,call,state}) => {
  const org = await call(undefined,true); await backfillBatch(db,[org]);
  const before = await state(); assert.equal(before.length,1); assert.equal(before[0].origem,'legado');
  await backfillBatch(db,[org]); assert.deepEqual(await state(),before);
  assert.equal(await call(),org); assert.deepEqual(await state(),before);
}));
test('CMP-12: wrapper preserva conteúdo, snapshots, hashes, eventos, registros, evidências e apoios existentes', () => fixture(async ({db,call}) => {
  const u=randomUUID(); await db.query('insert into auth.users(id) values($1)',[u]);
  const org=(await db.query("select public.criar_organizacao_com_sujeito($1,'Organização Fictícia Preservação',null) id",[u])).rows[0].id;
  const conta=(await db.query('select id from public.contas_acesso where auth_user_id=$1',[u])).rows[0].id;
  const atividade=(await db.query("insert into public.atividades(organizacao_id,criada_por_conta_id,titulo,descricao,inicio_previsto,orientacao_acesso,versao_publicada,numero_versao_publicada,publicada_em,estado_editorial) values($1,$2,'Atividade Fictícia','Descrição fictícia',now(),'Acesso fictício',$3,1,now(),'publicada') returning id",[org,conta,JSON.stringify({tipo:'atividade-publica.v1',titulo:'Snapshot fictício imutável'})])).rows[0].id;
  const registro=(await db.query("insert into public.registros_realizacao(atividade_id,data_realizacao,descricao_factual,origem_informacao,versao_publicada,numero_versao_publicada,publicada_em) values($1,current_date,'Relato fictício','Fixture COMPAT',$2,1,now()) returning id",[atividade,JSON.stringify({tipo:'registro-publico.v1',descricao_factual:'Relato fictício'})])).rows[0].id;
  await db.query("insert into public.evidencias(registro_id,tipo_fonte,url_publica,afirmacao_sustentada,consultada_em) values($1,'fixture','https://example.invalid/evidencia','Afirmação fictícia',now())",[registro]);
  await db.query("insert into public.autorizacoes_publicacao(objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em) values('atividade',$1,array['publicar'],'titular','Comprovante fictício',now())",[atividade]);
  await db.query("insert into public.apoios(atividade_id,chave_anonima_hash) values($1,$2)",[atividade,'c'.repeat(64)]);
  await db.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,justificativa_restrita) values('atividade',$1,'fixture_compat','Evento fictício preservado')",[atividade]);
  const before = await fingerprint(db); await call(); const after = await fingerprint(db);
  for (const t of ['atividades','registros_realizacao','evidencias','autorizacoes_publicacao','apoios','parceiros','eventos_editoriais']) assert.deepEqual(after[t],before[t],t);
}));
test('CMP-02 vínculo: falha no INSERT final também reverte sujeito, conta e organização', () => fixture(async ({db,user,call}) => {
  await db.query(`create function pg_temp.cmp_fail_link() returns trigger language plpgsql as $$ begin raise exception 'Falha fictícia COMPAT' using errcode='23514'; end $$`);
  await db.query('create trigger cmp_fail_link before insert on public.vinculos_publicadores for each row execute function pg_temp.cmp_fail_link()');
  const before = await fingerprint(db); await db.query('savepoint failed_link');
  await assert.rejects(call(),{code:'23514'}); await db.query('rollback to savepoint failed_link');
  assert.deepEqual(await fingerprint(db),before);
  assert.equal((await db.query('select count(*)::int n from public.sujeitos_publicadores s join public.contas_acesso c on c.id=s.criado_por_conta_id where c.auth_user_id=$1',[user])).rows[0].n,0);
}));
test('CMP segurança: invoker, search_path fechado, somente service_role', () => fixture(async ({db,user}) => {
  const fn = (await db.query("select prosecdef,proconfig from pg_proc where oid=to_regprocedure('public.criar_organizacao_com_sujeito(uuid,text,text)')")).rows;
  assert.equal(fn.length,1); assert.equal(fn[0].prosecdef,false); assert.ok(fn[0].proconfig.includes('search_path=""'));
  for (const role of ['anon','authenticated']) {
    await db.query('savepoint denied'); await db.query(`set local role ${role}`);
    await assert.rejects(db.query("select public.criar_organizacao_com_sujeito($1,'Fictícia',null)",[user]),{code:'42501'});
    await db.query('rollback to savepoint denied');
  }
}));
