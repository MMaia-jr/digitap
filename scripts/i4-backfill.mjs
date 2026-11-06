import pg from 'pg';
import { createHash } from 'node:crypto';
import { mkdirSync, appendFileSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Operational DML only. Caller owns the transaction; never updates a link.
export async function backfillBatch(db, ids) {
  if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length) throw new Error('Lote deve conter 1–100 organizações distintas.');
  await db.query('select id from public.organizacoes where id=any($1::uuid[]) order by id for share',[ids]);
  await db.query('select id from public.contas_acesso where organizacao_id=any($1::uuid[]) order by id for share',[ids]);
  const subjects=await db.query(`insert into public.sujeitos_publicadores
    (tipo,organizacao_legada_id,nome_publico,estado,modo_publicacao,risco,origem,versao,criado_por_conta_id)
    select 'organizacao',o.id,o.nome_publico,
      case o.estado_validacao when 'validada' then 'ativo' when 'pendente' then 'pendente' when 'suspensa' then 'suspenso' end,
      'curadoria_previa','medio','legado',1,null
    from public.organizacoes o where o.id=any($1::uuid[])
      and not exists(select 1 from public.sujeitos_publicadores s where s.organizacao_legada_id=o.id)
    order by o.id on conflict do nothing returning id,organizacao_legada_id`,[ids]);
  const links=await db.query(`insert into public.vinculos_publicadores
    (sujeito_id,conta_id,papel_vinculo,escopos,situacao,origem,versao,atual,ativada_em,suspensa_em)
    select s.id,c.id,'titular',array['ler_privado','editar','enviar','publicar','gerir_vinculo'],
      case when c.situacao='ativa' then 'ativo' else 'suspenso' end,'legado',1,true,
      case when c.situacao='ativa' then now() end,case when c.situacao<>'ativa' then now() end
    from public.contas_acesso c join public.sujeitos_publicadores s on s.organizacao_legada_id=c.organizacao_id
    where c.organizacao_id=any($1::uuid[]) and c.papel='organizacao'
      and not exists(select 1 from public.vinculos_publicadores v where v.conta_id=c.id and v.sujeito_id=s.id)
    order by s.id,c.id on conflict do nothing returning id,conta_id,sujeito_id`,[ids]);
  const activities=await db.query(`update public.atividades a set sujeito_id=s.id,politica_publicacao='i3'
    from public.sujeitos_publicadores s where a.organizacao_id=s.organizacao_legada_id
      and a.organizacao_id=any($1::uuid[]) and a.sujeito_id is null returning a.id,a.organizacao_id,a.sujeito_id`,[ids]);
  return { subjects:subjects.rows,links:links.rows,activities:activities.rows };
}

