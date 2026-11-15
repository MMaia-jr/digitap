// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthForm } from '../../src/components/AuthForm';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('RED — formulário permite somente o destino público / retornado pelo servidor', async () => {
  const navigate = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'Acesso confirmado.', next: '/' }),
  }));
  render(<AuthForm mode="signin" onNavigate={navigate} />);
  fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);
  await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('/'));
});

it('mantém bloqueado um destino absoluto enviado indevidamente pelo servidor', async () => {
  const navigate = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ message: 'Acesso confirmado.', next: 'https://externo.invalid' }),
  }));
  render(<AuthForm mode="signin" onNavigate={navigate} />);
  fireEvent.submit(screen.getByRole('button', { name: 'Entrar' }).closest('form')!);
  await screen.findByRole('status');
  expect(navigate).not.toHaveBeenCalled();
});
