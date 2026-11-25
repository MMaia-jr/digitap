// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ActionLibrary } from '../../src/components/ActionLibrary';
import { actionTemplates } from '../../src/lib/actions/catalog';

describe('ActionLibrary', () => {
  it('informa em cada adaptação que a criação pelo modelo exige perfil de pessoa física', () => {
    render(<ActionLibrary templates={[actionTemplates[0]]} />);
    expect(screen.queryByRole('link', {
      name: `Adaptar ${actionTemplates[0].title}`,
      description: 'Para transformar um modelo em rascunho, entre com um perfil de pessoa física.',
    })).not.toBeNull();
  });
  afterEach(() => cleanup());

  it('identifica o conteúdo como modelo e oferece filtros acessíveis', () => {
    render(<ActionLibrary templates={actionTemplates} />);
    expect(screen.getByRole('heading', { name: 'Biblioteca de Ações' })).toBeTruthy();
    expect(screen.getByText(/modelos sugeridos; não são atividades reais/i)).toBeTruthy();
    expect(screen.getByLabelText('Interesse')).toBeTruthy();
    expect(screen.getByLabelText('Modalidade')).toBeTruthy();
    expect(screen.getByLabelText('Esforço indicativo')).toBeTruthy();
  });

  it('filtra por interesse, modalidade e faixa de esforço sem criar resultados', () => {
    render(<ActionLibrary templates={actionTemplates} />);
    fireEvent.change(screen.getByLabelText('Interesse'), { target: { value: 'comunicacao' } });
    fireEvent.change(screen.getByLabelText('Modalidade'), { target: { value: 'remota' } });
    fireEvent.change(screen.getByLabelText('Esforço indicativo'), { target: { value: 'leve' } });
    expect(screen.getByRole('heading', { name: 'Produzir boletim de informação comunitária' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Mutirão de cuidado de área comum' })).toBeNull();
  });

  it('mostra objetivo, etapas, resultado, cuidados e caminho para adaptar um modelo', () => {
    const model = actionTemplates[0];
    render(<ActionLibrary templates={actionTemplates} />);
    const card = screen.getByRole('article', { name: new RegExp(model.title) });
    expect(card.textContent).toContain(model.objective);
    expect(card.textContent).toContain(model.expectedOutcome);
    expect(card.textContent).toContain(model.stages[0]);
    expect(card.textContent).toContain(model.care[0]);
    expect(screen.getByRole('link', { name: `Adaptar ${model.title}` }).getAttribute('href')).toBe(`/dashboard/pessoa-fisica/nova?modelo=${model.id}`);
  });

  it('informa ausência de correspondências sem fabricar sugestões', () => {
    render(<ActionLibrary templates={[]} />);
    expect(screen.getByText(/nenhum modelo corresponde aos filtros/i)).toBeTruthy();
  });
});
