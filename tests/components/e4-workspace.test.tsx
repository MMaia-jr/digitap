// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CapabilitiesWorkspace, EncountersWorkspace } from '../../src/components/E4Workspaces';

const capability = { id: '10000000-0000-4000-8000-000000000001', subject_id: '20000000-0000-4000-8000-000000000001', description: 'Facilita oficinas', category: 'cultura', conditions: 'Combinado antes', visibility: 'privada', status: 'ativa', version: 1 } as const;
const match = { capability_id: capability.id, subject_id: capability.subject_id, subject_name: 'Pessoa declarada', description: capability.description, category: 'cultura', conditions: capability.conditions, need_id: '30000000-0000-4000-8000-000000000001', project_id: '40000000-0000-4000-8000-000000000001', project_title: 'Projeto comunitário', need_description: 'Apoio em oficinas', need_conditions: 'Horários combinados', reason: 'Categoria declarada em comum: cultura.', certainty: 'sugestao_nao_confirmada' } as const;

describe('E4Workspaces', () => {
  afterEach(() => cleanup());
  beforeEach(() => { vi.restoreAllMocks(); });

  it('oferece cadastro privado por padrão e permite publicar só por escolha explícita', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ capabilities: [capability] })).mockResolvedValueOnce(Response.json({ capability: { ...capability, visibility: 'publica', version: 2 } }));
    render(<CapabilitiesWorkspace subjects={[{ id: capability.subject_id, name: 'Pessoa declarada', type: 'pessoa_fisica' }]} initialCapabilities={[capability]} />);
    expect(screen.getByText(/privadas da sua conta/i)).toBeTruthy();
    expect(screen.getByLabelText('Descrição')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const publish = screen.getByRole('checkbox', { name: /autorizar apresentação pública/i });
    expect(publish).toHaveProperty('checked', false);
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Facilita oficinas' } });
    fireEvent.click(publish);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar capacidade' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ action: 'update-capability', expectedVersion: 1, visibility: 'publica' });
  });

  it('apresenta compatibilidade como sugestão e permite manifestar interesse explicitamente', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ message: 'Interesse registrado.' }))
      .mockResolvedValueOnce(Response.json({ interests: [{ id: 'interest-1', status: 'ativo', versao: 1, projeto_titulo: 'Projeto comunitário' }] }));
    render(<EncountersWorkspace subjects={[{ id: capability.subject_id, name: 'Pessoa declarada', type: 'pessoa_fisica' }]} matches={[match]} interests={[]} />);
    expect(screen.getByText('Categoria declarada em comum: cultura.')).toBeTruthy();
    expect(screen.getByText(/não confirma colaboração/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Manifestar interesse' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ action: 'manifest-interest', needId: match.need_id, subjectId: capability.subject_id });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Minhas manifestações' })).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain(`/api/e4?action=interests&subject_id=${capability.subject_id}`);
    expect(screen.getByText('Projeto comunitário · ativo')).toBeTruthy();
  });

  it('recarrega manifestações ao trocar o sujeito selecionado', async () => {
    const secondSubject = '20000000-0000-4000-8000-000000000002';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ interests: [] }));
    render(<EncountersWorkspace subjects={[
      { id: capability.subject_id, name: 'Pessoa A', type: 'pessoa_fisica' },
      { id: secondSubject, name: 'Pessoa B', type: 'pessoa_fisica' },
    ]} matches={[]} interests={[]} />);
    fireEvent.change(screen.getByLabelText('Manifestar como'), { target: { value: secondSubject } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toContain(`/api/e4?action=interests&subject_id=${secondSubject}`);
  });

  it('mostra ausência de compatibilidades sem fabricar itens', () => {
    render(<EncountersWorkspace subjects={[]} matches={[]} interests={[]} />);
    expect(screen.getByText(/nenhuma compatibilidade encontrada/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Manifestar interesse' })).toBeNull();
  });

  it('permite visitante consultar pedido de atividade sem capacidade pública nem sessão', () => {
    render(<EncountersWorkspace subjects={[]} matches={[]} interests={[]} activityNeeds={[{
      id: 'need-activity-1', atividade_id: 'activity-1', atividade_titulo: 'Oficina pública', publicador: 'Pessoa titular',
      descricao: 'Ajuda declarada na oficina.', categorias: ['cultura'], condicoes: 'A combinar', certainty: 'solicitacao_declarada_nao_verificada',
    }]} />);
    expect(screen.getByRole('article').textContent).toContain('Solicitação declarada, não verificada. Demonstrar interesse não cria vínculo, colaboração ou compromisso.');
    expect(screen.queryByRole('button', { name: 'Manifestar interesse' })).toBeNull();
  });
});
