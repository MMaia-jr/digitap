import { describe, expect, it, vi } from 'vitest';
import { findCapabilityMatches, type DeclaredCapability, type DeclaredNeed } from '../../src/lib/capabilities/matching';
import { createE4Service } from '../../src/lib/capabilities/service.server';
import type { Sql, Transaction } from '../../src/lib/database.server';

const { byPublisher } = vi.hoisted(() => ({ byPublisher: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/queries/public.server', () => ({
  createPublicQueries: vi.fn(),
  publicActivities: { byPublisher },
}));

const capability = (overrides: Partial<DeclaredCapability> = {}) => ({
  id: '10000000-0000-4000-8000-000000000001',
  subjectId: '20000000-0000-4000-8000-000000000001',
  subjectName: 'História sintética Alfa',
  description: 'Capacidade sintética compartilhada',
  category: 'cultura' as const,
  conditions: 'Condições declaradas',
  visibility: 'publica',
  status: 'ativa',
  version: 4,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-21T10:00:00.000Z',
  ...overrides,
});

const need = (overrides: Partial<DeclaredNeed> & Record<string, unknown> = {}) => ({
  id: '30000000-0000-4000-8000-000000000001',
  projectId: '40000000-0000-4000-8000-000000000001',
  projectTitle: 'História sintética Beta',
  description: 'Necessidade declarada',
  categories: ['cultura'] as const,
  conditions: 'Condições declaradas',
  visibility: 'visivel',
  status: 'aberta',
  ownerSubjectId: '20000000-0000-4000-8000-000000000002',
  version: 7,
  createdAt: '2026-11-19T10:00:00.000Z',
  updatedAt: '2026-11-21T11:00:00.000Z',
  ...overrides,
}) as unknown as DeclaredNeed;

describe('contrato RED de recuperação contextual sobre E4', () => {
  it('preserva atribuições distintas quando duas histórias se relacionam', () => {
    const result = findCapabilityMatches([capability()], [need()]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      subjectId: capability().subjectId,
      needOwnerSubjectId: need().ownerSubjectId,
    });
  });

  it('preserva versões, estados e datas disponíveis nos registros E4', () => {
    const result = findCapabilityMatches([capability()], [need()]);

    expect(result[0]).toMatchObject({
      capabilityVersion: 4,
      needVersion: 7,
      capabilityStatus: 'ativa',
      needStatus: 'aberta',
      capabilityCreatedAt: '2026-11-20T10:00:00.000Z',
      capabilityUpdatedAt: '2026-11-21T10:00:00.000Z',
      needCreatedAt: '2026-11-19T10:00:00.000Z',
      needUpdatedAt: '2026-11-21T11:00:00.000Z',
    });
  });

  it('não mistura histórias independentes sem compatibilidade declarada', () => {
    expect(findCapabilityMatches(
      [capability()],
      [need({ categories: ['agroecologia'] })],
    )).toEqual([]);
  });

  it('não inclui conteúdo privado ou arquivado na composição pública E4', () => {
    expect(findCapabilityMatches(
      [capability({ visibility: 'privada' }), capability({ id: '10000000-0000-4000-8000-000000000002', status: 'arquivada' })],
      [need()],
    )).toEqual([]);
  });

  it('não apresenta necessidade encerrada como oportunidade aberta', () => {
    expect(findCapabilityMatches(
      [capability()],
      [need({ status: 'encerrada' })],
    )).toEqual([]);
  });

  it('não transforma a sugestão determinística em confirmação', () => {
    const result = findCapabilityMatches([capability()], [need()]);

    expect(result[0]?.certainty).toBe('sugestao_nao_confirmada');
    expect(result[0]).not.toHaveProperty('verified');
    expect(result[0]).not.toHaveProperty('score');
  });

  it('projeção do serviço E4 conserva titular derivado e metadados persistidos', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('from public.capacidades c')) {
        return { rows: [{
          id: capability().id, sujeito_id: capability().subjectId, nome_publico: capability().subjectName,
          tipo: 'organizacao', descricao: capability().description, categoria: 'cultura',
          condicoes: capability().conditions, visibilidade: 'publica', estado: 'ativa', versao: 4,
          criada_em: new Date(capability().createdAt!), atualizada_em: capability().updatedAt,
        }] };
      }
      if (statement.includes('from public.necessidades_projeto n')) {
        return { rows: [{
          id: need().id, projeto_id: need().projectId, titulo: need().projectTitle,
          nome_publico: 'História sintética Beta', sujeito_id: need().ownerSubjectId,
          descricao: need().description, categorias: ['cultura'], condicoes: need().conditions,
          visibilidade: 'visivel', estado: 'aberta', versao: 7,
          criada_em: need().createdAt, atualizada_em: need().updatedAt,
        }] };
      }
      throw new Error('Consulta inesperada no contrato de descoberta E4.');
    });
    const transaction = (async (operation: (client: Sql) => Promise<unknown>) =>
      operation({ query } as unknown as Sql)) as Transaction;
    byPublisher.mockReset().mockResolvedValue([{}]);

    const result = await createE4Service({ transaction }).discover();

    expect(result[0]).toMatchObject({
      subjectId: capability().subjectId,
      needOwnerSubjectId: need().ownerSubjectId,
      capabilityVersion: 4,
      needVersion: 7,
      capabilityCreatedAt: capability().createdAt,
      needUpdatedAt: need().updatedAt,
    });
    expect(query.mock.calls.every(([statement]) => /^\s*select\b/i.test(statement))).toBe(true);
  });
});
