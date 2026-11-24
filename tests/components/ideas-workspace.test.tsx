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

it('oferece conversão explícita do rascunho próprio para o formulário de atividade', () => {
  render(<IdeasWorkspace initialIdeas={[saved]} />);
  const link = screen.getByRole('link', { name: 'Usar esta ideia para criar uma atividade' });
  expect(link.getAttribute('href')).toBe(`/dashboard/pessoa-fisica/nova?ideia=${saved.id}`);
  expect(screen.getByText(source)).toBeTruthy();
  expect(screen.getByText('Privada · não verificada · não publicada')).toBeTruthy();
});


it('permite corrigir o texto de uma ideia salva sem reaproveitar interpretações desatualizadas nem chamar a IA', async () => {
  const revisedText = 'Pessoa NÃO propõe mais oficina no projeto Raízes em Movimento.';
  const updated: IdeaView = { ...saved, revised_text: revisedText, revised_interpretation: null, version: 2 };
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ideia: updated }) });
  vi.stubGlobal('fetch', fetcher);
  render(<IdeasWorkspace initialIdeas={[saved]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retomar' }));
  expect(screen.getByRole('heading', { name: 'Prévia para revisão humana' })).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Sua proposta'), { target: { value: revisedText } });
  expect(screen.queryByRole('heading', { name: 'Prévia para revisão humana' })).toBeNull();
  expect(screen.getByText(/A interpretação anterior não vale para este texto revisado/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByText('Rascunho privado salvo. Ele não foi verificado nem publicado.');
  expect(fetcher).toHaveBeenCalledOnce();
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    action: 'update', id: saved.id, expectedVersion: 1,
    revisedText, revisedInterpretation: null,
  });
  expect(screen.getByRole('link', { name: 'Usar esta ideia para criar uma atividade' })).toBeTruthy();
});

it('não apresenta sugestões do texto original como atuais quando o texto revisado não tem interpretação', () => {
  const manuallyRevised: IdeaView = {
    ...saved,
    revised_text: 'Agora pretendo organizar uma feira, sem a oficina anterior.',
    revised_interpretation: null,
  };
  render(<IdeasWorkspace initialIdeas={[manuallyRevised]} />);
  expect(screen.getByText(/O texto revisado ainda não tem interpretação atualizada/)).toBeTruthy();
  expect(screen.queryByText('Oficina')).toBeNull();
  expect(screen.getByRole('link', { name: 'Usar esta ideia para criar uma atividade' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Retomar' }));
  expect(screen.queryByRole('heading', { name: 'Prévia para revisão humana' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Título do rascunho'), { target: { value: 'Novo título da revisão manual' } });
  expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeTruthy();
});

it('restaura somente as sugestões da versão revisada ao retomar a ideia', () => {
  const revised: IdeaView = {
    ...saved,
    revised_text: 'Quero organizar uma feira.',
    revised_interpretation: {
      ...interpretation,
      dados: {
        ...interpretation.dados,
        atividades: [{ descricao: 'Feira comunitária', trecho: 'feira' }],
      },
    },
    version: 2,
  };
  render(<IdeasWorkspace initialIdeas={[revised]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retomar' }));
  const description = screen.getByRole('textbox', { name: 'Descrição — Atividades propostas 1' }) as HTMLInputElement;
  fireEvent.change(description, { target: { value: 'Feira editada' } });
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar prévia original' }));
  expect(description.value).toBe('Feira comunitária');
});

it.each([503, 409])('mantém a revisão privada recuperável após falha de salvamento %s', async status => {
  const revisedText = 'Agora vou organizar uma feira comunitária.';
  const fetcher = vi.fn()
    .mockResolvedValueOnce({ ok: false, status })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ ideia: {
      ...saved, revised_text: revisedText, revised_interpretation: null, version: 2,
    } }) });
  vi.stubGlobal('fetch', fetcher);
  render(<IdeasWorkspace initialIdeas={[saved]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Retomar' }));
  const text = screen.getByRole('textbox', { name: 'Sua proposta' }) as HTMLTextAreaElement;
  fireEvent.change(text, { target: { value: revisedText } });
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

  save();
  await waitFor(() => {
    const message = status === 409 ? 'alterado em outra sessão' : 'Não foi possível salvar';
    expect(screen.getAllByRole('alert').some(alert => alert.textContent?.includes(message))).toBe(true);
  });
  expect(text.value).toBe(revisedText);
  expect(screen.queryByRole('status')).toBeNull();

  if (status === 503) {
    save();
    await screen.findByText(/Rascunho privado salvo/);
    expect(screen.queryByRole('heading', { name: 'Prévia para revisão humana' })).toBeNull();
  }
  expect(fetcher.mock.calls).toHaveLength(status === 503 ? 2 : 1);
  for (const [url, request] of fetcher.mock.calls) {
    expect(url).toBe('/api/ideias');
    expect(JSON.parse(request.body)).toMatchObject({
      action: 'update', id: saved.id, expectedVersion: 1, revisedText, revisedInterpretation: null,
    });
  }
});
