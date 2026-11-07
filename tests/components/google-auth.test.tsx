// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthForm } from '../../src/components/AuthForm';

const { oauth, createClient } = vi.hoisted(() => ({ oauth: vi.fn(), createClient: vi.fn() }));
vi.mock('@supabase/ssr', () => ({ createBrowserClient: createClient }));
createClient.mockImplementation(() => ({ auth: { signInWithOAuth: oauth } }));
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED', 'true'); });
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllEnvs(); });

it('cliente declara PKCE e compartilha o nome do cookie com o callback servidor', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:56151');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
  oauth.mockResolvedValue({ error: null });
  render(<AuthForm mode="signin" />);
  fireEvent.click(screen.getByRole('button', { name: 'Continuar com Google' }));
  await waitFor(() => expect(createClient).toHaveBeenCalledWith(
    'http://127.0.0.1:56151', 'sb_publishable_fixture',
    expect.objectContaining({ auth: expect.objectContaining({ flowType: 'pkce', detectSessionInUrl: false }), cookieOptions: expect.objectContaining({ name: 'ap-auth', path: '/', sameSite: 'lax' }) }),
  ));
});

it.each(['signin', 'signup', 'signup_pf'] as const)('Google disponível em %s e clique inicia OAuth sem enviar formulário', async mode => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:56151');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
  oauth.mockResolvedValue({ error: null });
  render(<AuthForm mode={mode} />);
  const button = screen.getByRole('button', { name: 'Continuar com Google' });
  expect(button.getAttribute('type')).toBe('button');
  fireEvent.click(button);
  await waitFor(() => expect(oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: window.location.origin + '/auth/callback' } }));
});

it('falha OAuth é acessível e não expõe detalhes do provedor', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:56151');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
  oauth.mockResolvedValue({ error: new Error('detalhe privado') });
  render(<AuthForm mode="signin" />);
  fireEvent.click(screen.getByRole('button', { name: 'Continuar com Google' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível continuar com Google');
  expect(document.body.textContent).not.toContain('detalhe privado');
});

it('Google fica fora do fluxo visível enquanto a configuração está desativada', () => {
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED', 'false');
  render(<AuthForm mode="signin" />);
  expect(screen.queryByRole('button', { name: 'Continuar com Google' })).toBeNull();
});
