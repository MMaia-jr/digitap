// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IdeasWorkspace } from '../../src/components/IdeasWorkspace';
import type { IdeaView } from '../../src/lib/ideas/service.server';

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: unknown }) => <a href={href} {...props}>{children as never}</a> }));

const subjectId = '22222222-2222-4222-8222-222222222222';
const ideaId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const proposal = 'Uma oficina gratuita de leitura para o bairro.';
const interpretation = {
  estado: 'revisao_humana_pendente' as const,
  verificacao: 'nao_verificada' as const,
  dados: {
    sujeitos: [], projetos: [], atividades: [{ descricao: 'Oficina de leitura proposta', trecho: 'oficina gratuita de leitura' }],
    capacidades: [], relacoes: [], fontes: [], informacoes_nao_verificadas: [],
  },
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('seleciona e consente contexto, revisa sugestão não verificada e só então salva ideia privada para atividade', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const idea: IdeaView = {
    id: ideaId, title: 'Oficina comunitária', original_text: proposal, revised_text: null,
    original_interpretation: interpretation, revised_interpretation: interpretation, version: 1,
    created_at: '2026-11-23T12:00:00.000Z', updated_at: '2026-11-23T12:00:00.000Z',
  };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url === '/api/e4?action=subjects') return { ok: true, json: async () => ({ subjects: [{ id: subjectId, name: 'Pessoa sintética Alfa', type: 'pessoa_fisica' }] }) };
    if (url === '/api/propostas/interpretar') return { ok: true, json: async () => ({ interpretacao: interpretation }) };
    if (url === '/api/ideias') return { ok: true, json: async () => ({ ideia: idea }) };
    throw new Error('Endpoint inesperado no teste G4-03.');
  }));

  render(<IdeasWorkspace initialIdeas={[]} />);
  fireEvent.change(screen.getByLabelText('Título do rascunho'), { target: { value: idea.title } });
  fireEvent.change(screen.getByLabelText('Sua proposta'), { target: { value: proposal } });
  fireEvent.click(screen.getByLabelText('Usar contexto autorizado'));
  await screen.findByRole('option', { name: /Pessoa sintética Alfa/ });
  fireEvent.change(screen.getByLabelText('Sujeito do contexto'), { target: { value: subjectId } });
  fireEvent.click(screen.getByLabelText('Autorizo o envio do contexto selecionado ao provedor de IA'));
  fireEvent.click(screen.getByRole('button', { name: 'Interpretar proposta' }));

  await screen.findByRole('heading', { name: 'Prévia para revisão humana' });
  expect(screen.getByText(/^Interpretação não verificada\./)).toBeTruthy();
  expect(screen.getByText(/não cria titularidade, representação institucional.*publicação/i)).toBeTruthy();
  expect(calls.filter(call => call.url === '/api/ideias')).toHaveLength(0);

  fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
  await screen.findByRole('status');
  expect(screen.getByRole('status').textContent).toContain('Rascunho privado salvo');
  expect(screen.getByText('Privada · não verificada · não publicada')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Usar esta ideia para criar uma atividade' }).getAttribute('href'))
    .toBe(`/dashboard/pessoa-fisica/nova?ideia=${ideaId}`);
  expect(screen.queryByRole('button', { name: /publicar/i })).toBeNull();

  const interpretationCall = calls.find(call => call.url === '/api/propostas/interpretar');
  expect(JSON.parse(String(interpretationCall?.init?.body))).toEqual({ texto: proposal, contexto: { subjectId, consentimento: true } });
  const saveCall = calls.find(call => call.url === '/api/ideias');
  expect(JSON.parse(String(saveCall?.init?.body))).toMatchObject({
    action: 'create', title: idea.title, originalText: proposal,
    originalInterpretation: { estado: 'revisao_humana_pendente', verificacao: 'nao_verificada' },
  });
});
