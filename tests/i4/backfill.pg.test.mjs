import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

// Import inside each test: missing executor is the initial implementation RED.
async function fixture(action) {
  const { backfillBatch } = await import('../../scripts/i4-backfill.mjs');
  const db = new pg.Client('postgresql://postgres:postgres@127.0.0.1:56152/postgres');
  await db.connect();
  try {
    await db.query('begin');
    const orgs = [], accounts = [];
    for (let i = 0; i < 3; i++) {
      const org = randomUUID(), user = randomUUID(), account = randomUUID();
      await db.query('insert into auth.users(id) values($1)', [user]);
      await db.query('insert into public.organizacoes(id,nome_publico,estado_validacao) values($1,$2,$3)', [org, 'Organização Fictícia BACKFILL '+i, ['validada','pendente','suspensa'][i]]);
      await db.query('insert into public.contas_acesso(id,auth_user_id,organizacao_id,situacao) values($1,$2,$3,$4)', [account,user,org,i === 1 ? 'bloqueada' : 'ativa']);
      await db.query("insert into public.atividades(organizacao_id,criada_por_conta_id,titulo,descricao,inicio_previsto,orientacao_acesso) values($1,$2,'Atividade Fictícia BACKFILL','Descrição exclusivamente fictícia',now(),'Acesso fictício')", [org,account]);
      orgs.push(org); accounts.push(account);
    }
    for (const role of ['editor','administrador']) {
      const user=randomUUID(); await db.query('insert into auth.users(id) values($1)',[user]);
      await db.query('insert into public.contas_acesso(auth_user_id,organizacao_id,papel) values($1,$2,$3)',[user,orgs[0],role]);
    }
    await action({ db, orgs, accounts, run: () => backfillBatch(db, orgs) });
  } finally { await db.query('rollback'); await db.end(); }
}

async function state(db, orgs) {
  const subjects=(await db.query('select * from public.sujeitos_publicadores where organizacao_legada_id=any($1::uuid[]) order by id',[orgs])).rows;
  const links=(await db.query('select v.* from public.vinculos_publicadores v join public.sujeitos_publicadores s on s.id=v.sujeito_id where s.organizacao_legada_id=any($1::uuid[]) order by v.id,v.versao',[orgs])).rows;
  const activities=(await db.query('select * from public.atividades where organizacao_id=any($1::uuid[]) order by id',[orgs])).rows;
  return { subjects,links,activities };
}

