// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IdeasWorkspace } from '../../src/components/IdeasWorkspace';
import type { IdeaView } from '../../src/lib/ideas/service.server';

const source = 'Pessoa propõe oficina no projeto Raízes em Movimento.';
const interpretation = {
  estado: 'revisao_humana_pendente' as const,
  verificacao: 'nao_verificada' as const,
  dados: {
    sujeitos: [{ descricao: 'Pessoa', trecho: 'Pessoa', tipo: 'pessoa_fisica' as const }],
    projetos: [{ descricao: 'Raízes em Movimento', trecho: 'projeto Raízes em Movimento' }],
    atividades: [{ descricao: 'Oficina', trecho: 'oficina' }],
    capacidades: [], relacoes: [], fontes: [], informacoes_nao_verificadas: [],
  },
};
const saved: IdeaView = {
  id: '33333333-3333-4333-8333-333333333333', title: 'Minha proposta', original_text: source, revised_text: null,
  original_interpretation: interpretation, revised_interpretation: interpretation, version: 1,
  created_at: '2026-11-15T00:00:00Z', updated_at: '2026-11-15T00:00:00Z',
};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('salva somente após ação explícita e mostra o rascunho como privado e não publicado', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ interpretacao: interpretation }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ideia: saved }) });
  vi.stubGlobal('fetch', fetcher);
  render(<IdeasWorkspace initialIdeas={[]} />);
  fireEvent.change(screen.getByLabelText('Título do rascunho'), { target: { value: 'Minha proposta' } });
  fireEvent.change(screen.getByLabelText('Sua proposta'), { target: { value: source } });
  fireEvent.click(screen.getByRole('button', { name: 'Interpretar proposta' }));
  await screen.findByRole('heading', { name: 'Prévia para revisão humana' });
  expect(fetcher).toHaveBeenCalledOnce();
  fireEvent.change(screen.getByRole('textbox', { name: 'Descrição — Possíveis sujeitos 1' }), { target: { value: 'Pessoa revisada' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
  await screen.findByText('Rascunho privado salvo. Ele não foi verificado nem publicado.');
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({ action: 'create', title: 'Minha proposta', originalText: source, originalInterpretation: interpretation });
  expect(screen.getByText(/Privada · não verificada · não publicada/)).toBeTruthy();
});

it('retoma rascunho sem chamar a interpretação novamente e salva com versão otimista', async () => {
  const updated = { ...saved, title: 'Minha proposta editada', version: 2 };
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ideia: updated }) });
  vi.stubGlobal('fetch', fetcher);
  render(<IdeasWorkspace initialIdeas={[saved]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retomar' }));
  expect(screen.getByRole('heading', { name: 'Retomar: Minha proposta' })).toBeTruthy();
  expect(screen.getByLabelText('Sua proposta').getAttribute('maxlength')).toBe('20000');
  expect((screen.getByLabelText('Sua proposta') as HTMLTextAreaElement).value).toBe(source);
  expect(screen.getByRole('heading', { name: 'Prévia para revisão humana' })).toBeTruthy();
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Título do rascunho'), { target: { value: updated.title } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByText('Rascunho privado salvo. Ele não foi verificado nem publicado.');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ action: 'update', id: saved.id, expectedVersion: 1, title: updated.title, revisedText: source });
});

it('exclui somente após confirmação explícita e atualiza a lista privada', async () => {
  const confirm = vi.fn(() => true);
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Rascunho excluído.' }) });
  vi.stubGlobal('confirm', confirm); vi.stubGlobal('fetch', fetcher);
  render(<IdeasWorkspace initialIdeas={[saved]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
  await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
  await screen.findByText('Rascunho excluído.');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ action: 'delete', id: saved.id, confirmDelete: true });
  expect(screen.queryByText(saved.title)).toBeNull();
});
