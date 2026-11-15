// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProposalInterpretation } from '../../src/lib/proposals/interpret.server';
import { ProposalForm } from '../../src/components/ProposalForm';

const descriptions = [
  ['Possíveis sujeitos', 'Pessoa fictícia'], ['Possíveis projetos', 'Projeto fictício'],
  ['Atividades propostas', 'Oficina'], ['Capacidades declaradas', 'Ensinar'],
  ['Fontes citadas', 'Relato'], ['Informações não verificadas', 'Data pendente'],
] as const;
const original: ProposalInterpretation = {
  estado: 'revisao_humana_pendente', verificacao: 'nao_verificada', dados: {
    sujeitos: [{ descricao: 'Pessoa fictícia', tipo: 'pessoa_fisica', trecho: 'Uma pessoa' }],
    projetos: [{ descricao: 'Projeto fictício', trecho: 'um projeto' }],
    atividades: [{ descricao: 'Oficina', trecho: 'uma oficina' }],
    capacidades: [{ descricao: 'Ensinar', trecho: 'pode ensinar' }],
    fontes: [{ descricao: 'Relato', trecho: 'relato próprio' }],
    informacoes_nao_verificadas: [{ descricao: 'Data pendente', trecho: 'data pendente' }],
    relacoes: [{ origem: 'Pessoa fictícia', destino: 'Projeto fictício', tipo: 'colaboração', trecho: 'quer colaborar' }],
  },
};
// Freeze the provider result so a mutable draft cannot silently corrupt restore.
function freeze(value: object) {
  Object.values(value).forEach(item => { if (item && typeof item === 'object') freeze(item); });
  Object.freeze(value);
}
freeze(original);
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function openReview() {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ interpretacao: original }) });
  vi.stubGlobal('fetch', fetcher);
  const view = render(<ProposalForm />);
  fireEvent.change(screen.getByLabelText('Sua proposta'), { target: { value: 'Uma pessoa propõe um projeto, uma oficina; pode ensinar, relato próprio, data pendente; quer colaborar.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Interpretar proposta' }));
  await screen.findByRole('heading', { name: 'Prévia para revisão humana' });
  return { fetcher, ...view };
}

it.each(descriptions)('E2.1 edita descrição em %s sem alterar trecho ou chamar servidor', async (label, initial) => {
  const { fetcher } = await openReview();
  const field = screen.getByRole('textbox', { name: `Descrição — ${label} 1` });
  expect((field as HTMLInputElement).value).toBe(initial);
  fireEvent.change(field, { target: { value: 'Correção humana' } });
  expect((field as HTMLInputElement).value).toBe('Correção humana');
  const section = screen.getByRole('region', { name: 'Prévia da proposta' });
  expect(section.querySelectorAll('blockquote')).toHaveLength(7);
  expect([...section.querySelectorAll('blockquote')].map(x => x.textContent)).toEqual([
    'Uma pessoa', 'um projeto', 'uma oficina', 'pode ensinar', 'relato próprio', 'data pendente', 'quer colaborar',
  ]);
  expect(within(section).queryByRole('textbox', { name: /trecho/i })).toBeNull();
  expect(fetcher).toHaveBeenCalledOnce();
});

it('E2.1 oferece somente os quatro tipos do contrato, sem criar autoridade', async () => {
  await openReview();
  const select = screen.getByRole('combobox', { name: 'Tipo de sujeito — Possíveis sujeitos 1' });
  expect(within(select).getAllByRole('option').map(x => (x as HTMLOptionElement).value)).toEqual([
    'pessoa_fisica', 'coletivo_informal', 'organizacao', 'nao_informado',
  ]);
  for (const value of ['coletivo_informal', 'organizacao', 'nao_informado', 'pessoa_fisica']) {
    fireEvent.change(select, { target: { value } }); expect((select as HTMLSelectElement).value).toBe(value);
  }
  expect(screen.getByText(/^Interpretação não verificada\./)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /salvar|publicar|certificar|criar vínculo/i })).toBeNull();
});

it('E2.1 edita origem, destino e tipo da relação somente na prévia', async () => {
  const { fetcher } = await openReview();
  for (const name of ['Origem', 'Destino', 'Tipo']) {
    const field = screen.getByRole('textbox', { name: `${name} — Relações alegadas 1` });
    fireEvent.change(field, { target: { value: `${name} corrigido` } });
    expect((field as HTMLInputElement).value).toBe(`${name} corrigido`);
  }
  expect(screen.getByText('quer colaborar')).toBeTruthy();
  expect(original.dados.relacoes[0]).toEqual({ origem: 'Pessoa fictícia', destino: 'Projeto fictício', tipo: 'colaboração', trecho: 'quer colaborar' });
  expect(fetcher).toHaveBeenCalledOnce();
});

