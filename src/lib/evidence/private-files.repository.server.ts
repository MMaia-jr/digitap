import 'server-only';
import { withTransaction, type Sql, type Transaction } from '../database.server';
import type { createPrivateFileService } from './private-files.server';

type Dependencies = Parameters<typeof createPrivateFileService>[0];
type PrivateFile = Awaited<ReturnType<Dependencies['repository']['insertPending']>>;

const fileColumns = 'id, registro_id as "registroId", object_key as "objectKey", content_type as "contentType", size_bytes as "sizeBytes", estado';
type Scope = 'upload' | 'read';

async function authorizedRecord(sql: Sql,
  actorId: string, registroId: string, scope: Scope, arquivoId?: string) {
  const target = await sql.query<{tipo: string}>(`
    select s.tipo from public.registros_realizacao r
    join public.atividades a on a.id = r.atividade_id
    join public.sujeitos_publicadores s on s.id = a.sujeito_id
    where r.id = $1
  `, [registroId]);
  const tipo = target.rows[0]?.tipo;
  if (!tipo || !['organizacao', 'pessoa_fisica', 'coletivo_informal'].includes(tipo)) return false;

  const scopePredicate = scope === 'upload' ? "'editar' = any(v.escopos)" : "'ler_privado' = any(v.escopos)";
  const filePredicate = arquivoId === undefined ? '' : `and exists (
    select 1 from public.evidencias_arquivos_privados f where f.id = $3 and f.registro_id = r.id
  )`;
  const params = arquivoId === undefined ? [actorId, registroId] : [actorId, registroId, arquivoId];
  const subjectWhere = `and r.id = $2 and c.auth_user_id = $1 and c.situacao = 'ativa'
    and s.estado in ('pendente','ativo') and v.atual and v.situacao = 'ativo'
    and ${scopePredicate} ${filePredicate}`;

  let query: string;
  if (tipo === 'organizacao') {
    query = `select r.id from public.contas_acesso c
      join public.organizacoes o on o.id = c.organizacao_id
      join public.atividades a on a.organizacao_id = o.id
      join public.registros_realizacao r on r.atividade_id = a.id
      join public.sujeitos_publicadores s on s.id = a.sujeito_id
      join public.vinculos_publicadores v on v.sujeito_id = s.id and v.conta_id = c.id
      where c.papel = 'organizacao' and s.tipo = 'organizacao'
        and s.organizacao_legada_id = o.id and o.estado_validacao <> 'suspensa'
        and v.papel_vinculo in ('titular','representante') ${subjectWhere}
      for share of c, o, a, r, s, v`;
  } else if (tipo === 'pessoa_fisica') {
    query = `select r.id from public.contas_acesso c
      join public.atividades a on a.criada_por_conta_id = c.id
      join public.registros_realizacao r on r.atividade_id = a.id
      join public.sujeitos_publicadores s on s.id = a.sujeito_id
      join public.pessoas_fisicas p on p.sujeito_id = s.id and p.conta_id = c.id
      join public.vinculos_publicadores v on v.sujeito_id = s.id and v.conta_id = c.id
      where c.papel = 'publicador' and c.organizacao_id is null and s.tipo = 'pessoa_fisica'
        and s.criado_por_conta_id = c.id and v.papel_vinculo = 'titular'
        and ${scope === 'upload' ? "s.risco <> 'alto'" : 'true'} ${subjectWhere}
      for share of c, a, r, s, p, v`;
  } else {
    query = `select r.id from public.contas_acesso c
      join public.atividades a on a.criada_por_conta_id = c.id
      join public.registros_realizacao r on r.atividade_id = a.id
      join public.sujeitos_publicadores s on s.id = a.sujeito_id
      join public.coletivos_informais co on co.sujeito_id = s.id
      join public.vinculos_publicadores v on v.sujeito_id = s.id and v.conta_id = c.id
      where c.papel = 'publicador' and c.organizacao_id is null and s.tipo = 'coletivo_informal'
        and v.papel_vinculo = 'titular' ${subjectWhere}
      for share of c, a, r, s, co, v`;
  }
  // Keep every user-supplied value parameterized; scope selection above is a closed union.
  const result = await sql.query(query, params);
  return result.rowCount === 1;
}

class ConfirmationError extends Error {
  constructor(readonly status: 403 | 404 | 409, message: string) {
    super(message);
  }
}

export function createPrivateFileRepository(
  {transaction = withTransaction}: {transaction?: Transaction} = {},
): Pick<Dependencies, 'authorize' | 'repository'> {
  return {
    authorize: ({actorId, registroId, scope}) => transaction(async sql => {
      return authorizedRecord(sql, actorId, registroId, scope);
    }),
    repository: {
      insertPending: ({registroId, objectKey, contentType, sizeBytes}, actorId) => transaction(async sql => {
        if (!await authorizedRecord(sql, actorId, registroId, 'upload')) {
          throw new ConfirmationError(403, 'Você não tem autorização para este registro.');
        }
        const result = await sql.query<PrivateFile>(`
          insert into public.evidencias_arquivos_privados (registro_id, object_key, content_type, size_bytes)
          values ($1, $2, $3, $4)
          returning ${fileColumns}
        `, [registroId, objectKey, contentType, sizeBytes]);
        return result.rows[0];
      }),
      deletePending: id => transaction(async sql => {
        await sql.query("delete from public.evidencias_arquivos_privados where id = $1 and estado = 'pendente'", [id]);
      }),
      find: id => transaction(async sql => {
        const result = await sql.query<PrivateFile>(`
          select ${fileColumns} from public.evidencias_arquivos_privados where id = $1
        `, [id]);
        return result.rows[0] ?? null;
      }),
      listConfirmed: ({actorId, registroId}) => transaction(async sql => {
        if (!await authorizedRecord(sql, actorId, registroId, 'read')) {
          throw new ConfirmationError(403, 'Você não tem autorização para este registro.');
        }
        const result = await sql.query<{id: string; contentType: string; sizeBytes: number}>(`
          select id, content_type as "contentType", size_bytes as "sizeBytes"
          from public.evidencias_arquivos_privados
          where registro_id = $1 and estado = 'confirmado'
          order by id
        `, [registroId]);
        return result.rows;
      }),
      markConfirmed: ({actorId, arquivoId, registroId}) => transaction(async sql => {
        if (!await authorizedRecord(sql, actorId, registroId, 'upload', arquivoId)) {
          throw new ConfirmationError(403, 'Você não tem autorização para este registro.');
        }

        const updated = await sql.query<PrivateFile>(`
          update public.evidencias_arquivos_privados
          set estado = 'confirmado'
          where id = $1 and registro_id = $2 and estado = 'pendente'
          returning ${fileColumns}
        `, [arquivoId, registroId]);
        if (updated.rows[0]) return updated.rows[0];

        const current = await sql.query(
          'select id from public.evidencias_arquivos_privados where id = $1 and registro_id = $2',
          [arquivoId, registroId],
        );
        if (!current.rowCount) throw new ConfirmationError(404, 'Arquivo não encontrado.');
        throw new ConfirmationError(409, 'Arquivo não está pendente.');
      }),
    },
  };
}
