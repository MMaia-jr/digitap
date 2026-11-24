import 'server-only';
import type { Sql } from '../database.server';
import type { DecisionRevision } from './decisions';

export async function currentDecisions(db: Sql, ideaId: string, version: number) {
  const result = await db.query<DecisionRevision>(`
    select distinct on (chave) chave,estado,descricao,versao_ideia,confirmada_em
    from public.ideia_decisoes_revisoes
    where ideia_id=$1 and versao_ideia<=$2
    order by chave,versao_ideia desc`, [ideaId, version]);
  return result.rows;
}