it.each([...descriptions.map(([label]) => label), 'Relações alegadas'])('E2.1 descarta individualmente %s e restaura a resposta original', async label => {
  const { fetcher } = await openReview();
  fireEvent.change(screen.getByRole('textbox', { name: 'Descrição — Atividades propostas 1' }), { target: { value: 'Oficina corrigida' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'organizacao' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Origem — Relações alegadas 1' }), { target: { value: 'Outra origem' } });
  fireEvent.click(screen.getByRole('button', { name: `Descartar ${label} 1` }));
  expect(screen.queryByRole('button', { name: `Descartar ${label} 1` })).toBeNull();
  expect(screen.getAllByRole('button', { name: /^Descartar / })).toHaveLength(6);
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar prévia original' }));
  expect(screen.getAllByRole('button', { name: /^Descartar / })).toHaveLength(7);
  expect((screen.getByRole('textbox', { name: 'Descrição — Atividades propostas 1' }) as HTMLInputElement).value).toBe('Oficina');
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('pessoa_fisica');
  expect((screen.getByRole('textbox', { name: 'Origem — Relações alegadas 1' }) as HTMLInputElement).value).toBe('Pessoa fictícia');
  expect(fetcher).toHaveBeenCalledOnce();
});

it('E2.1 limita todos os campos editáveis a 1.000 caracteres inclusive entrada programática', async () => {
  await openReview();
  const review = screen.getByRole('region', { name: 'Prévia da proposta' });
  for (const field of within(review).getAllByRole('textbox')) {
    expect(field.getAttribute('maxlength')).toBe('1000');
    fireEvent.change(field, { target: { value: 'x'.repeat(1000) } });
    expect((field as HTMLInputElement).value).toHaveLength(1000);
    fireEvent.change(field, { target: { value: 'x'.repeat(1001) } });
    expect((field as HTMLInputElement).value).toHaveLength(1000);
  }
  const field = within(review).getByRole('textbox', { name: 'Descrição — Possíveis sujeitos 1' });
  fireEvent.change(field, { target: { value: '' } });
  expect(field.getAttribute('aria-invalid')).toBe('true');
});

it('E2.1 mantém rótulos acessíveis, navegação por teclado e foco após descarte', async () => {
  const user = userEvent.setup(); await openReview();
  const field = screen.getByRole('textbox', { name: 'Descrição — Possíveis sujeitos 1' });
  field.focus(); await user.clear(field); await user.type(field, 'Nome corrigido');
  expect((field as HTMLInputElement).value).toBe('Nome corrigido');
  await user.tab(); expect(document.activeElement).toBe(screen.getByRole('combobox'));
  const discard = screen.getByRole('button', { name: 'Descartar Possíveis sujeitos 1' });
  discard.focus(); await user.keyboard('{Enter}');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Restaurar prévia original' }));
});

it('E2.1 não persiste correções nem descarte ao remontar e não realiza novas requisições', async () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const { fetcher, unmount } = await openReview();
  expect(screen.getByText(/correções são temporárias e desaparecerão ao sair da página/i)).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox', { name: 'Descrição — Possíveis sujeitos 1' }), { target: { value: 'Nome temporário' } });
  fireEvent.click(screen.getByRole('button', { name: 'Descartar Relações alegadas 1' }));
  unmount(); render(<ProposalForm />);
  expect(screen.queryByRole('region', { name: 'Prévia da proposta' })).toBeNull();
  expect((screen.getByLabelText('Sua proposta') as HTMLTextAreaElement).value).toBe('');
  expect(storage).not.toHaveBeenCalled(); expect(fetcher).toHaveBeenCalledOnce();
});

it('E2.1 mudar o texto elimina a revisão e impede restaurar uma prévia de outra proposta', async () => {
  await openReview();
  fireEvent.change(screen.getByRole('textbox', { name: 'Descrição — Possíveis sujeitos 1' }), { target: { value: 'Correção' } });
  fireEvent.change(screen.getByLabelText('Sua proposta'), { target: { value: 'Outra proposta' } });
  expect(screen.queryByRole('region', { name: 'Prévia da proposta' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Restaurar prévia original' })).toBeNull();
});

it('E2.1 correções maliciosas continuam texto sem execução de HTML', async () => {
  await openReview();
  const attack = '<img src=x onerror=alert(1)>';
  fireEvent.change(screen.getByRole('textbox', { name: 'Descrição — Atividades propostas 1' }), { target: { value: attack } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Origem — Relações alegadas 1' }), { target: { value: attack } });
  expect(screen.getByText(attack)).toBeTruthy();
  expect(document.querySelector('img[src="x"]')).toBeNull();
});