export async function fingerprint(db) {
  const result={};
  for (const table of ['organizacoes','contas_acesso','atividades','registros_realizacao','evidencias','autorizacoes_publicacao','apoios','parceiros','eventos_editoriais']) {
    const rows=(await db.query(`select ${table==='atividades'?"to_jsonb(t)-'sujeito_id'-'politica_publicacao'":'to_jsonb(t)'} as row from public.${table} t order by id`)).rows;
    result[table]={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
  }
  return result;
}

export async function reconcile(db) {
  return (await db.query(`select
    (select count(*)::int from public.organizacoes) organizacoes,
    (select count(*)::int from public.sujeitos_publicadores where tipo='organizacao') sujeitos,
    (select count(*)::int from public.contas_acesso where papel='organizacao' and organizacao_id is not null) contas_organizacionais,
    (select count(*)::int from public.vinculos_publicadores where atual) vinculos,
    (select count(*)::int from public.vinculos_publicadores where atual and situacao='ativo') vinculos_ativos,
    (select count(*)::int from public.vinculos_publicadores where atual and situacao='suspenso') vinculos_suspensos,
    (select count(*)::int from public.atividades) atividades,
    (select count(*)::int from public.organizacoes o where not exists(select 1 from public.sujeitos_publicadores s where s.organizacao_legada_id=o.id)) sem_sujeito,
    (select count(*)::int from public.atividades a left join public.sujeitos_publicadores s on s.id=a.sujeito_id
      where a.organizacao_id is null or s.id is null or s.organizacao_legada_id is distinct from a.organizacao_id or a.politica_publicacao<>'i3') atividades_invalidas,
    (select count(*)::int from public.contas_acesso c join public.sujeitos_publicadores s on s.organizacao_legada_id=c.organizacao_id
      where c.papel='organizacao' and not exists(select 1 from public.vinculos_publicadores v where v.sujeito_id=s.id and v.conta_id=c.id)) contas_sem_vinculo`)).rows[0];
}

async function main() {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP!=='1') throw new Error('Execução requer autorização de fixtures locais.');
  const target=new URL(process.env.SUPABASE_DB_URL);
  if (target.hostname!=='127.0.0.1'||target.port!=='56152'||target.pathname!=='/postgres') throw new Error('Alvo fora do Postgres local autorizado.');
  const out='operations/evidence/incremento-i4-backfill'; mkdirSync(out,{recursive:true});
  const checkpoint=out+'/checkpoint.json';
  if (existsSync(checkpoint)&&JSON.parse(readFileSync(checkpoint,'utf8')).status==='failed') throw new Error('Lote anterior falhou: investigar antes de nova execução.');
  const run=new Date().toISOString().replaceAll(/[:.]/g,'-');
  const log=entry=>appendFileSync(out+'/batches.jsonl',JSON.stringify({run,...entry})+'\n');
  const db=new pg.Client({connectionString:target.href}); await db.connect();
  let locked=false, before, batch=0;
  try {
    locked=(await db.query('select pg_try_advisory_lock(450004,1) locked')).rows[0].locked;
    if (!locked) throw new Error('Outro executor BACKFILL ativo.');
    before=await fingerprint(db); writeFileSync(out+'/'+run+'-before.json',JSON.stringify(before,null,2)+'\n');
    // Re-scan from the beginning to catch legacy writers, including old org IDs.
    for (let pass=1;pass<=10;pass++) {
      let cursor=null;
      for (;;) {
        const ids=(await db.query('select id from public.organizacoes where ($1::uuid is null or id>$1) order by id limit 100',[cursor])).rows.map(r=>r.id);
        if (!ids.length) break;
        const started=performance.now(); batch++;
        try {
          await db.query('begin'); await db.query("set local lock_timeout='5s'"); await db.query("set local statement_timeout='30s'");
          const affected=await backfillBatch(db,ids);
          await db.query('commit');
          const entry={batch,pass,status:'committed',organization_ids:ids,affected,counts:Object.fromEntries(Object.entries(affected).map(([k,v])=>[k,v.length])),duration_ms:Math.round(performance.now()-started)};
          log(entry); writeFileSync(checkpoint,JSON.stringify({run,...entry},null,2)+'\n');
        } catch(error) {
          await db.query('rollback'); const entry={batch,pass,status:'failed',organization_ids:ids,duration_ms:Math.round(performance.now()-started),error_code:error.code??'APPLICATION',error:'Lote falhou; investigar localmente antes de repetir.'};
          log(entry); writeFileSync(checkpoint,JSON.stringify({run,...entry},null,2)+'\n'); throw error;
        }
        cursor=ids.at(-1);
      }
      const counts=await reconcile(db);
      if (!counts.sem_sujeito&&!counts.atividades_invalidas&&!counts.contas_sem_vinculo&&counts.organizacoes===counts.sujeitos) {
        const after=await fingerprint(db);
        if (JSON.stringify(after)!==JSON.stringify(before)) throw new Error('Fingerprint legado mudou durante a execução.');
        const report={run,status:'complete',batches:batch,counts,before,after,preserved:true};
        writeFileSync(out+'/'+run+'-result.json',JSON.stringify(report,null,2)+'\n'); writeFileSync(checkpoint,JSON.stringify({run,status:'complete',batches:batch},null,2)+'\n'); log({status:'complete',batches:batch,counts,preserved:true}); console.log(JSON.stringify(report)); return;
      }
      // Divergent non-null references cannot be repaired by this backfill.
      if (pass===10) throw new Error('Reconciliação incompleta ou escritor legado ativo.');
    }
  } finally { if(locked) await db.query('select pg_advisory_unlock(450004,1)'); await db.end(); }
}
if (process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(error=>{console.error('BACKFILL interrompido:',error.code??error.message);process.exitCode=1;});
