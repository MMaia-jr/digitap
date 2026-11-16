import { describe, expect, it } from 'vitest';
import { findCapabilityMatches, type DeclaredCapability, type DeclaredNeed } from '../../src/lib/capabilities/matching';

const capability = (overrides: Partial<DeclaredCapability> = {}):DeclaredCapability => ({
  id: '10000000-0000-4000-8000-000000000001', subjectId: '20000000-0000-4000-8000-000000000001',
  subjectName: 'Pessoa declarada', description: 'Facilita oficinas', category: 'cultura', conditions: 'Combinado antes',
  visibility: 'publica', status: 'ativa', ...overrides,
});
const need = (overrides: Partial<DeclaredNeed> = {}):DeclaredNeed => ({
  id: '30000000-0000-4000-8000-000000000001', projectId: '40000000-0000-4000-8000-000000000001',
  projectTitle: 'Projeto comunitário', description: 'Apoio em oficinas', categories: ['cultura'], conditions: 'Horários combinados',
  visibility: 'visivel', status: 'aberta', ...overrides,
});

describe('compatibilidade E4 determinística', () => {
  it('explica correspondência por categoria declarada, sem pontuação ou ranking', () => {
    const result = findCapabilityMatches([capability()], [need()]);
    expect(result).toEqual([expect.objectContaining({
      capabilityId: capability().id, needId: need().id,
      reason: 'Categoria declarada em comum: cultura.',
      certainty: 'sugestao_nao_confirmada',
    })]);
    expect(result[0]).not.toHaveProperty('score');
    expect(result[0]).not.toHaveProperty('rank');
  });

  it('não fabrica resultado quando não há categoria em comum', () => {
    expect(findCapabilityMatches([capability()], [need({ categories: ['agroecologia'] })])).toEqual([]);
  });

  it('ignora declarações privadas, arquivadas ou necessidades encerradas/privadas', () => {
    expect(findCapabilityMatches([
      capability({ visibility: 'privada' }), capability({ id: '10000000-0000-4000-8000-000000000002', status: 'arquivada' }),
    ], [need(), need({ id: '30000000-0000-4000-8000-000000000002', visibility: 'privada' }), need({ id: '30000000-0000-4000-8000-000000000003', status: 'encerrada' })])).toEqual([]);
  });

  it('ordena resultados de forma estável e expõe apenas campos explicitamente públicos', () => {
    const source = { ...capability({ conditions: 'Sem disponibilidade definida' }), privateNote: 'segredo' };
    const result = findCapabilityMatches([source], [need()]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ reason: expect.any(String), certainty: 'sugestao_nao_confirmada' }));
    expect(JSON.stringify(result)).not.toContain('segredo');
    expect(JSON.stringify(result)).not.toMatch(/email|telefone|localizacao|disponibilidade_inferida/i);
  });

  it('associa compatibilidade a atividade PF pública sem projeto institucional', () => {
    const activityNeed = need({
      id: '30000000-0000-4000-8000-000000000003',
      targetType: 'atividade',
      projectId: null,
      projectTitle: null,
      activityId: '50000000-0000-4000-8000-000000000001',
      activityTitle: 'Oficina pública autorizada',
    } as Partial<DeclaredNeed>);
    const result = findCapabilityMatches([capability()], [activityNeed]);
    expect(result).toEqual([expect.objectContaining({
      needId: activityNeed.id,
      targetType: 'atividade',
      activityId: activityNeed.activityId,
      activityTitle: activityNeed.activityTitle,
      certainty: 'sugestao_nao_confirmada',
    })]);
    expect(result[0]).not.toHaveProperty('projectId');
    expect(result[0]).not.toHaveProperty('score');
  });
});
