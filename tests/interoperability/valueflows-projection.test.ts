import { describe, expect, it } from 'vitest';
import { projectPublicNeedAsValueFlows, type NeedProjectionContext } from '../../src/lib/interoperability/valueflows-projection';
import type { DeclaredNeed } from '../../src/lib/capabilities/matching';

const need = (overrides: Partial<DeclaredNeed> = {}): DeclaredNeed => ({
  id: '30000000-0000-4000-8000-000000000001',
  projectId: '40000000-0000-4000-8000-000000000001',
  projectTitle: 'Oficina pública',
  description: 'Preciso de apoio em uma oficina',
  categories: ['cultura'],
  conditions: 'Em horário combinado',
  visibility: 'visivel', status: 'aberta', ...overrides,
});
const ctx = (overrides: Partial<NeedProjectionContext> = {}): NeedProjectionContext => ({
  receiverSubjectId: '20000000-0000-4000-8000-000000000001',
  action: 'work', version: 3, updatedAt: '2026-11-22T10:00:00.000Z', ...overrides,
});

describe('interoperação E4 público → ValueFlows (sem persistência)', () => {
  it('projeta request/Intent, sem transformar necessidade em compromisso ou realização', () => {
    const r = projectPublicNeedAsValueFlows(need(), ctx());
    const [proposal, intent] = r.document['@graph'];
    expect(proposal['@type']).toBe('Proposal');
    expect(proposal.purpose).toBe('request');
    expect(intent['@type']).toBe('Intent');
    expect(intent.action).toBe('work');
    expect(intent.receiver).toEqual({ '@id': 'urn:uuid:20000000-0000-4000-8000-000000000001' });
    expect(proposal.publishes).toEqual({ '@id': intent['@id'] });
    expect(r.source.certainty).toBe('declarada_nao_verificada');
    expect(JSON.stringify(r)).not.toMatch(/Commitment|EconomicEvent|verified|score|rank/i);
  });

  it.each([
    need({ visibility: 'privada' }),
    need({ status: 'encerrada' }),
    need({ projectId: null, projectTitle: null }),
  ])('bloqueia necessidade privada, encerrada ou sem alvo', value => {
    expect(() => projectPublicNeedAsValueFlows(value, ctx())).toThrow(/não elegível/i);
  });

  it('requer ação econômica explícita e sujeito receptor confiável', () => {
    expect(() => projectPublicNeedAsValueFlows(need(), ctx({ action: undefined }))).toThrow(/ação explícita/i);
    expect(() => projectPublicNeedAsValueFlows(need(), ctx({ receiverSubjectId: '' }))).toThrow(/sujeito receptor/i);
  });

  it('não espalha campos privados do banco nem inventa quantidades, remuneração e datas', () => {
    const injected = { ...need(), privateNote: 'SEGREDO_123', phone: '21999999999' };
    const r = projectPublicNeedAsValueFlows(injected, ctx());
    expect(JSON.stringify(r)).not.toMatch(/SEGREDO_123|21999999999|resourceQuantity|effortQuantity|hasBeginning|hasEnd/);
  });

  it('gera saída determinística com versão, data, IRI do ValueFlows e UUID de origem', () => {
    const a = projectPublicNeedAsValueFlows(need(), ctx());
    expect(a).toEqual(projectPublicNeedAsValueFlows(need(), ctx()));
    expect(a.document['@context']['@vocab']).toBe('http://w3id.org/valueflows/ont/vf#');
    expect(a.document['@graph'][0]['@id']).toBe('urn:uuid:30000000-0000-4000-8000-000000000001');
    expect(() => projectPublicNeedAsValueFlows(need({ id: '../segredo' }), ctx())).toThrow(/identificador/i);
    expect(() => projectPublicNeedAsValueFlows(need(), ctx({ version: 0 }))).toThrow(/versão/i);
    expect(() => projectPublicNeedAsValueFlows(need(), ctx({ updatedAt: 'ontem' }))).toThrow(/data/i);
  });

  it('aceita necessidade vinculada a atividade pública sem inventar projeto', () => {
    const n = need({ targetType:'atividade', projectId:null, projectTitle:null,
      activityId:'50000000-0000-4000-8000-000000000001', activityTitle:'Mutirão cultural' });
    const r = projectPublicNeedAsValueFlows(n, ctx());
    expect(r.source.targetType).toBe('atividade');
    expect(r.source.targetId).toBe('50000000-0000-4000-8000-000000000001');
  });
});
