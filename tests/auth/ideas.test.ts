import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/database.server', () => ({ withTransaction: (fn: (connection: { query: (...args: unknown[]) => unknown }) => unknown) => fn(db) }));
import { createIdeasService } from '../../src/lib/ideas/service.server';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const source = 'Grupo Raízes projeto Raízes em Movimento uma oficina cultural organiza oficinas colabora com A Praça na reunião de ontem talvez a prefeitura apoie';
const interpretation = {
  estado: 'revisao_humana_pendente' as const,
  verificacao: 'nao_verificada' as const,
  dados: {
    sujeitos: [{ descricao: 'Grupo Raízes', trecho: 'Grupo Raízes', tipo: 'coletivo_informal' as const }],
    projetos: [{ descricao: 'Raízes em Movimento', trecho: 'projeto Raízes em Movimento' }],
    atividades: [{ descricao: 'Oficina cultural', trecho: 'uma oficina cultural' }],
    capacidades: [{ descricao: 'Organização de oficinas', trecho: 'organiza oficinas' }],
    relacoes: [{ origem: 'Grupo Raízes', destino: 'A Praça', tipo: 'colaboração alegada', trecho: 'colabora com A Praça' }],
    fontes: [{ descricao: 'Relato da reunião', trecho: 'na reunião de ontem' }],
    informacoes_nao_verificadas: [{ descricao: 'Possível apoio municipal', trecho: 'talvez a prefeitura apoie' }],
  },
};
const row = {
  id: '33333333-3333-4333-8333-333333333333', owner_id: owner, title: 'Ideia', original_text: source,
  original_interpretation: interpretation, revised_interpretation: interpretation, version: 1,
  created_at: '2026-11-15', updated_at: '2026-11-15',
};
beforeEach(() => db.query.mockReset());

describe('rascunhos privados de ideias', () => {
  it('cria rascunho exclusivamente sob a identidade autenticada', async () => {
    db.query.mockResolvedValue({ rows: [row] });
    await expect(createIdeasService().create(owner, { title: 'Ideia', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation })).resolves.toEqual(row);
    expect(db.query.mock.calls[0][1][0]).toBe(owner);
    expect(db.query.mock.calls[0][0]).toMatch(/owner_id/);
  });
  it('ignora titularidade enviada com o conteúdo e valida a interpretação pelo contrato fechado', async () => {
    db.query.mockResolvedValue({ rows: [row] });
    const forgedOwner = { title: 'Ideia', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation, owner_id: other };
    await createIdeasService().create(owner, forgedOwner as never);
    expect(db.query.mock.calls[0][1][0]).toBe(owner);
    await expect(createIdeasService().create(owner, {
      title: 'Ideia', originalText: source, revisedInterpretation: interpretation,
      originalInterpretation: { ...interpretation, dados: { ...interpretation.dados, sujeitos: [{ descricao: 'x' }] } } as never,
    })).rejects.toMatchObject({ status: 422 });
  });
  it('lista e consulta somente rascunhos próprios', async () => {
    db.query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [row] });
    const service = createIdeasService();
    await expect(service.list(owner)).resolves.toEqual([row]);
    await expect(service.get(owner, row.id)).resolves.toEqual(row);
    expect(db.query.mock.calls.every(([, args]) => args[0] === owner)).toBe(true);
    expect(db.query.mock.calls.every(([sql]) => sql.includes('owner_id'))).toBe(true);
  });
  it('atualiza texto e interpretação revisada com versão esperada', async () => {
    db.query.mockResolvedValue({ rows: [{ ...row, version: 2 }] });
    await expect(createIdeasService().update(owner, row.id, { expectedVersion: 1, title: 'Nova', revisedText: source, revisedInterpretation: interpretation })).resolves.toMatchObject({ version: 2 });
  });
  it('retorna 409 para versão antiga somente enquanto o registro próprio existir', async () => {
    db.query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [row] });
    await expect(createIdeasService().update(owner, row.id, { expectedVersion: 1, title: 'x', revisedText: source, revisedInterpretation: interpretation })).rejects.toMatchObject({ status: 409 });
  });
  it('retorna 404 para registro inexistente ou de outra identidade', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const service = createIdeasService();
    await expect(service.get(other, row.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.update(other, row.id, { expectedVersion: 1, title: 'x', revisedText: source, revisedInterpretation: interpretation })).rejects.toMatchObject({ status: 404 });
    expect(db.query.mock.calls.every(([, args]) => args[0] === other)).toBe(true);
    expect(db.query.mock.calls.every(([sql]) => sql.includes('owner_id'))).toBe(true);
  });
  it('exclui somente rascunho próprio', async () => {
    db.query.mockResolvedValue({ rows: [row] });
    await expect(createIdeasService().delete(owner, row.id)).resolves.toBe(true);
    expect(db.query.mock.calls[0][1][0]).toBe(owner);
    expect(db.query.mock.calls[0][0]).toMatch(/owner_id/);
  });
  it('não cria entidades publicáveis nem vínculos', async () => {
    db.query.mockResolvedValue({ rows: [row] });
    await createIdeasService().create(owner, { title: 'Ideia', originalText: source, originalInterpretation: interpretation, revisedInterpretation: interpretation });
    expect(db.query.mock.calls[0][0]).toMatch(/insert into public\.ideias_privadas/);
    expect(db.query.mock.calls[0][0]).not.toMatch(/atividades|projetos|vinculos|sujeitos/);
  });
});
