// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActivityForm } from '../../src/components/ActivityForm';
import type { IdeaView } from '../../src/lib/ideas/service.server';

const oldDescription = 'Oficina da versão antiga';
const newDescription = 'Feira confirmada pela revisão humana';
const interpretation = {
  estado: 'revisao_humana_pendente' as const,
  verificacao: 'nao_verificada' as const,
  dados: {
    sujeitos: [], projetos: [], atividades: [{ descricao: oldDescription, trecho: 'oficina' }],
    capacidades: [], relacoes: [], fontes: [], informacoes_nao_verificadas: [],
  },
};
const idea: IdeaView = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Ideia atual',
  original_text: 'Quero organizar uma oficina.',
  revised_text: null,
  original_interpretation: interpretation,
  revised_interpretation: null,
  version: 1,
  created_at: '2026-11-24T00:00:00.000Z',
  updated_at: '2026-11-24T00:00:00.000Z',
};

const description = () => screen.getByRole('textbox', { name: 'Descrição' }) as HTMLTextAreaElement;
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('não pré-preenche a atividade com interpretação antiga após revisão manual sem IA', () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const revised = {
    ...idea,
    revised_text: 'A oficina foi cancelada. Agora quero organizar uma feira.',
    revised_interpretation: null,
    version: 2,
  };
  render(<ActivityForm sourceIdea={revised} returnTo="/dashboard/pessoa-fisica" />);
  expect(description().value).toBe('');
  expect(description().value).not.toContain(oldDescription);
  expect(screen.getByText(/texto revisado não possui interpretação atualizada/i)).toBeTruthy();
  expect(fetcher).not.toHaveBeenCalled();
});

it('utiliza a interpretação revisada quando ela existe', () => {
  const revised = {
    ...idea,
    revised_text: 'Quero organizar uma feira.',
    revised_interpretation: {
      ...interpretation,
      dados: { ...interpretation.dados, atividades: [{ descricao: newDescription, trecho: 'feira' }] },
    },
    version: 2,
  };
  render(<ActivityForm sourceIdea={revised} returnTo="/dashboard/pessoa-fisica" />);
  expect(description().value).toBe(newDescription);
  expect(description().value).not.toContain(oldDescription);
});

it('mantém a sugestão original quando a ideia ainda não foi revisada', () => {
  render(<ActivityForm sourceIdea={idea} returnTo="/dashboard/pessoa-fisica" />);
  expect(description().value).toBe(oldDescription);
});

it('permite criar rascunho privado com descrição manual sem invocar interpretação', async () => {
  const next = '/dashboard/atividade/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const navigate = vi.fn();
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ next }) });
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('crypto', { randomUUID: () => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' });
  const revised: IdeaView = { ...idea, revised_text: 'Agora quero realizar uma feira.', revised_interpretation: null, version: 2 };
  render(<ActivityForm sourceIdea={revised} returnTo="/dashboard/pessoa-fisica" onNavigate={navigate} />);
  expect(description().value).toBe('');
  fireEvent.change(description(), { target: { value: 'Feira comunitária — descrição confirmada por mim' } });
  fireEvent.change(screen.getByLabelText('Data e horário (America/Sao_Paulo)'), { target: { value: '2030-11-30T10:00' } });
  fireEvent.change(screen.getByLabelText('Orientação de acesso'), { target: { value: 'Acesso a combinar' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar rascunho privado a partir desta ideia' }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher.mock.calls[0][0]).toBe(`/api/ideias/${idea.id}/atividade`);
  const sent = JSON.parse(String(fetcher.mock.calls[0][1].body));
  expect(sent).toMatchObject({
    titulo: idea.title,
    descricao: 'Feira comunitária — descrição confirmada por mim',
    versao_esperada: 2,
  });
  expect(JSON.stringify(sent)).not.toContain(oldDescription);
  expect(fetcher.mock.calls.every(([url]) => !String(url).includes('interpretar'))).toBe(true);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard/pessoa-fisica'));
});
