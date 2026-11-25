import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type Write = { name: string; value: string; options?: Record<string, unknown> };
type ServerOptions = {
  cookieOptions: Record<string, unknown>;
  cookies: { getAll: () => unknown; setAll: (values: Write[], headers: Record<string, string>) => void };
};
const mocks = vi.hoisted(() => ({
  set: vi.fn(), getAll: vi.fn(), server: vi.fn(), browser: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mocks.set, getAll: mocks.getAll }) }));
vi.mock('../../src/lib/supabase/config.server', () => ({ localConfig: () => ({ url: 'https://fixture.supabase.co', key: 'fixture-publishable-key' }) }));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.server, createBrowserClient: mocks.browser }));

beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks();
  mocks.getAll.mockReturnValue([{ name: 'ap-auth.0', value: 'fixture' }, { name: 'ap-auth-code-verifier', value: 'fixture' }, { name: 'other', value: 'keep' }]);
  mocks.server.mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } });
});
afterEach(() => vi.unstubAllEnvs());

for (const mode of ['development', 'production'] as const) {
  describe(`cookies Secure — ${mode}`, () => {
    const secure = mode === 'production';
    beforeEach(() => vi.stubEnv('NODE_ENV', mode));
    it('SSR configura Secure por ambiente e impede downgrade nas escritas', async () => {
      const { userClient } = await import('../../src/lib/supabase/server');
      await userClient();
      const options = mocks.server.mock.calls[0][2] as ServerOptions;
      expect(options.cookieOptions).toMatchObject({ name: 'ap-auth', httpOnly: true, sameSite: 'lax', path: '/', secure });
      options.cookies.setAll([{ name: 'ap-auth.0', value: 'fixture', options: { secure: false, httpOnly: false, maxAge: 60 } }], {});
      expect(mocks.set).toHaveBeenCalledExactlyOnceWith('ap-auth.0', 'fixture', { secure, httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 });
    });
    it('logout usa Secure e apaga somente chunks/verifier próprios', async () => {
      const { clearAuthCookies } = await import('../../src/lib/supabase/server');
      (await clearAuthCookies())();
      expect(mocks.set).toHaveBeenCalledTimes(2);
      for (const name of ['ap-auth.0', 'ap-auth-code-verifier']) expect(mocks.set).toHaveBeenCalledWith(name, '', expect.objectContaining({ secure, maxAge: 0, httpOnly: true, sameSite: 'lax', path: '/' }));
      expect(mocks.set).not.toHaveBeenCalledWith('other', expect.anything(), expect.anything());
    });
    it('proxy aplica Secure também ao renovar cookies', async () => {
      mocks.server.mockImplementation((_url: string, _key: string, options: ServerOptions) => ({ auth: { getUser: async () => {
        options.cookies.setAll([{ name: 'ap-auth.0', value: 'renewed', options: { secure: false } }], {});
        return { data: { user: null }, error: null };
      } } }));
      const { proxy } = await import('../../src/proxy');
      const response = await proxy(new NextRequest(`${secure ? 'https://pilot.example' : 'http://127.0.0.1:3215'}/dashboard`));
      expect(response.cookies.get('ap-auth.0')).toMatchObject({ value: 'renewed', secure, httpOnly: true, sameSite: 'lax', path: '/' });
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    });
    it('browser configura PKCE e Secure para o endpoint do ambiente', async () => {
      const url = secure ? 'https://fixture.supabase.co' : 'http://127.0.0.1:56151';
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-publishable-key');
      const { browserClient } = await import('../../src/lib/supabase/browser');
      browserClient();
      expect(mocks.browser).toHaveBeenCalledExactlyOnceWith(url, 'fixture-publishable-key', {
        cookieOptions: { name: 'ap-auth', path: '/', sameSite: 'lax', secure },
        auth: { flowType: 'pkce', detectSessionInUrl: false, autoRefreshToken: false },
      });
    });
    it('browser rejeita o endpoint do outro ambiente antes de passar a chave ao SDK', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', secure ? 'http://127.0.0.1:56151' : 'https://fixture.supabase.co');
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-publishable-key');
      const { browserClient } = await import('../../src/lib/supabase/browser');
      expect(browserClient).toThrow();
      expect(mocks.browser).not.toHaveBeenCalled();
    });
  });
}

describe('endpoint Supabase hospedado no navegador', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'fixture-publishable-key');
  });

  it('aceita a raiz HTTPS do projeto com barra final', async () => {
    const url = 'https://fixture.supabase.co/';
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    const { browserClient } = await import('../../src/lib/supabase/browser');
    browserClient();
    expect(mocks.browser).toHaveBeenCalledWith(url, 'fixture-publishable-key', expect.anything());
  });

  it.each([
    undefined,
    'http://fixture.supabase.co',
    'https://fixture.supabase.co.other.invalid',
    'https://fixture.supabase.co:8443',
    'https://user:password@fixture.supabase.co',
    'https://fixture.supabase.co/storage/v1',
    'https://fixture.supabase.co/?fixture=1',
    'https://fixture.supabase.co/#fragment',
    'https://fixture.supabase.co/fixture/..',
  ])('rejeita o endpoint %s antes de criar o cliente', async url => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    const { browserClient } = await import('../../src/lib/supabase/browser');
    expect(browserClient).toThrow();
    expect(mocks.browser).not.toHaveBeenCalled();
  });
});
