// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActivityHelpWorkspace } from '../../src/components/ActivityHelpWorkspace';
import type { CapabilityCategory } from '../../src/lib/capabilities/matching';

const activity = { id: 'activity-1', title: 'Oficina pública autorizada' };

describe('E4.1 — gestão privada de ajuda em atividade própria', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('cria uma solicitação privada por ação explícita e lista os interesses recebidos', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ message: 'Solicitação privada registrada.' }))
      .mockResolvedValueOnce(Response.json({ needs: [{ id: 'need-1', descricao: 'Apoio declarado', categorias: ['cultura'], condicoes: '', visibilidade: 'privada', estado: 'aberta', versao: 1 }] }))
      .mockResolvedValueOnce(Response.json({ interests: [{ id: 'interest-1', nome_publico: 'Pessoa participante fictícia', status: 'ativo' }] }));
    render(<ActivityHelpWorkspace activity={activity} activityPublicEligible initialNeeds={[]} initialInterests={[]} />);
    expect(screen.getByText(/solicitação começa privada/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Descrição da ajuda'), { target: { value: 'Apoio declarado para revisar o material.' } });
    fireEvent.click(screen.getByLabelText('Cultura'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar solicitação privada' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ action: 'create-activity-need', activityId: activity.id, description: 'Apoio declarado para revisar o material.', categories: ['cultura'] });
    expect(screen.getAllByText(/não cria colaboração, vínculo ou compromisso/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('expõe edição, visibilidade e encerramento usando a versão atual', async () => {
    const need = { id: 'need-1', atividade_id: activity.id, descricao: 'Preciso revisar material.', categorias: ['cultura'] as CapabilityCategory[], condicoes: '', visibilidade: 'privada' as const, estado: 'aberta' as const, versao: 3 };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ need: { ...need, visibilidade: 'visivel', versao: 4 } })).mockResolvedValueOnce(Response.json({ needs: [{ ...need, visibilidade: 'visivel', versao: 4 }] })).mockResolvedValueOnce(Response.json({ interests: [] }));
    render(<ActivityHelpWorkspace activity={activity} activityPublicEligible initialNeeds={[need]} initialInterests={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tornar solicitação pública' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ action: 'update-activity-need', id: need.id, expectedVersion: 3, visibility: 'visivel' });
    expect(screen.getByRole('status').textContent).toMatch(/Solicitação visível para descoberta pública/);
  });

  it('não transforma manifestação de interesse em convite institucional', () => {
    render(<ActivityHelpWorkspace activity={activity} activityPublicEligible initialNeeds={[]} initialInterests={[{ id: 'interest-1', nome_publico: 'Pessoa participante fictícia', tipo: 'pessoa_fisica', status: 'ativo' }]} />);
    expect(screen.getByText(/não cria colaboração, vínculo ou compromisso/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /convidar/i })).toBeNull();
  });
});
