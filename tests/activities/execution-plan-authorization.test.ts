import { describe, expect, it, vi } from 'vitest';
import type { Sql, Transaction } from '../../src/lib/database.server';
import { createActivityService } from '../../src/lib/activities/service.server';

vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/database.server', () => ({ withTransaction: vi.fn() }));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: vi.fn() }));

const authId = '10000000-0000-4000-8000-000000000001';
const accountId = '20000000-0000-4000-8000-000000000001';
const activityId = '30000000-0000-4000-8000-000000000001';
const subjectId = '40000000-0000-4000-8000-000000000001';
const planId = '50000000-0000-4000-8000-000000000001';
const editorialSubjectId = '60000000-0000-4000-8000-000000000001';
const user = { id: authId, email_confirmed_at: '2026-11-16T12:00:00.000Z' };
const activity = {
  id: activityId,
  criado_por_sujeito_id: subjectId,
  projeto_aprovacao: null,
  projeto_versao_aprovada: null,
  projeto_parecer: null,
  projeto_id: null,
  titulo: 'Atividade privada sintética',
  descricao: 'Atividade fictícia para teste de autorização.',
  inicio_previsto: '2035-04-12T18:30:00.000Z',
  orientacao_acesso: 'Acesso fictício.',
  referencia_oficial: null,
  estado_editorial: 'rascunho',
  versao_submetida: 1,
  numero_versao_publicada: null,
  estado_programacao: 'programada',
};

function setup(papel: 'editor' | 'administrador') {
  const account = {
    id: accountId,
    auth_user_id: authId,
    organizacao_id: null,
    papel,
    situacao: 'ativa',
  };
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('from public.contas_acesso')) return { rows: [account] };
    if (sql.includes('from public.pessoas_fisicas')) return { rows: [{ id: editorialSubjectId }] };
    if (sql.includes('from public.atividades') && sql.includes('sujeito_id=$2')) return { rows: [] };
    if (sql.includes('from public.atividades')) return { rows: [activity] };
    if (sql.includes('from public.planos_execucao')) return {
      rows: [{
        id: planId,
        atividade_id: activityId,
        sujeito_id: subjectId,
        criado_por_conta_id: accountId,
        versao: 1,
        total_previsto_centavos: 1250,
      }],
    };
    if (sql.includes('from public.itens_planejamento_execucao')) return {
      rows: [{ categoria: 'material', descricao: 'Material previsto', quantidade: 1, unidade: 'unidade', valor_previsto_centavos: 1250 }],
    };
    throw new Error(`Consulta não prevista no teste: ${sql}`);
  });
  const transaction = vi.fn(async (operation: (sql: Sql) => Promise<unknown>) =>
    operation({ query } as unknown as Sql)) as unknown as Transaction;
  const service = createActivityService({
    verifyUser: async () => user,
    transaction,
  });
  return { service, query, transaction };
}

describe('ECO-01 — autorização financeira privada', () => {
  it.each(['editor', 'administrador'] as const)(
    '%s não lê plano econômico de terceiro mesmo tendo um sujeito PF próprio',
    async papel => {
      const { service, query } = setup(papel);

      await expect(service.getExecutionPlan(activityId)).rejects.toMatchObject({ status: 404 });
      expect(query.mock.calls.some(([sql]) => sql.includes('from public.planos_execucao'))).toBe(false);
    },
  );
});
