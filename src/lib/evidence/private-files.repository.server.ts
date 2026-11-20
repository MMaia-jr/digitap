import 'server-only';
import { withTransaction, type Transaction } from '../database.server';
import type { createPrivateFileService } from './private-files.server';

type Dependencies = Parameters<typeof createPrivateFileService>[0];
type PrivateFile = Awaited<ReturnType<Dependencies['repository']['insertPending']>>;

const fileColumns = 'id, registro_id as "registroId", object_key as "objectKey", content_type as "contentType", size_bytes as "sizeBytes", estado';
const organizationAccess = `
  from public.contas_acesso as c
  join public.organizacoes as o on o.id = c.organizacao_id
  join public.atividades as a on a.organizacao_id = o.id
  join public.registros_realizacao as r on r.atividade_id = a.id
  where c.auth_user_id = $1
    and c.papel = 'organizacao'
    and c.situacao = 'ativa'
    and o.estado_validacao <> 'suspensa'
    and r.id = $2
`;

class ConfirmationError extends Error {
  constructor(readonly status: 403 | 404 | 409, message: string) {
    super(message);
  }
}

export function createPrivateFileRepository(
  {transaction = withTransaction}: {transaction?: Transaction} = {},
): Pick<Dependencies, 'authorize' | 'repository'> {
  return {
    authorize: ({actorId, registroId}) => transaction(async sql => {
      const result = await sql.query(`select r.id ${organizationAccess}`, [actorId, registroId]);
      return result.rowCount === 1;
    }),
    repository: {
      insertPending: ({registroId, objectKey, contentType, sizeBytes}) => transaction(async sql => {
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
      markConfirmed: ({actorId, arquivoId, registroId}) => transaction(async sql => {
        const authorized = await sql.query(`
          select r.id ${organizationAccess}
            and exists (
              select 1 from public.evidencias_arquivos_privados as f
              where f.registro_id = r.id and f.id = $3
            )
          for share of c, o, a, r
        `, [actorId, registroId, arquivoId]);
        if (!authorized.rowCount) {
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