test('I4-P38 PG: execução dupla preserva IDs, contagens e timestamps', () => fixture(async ({db,orgs,run}) => {
  await run(); const before=await state(db,orgs); assert.equal(before.subjects.length,3); assert.equal(before.links.length,3);
  await run(); assert.deepEqual(await state(db,orgs),before);
}));
test('I4-P06 PG: zero órfãos e nenhuma organização trocada', () => fixture(async ({db,orgs,run}) => {
  await run(); const s=await state(db,orgs);
  for (const a of s.activities) { assert.ok(a.organizacao_id); assert.equal(a.politica_publicacao,'i3'); assert.equal(s.subjects.find(x=>x.id===a.sujeito_id)?.organizacao_legada_id,a.organizacao_id); }
}));
test('I4-P18 PG: revogação entre lotes/retry permanece revogada', () => fixture(async ({db,orgs,run}) => {
  await run(); const link=(await state(db,orgs)).links.find(v=>v.situacao==='ativo');
  await db.query("update public.vinculos_publicadores set situacao='revogado',revogada_em=clock_timestamp() where id=$1",[link.id]);
  const before=await state(db,orgs); await run(); assert.deepEqual(await state(db,orgs),before);
}));
test('I4-BF01 PG: bijeção e mapeamento conservador de todos os estados', () => fixture(async ({db,orgs,run}) => {
  await run(); const {subjects}=await state(db,orgs); assert.equal(subjects.length,orgs.length);
  for (let i=0;i<orgs.length;i++) {
    const matches=subjects.filter(s=>s.organizacao_legada_id===orgs[i]); assert.equal(matches.length,1);
    const s=matches[0]; assert.equal(s.estado,['ativo','pendente','suspenso'][i]); assert.equal(s.tipo,'organizacao'); assert.equal(s.modo_publicacao,'curadoria_previa'); assert.equal(s.risco,'medio'); assert.equal(s.origem,'legado'); assert.equal(s.versao,1); assert.equal(s.criado_por_conta_id,null);
  }
}));
test('I4-BF02 PG: editor/admin excluídos e conta bloqueada suspensa', () => fixture(async ({db,orgs,accounts,run}) => {
  await run(); const {links}=await state(db,orgs); assert.equal(links.length,3);
  assert.deepEqual(links.map(v=>v.conta_id).sort(),[...accounts].sort());
  for (const v of links) { assert.equal(v.situacao,v.conta_id===accounts[1]?'suspenso':'ativo'); assert.equal(v.papel_vinculo,'titular'); assert.deepEqual(v.escopos,['ler_privado','editar','enviar','publicar','gerir_vinculo']); assert.equal(v.origem,'legado'); assert.equal(v.versao,1); assert.equal(v.atual,true); }
}));
test('I4-BF03 PG: hashes de todas as colunas legadas preservados', () => fixture(async ({db,orgs,run}) => {
  const activity=(await db.query('select id from public.atividades where organizacao_id=$1',[orgs[0]])).rows[0].id;
  const snapshot={tipo:'atividade-publica.v1',id:activity,titulo:'Atividade Fictícia BACKFILL',organizacao:{id:orgs[0],nome_publico:'Organização Fictícia BACKFILL 0'}};
  await db.query("update public.atividades set versao_publicada=$2::jsonb,numero_versao_publicada=1,publicada_em=now(),estado_editorial='publicada' where id=$1",[activity,JSON.stringify(snapshot)]);
  const record=(await db.query("insert into public.registros_realizacao(atividade_id,data_realizacao,descricao_factual,origem_informacao,versao_publicada,numero_versao_publicada,publicada_em) values($1,current_date,'Relato exclusivamente fictício','Fixture local',$2::jsonb,1,now()) returning id",[activity,JSON.stringify({tipo:'registro-publico.v1',atividade_id:activity,descricao_factual:'Relato exclusivamente fictício'})])).rows[0].id;
  await db.query("insert into public.evidencias(registro_id,tipo_fonte,url_publica,afirmacao_sustentada,consultada_em) values($1,'fixture','https://example.invalid/evidencia','Afirmação fictícia',now())",[record]);
  await db.query("insert into public.autorizacoes_publicacao(objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em) values('atividade',$1,array['publicar'],'titular','Comprovante fictício',now())",[activity]);
  await db.query("insert into public.apoios(atividade_id,chave_anonima_hash) values($1,$2)",[activity,'a'.repeat(64)]);
  await db.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,justificativa_restrita) values('atividade',$1,'fixture_backfill',$2)",[activity,JSON.stringify({snapshot,snapshot_sha256:createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')})]);
  const digest=async()=> {
    const result={};
    for (const table of ['organizacoes','contas_acesso','atividades','registros_realizacao','evidencias','autorizacoes_publicacao','apoios','parceiros','eventos_editoriais']) {
      const rows=(await db.query(`select ${table==='atividades'?"to_jsonb(t)-'sujeito_id'-'politica_publicacao'":'to_jsonb(t)'} as row from public.${table} t order by id`)).rows;
      result[table]=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
    } return result;
  };
  const before=await digest(); await run(); assert.deepEqual(await digest(),before); assert.equal((await state(db,orgs)).activities.length,3);
}));

test('I4-BF04 PG: lote maior que 100 é recusado antes de DML', () => fixture(async ({db}) => {
  const {backfillBatch}=await import('../../scripts/i4-backfill.mjs');
  await assert.rejects(backfillBatch(db,Array.from({length:101},()=>randomUUID())),/1–100/);
}));
test('I4-BF05 PG: falha no lote reverte os inserts do lote', () => fixture(async ({db,orgs,run}) => {
  // Legacy allows outer spaces; EXPAND forbids them. Do not silently normalize.
  await db.query('update public.organizacoes set nome_publico=$2 where id=$1',[orgs[1],' Organização Fictícia inválida ']);
  await db.query('savepoint lote');
  await assert.rejects(run(),{code:'23514'});
  await db.query('rollback to savepoint lote');
  const s=await state(db,orgs); assert.equal(s.subjects.length,0); assert.equal(s.links.length,0); assert.ok(s.activities.every(a=>a.sujeito_id===null));
}));
