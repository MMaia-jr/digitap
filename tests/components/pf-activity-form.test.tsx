// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActivityForm } from '../../src/components/ActivityForm';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('formulário PF salva rascunho pela API existente e volta ao dashboard', async () => {
  const navigate = vi.fn();
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ atividade: { id: '30000000-0000-4000-8000-000000000001' }, next: '/dashboard/atividade/30000000-0000-4000-8000-000000000001' }) });
  vi.stubGlobal('fetch', fetcher);
  render(<ActivityForm returnTo="/dashboard/pessoa-fisica" onNavigate={navigate} />);
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Oficina fictícia' } });
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Descrição da oficina fictícia.' } });
  fireEvent.change(screen.getByLabelText('Data e horário (America/Sao_Paulo)'), { target: { value: '2030-04-12T15:30' } });
  fireEvent.change(screen.getByLabelText('Orientação de acesso'), { target: { value: 'Entrada gratuita fictícia.' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Nova atividade' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard/pessoa-fisica'));
  expect(fetcher.mock.calls[0][0]).toBe('/api/atividades');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ titulo: 'Oficina fictícia', inicio_previsto: '2030-04-12T18:30:00.000Z' });
});
it('erro ao salvar mantém formulário e não anuncia rascunho criado', async () => {
  const navigate = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Acesso indisponível.' }) }));
  render(<ActivityForm returnTo="/dashboard/pessoa-fisica" onNavigate={navigate} />);
  fireEvent.change(screen.getByLabelText('Data e horário (America/Sao_Paulo)'), { target: { value: '2030-04-12T15:30' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Nova atividade' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Acesso indisponível');
  expect(navigate).not.toHaveBeenCalled();
});
