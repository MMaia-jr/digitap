import { expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createBrowserClient, createServerClient } from '@supabase/ssr';

it('SDK SSR gera S256 e callback servidor recupera o verifier do mesmo cookie', async () => {
  const jar = new Map<string, string>();
  const cookies = {
    getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
    setAll: (values: { name: string; value: string }[]) => { for (const { name, value } of values) { if (value) jar.set(name, value); else jar.delete(name); } },
  };
  const cookieOptions = { name: 'ap-auth', path: '/', sameSite: 'lax' as const, secure: false };
  const browser = createBrowserClient('http://127.0.0.1:56151', 'sb_publishable_fixture', {
    isSingleton: false, cookies, cookieOptions,
    auth: { flowType: 'pkce', detectSessionInUrl: false, autoRefreshToken: false },
  });
  const { data, error } = await browser.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'http://127.0.0.1:3215/auth/callback', skipBrowserRedirect: true } });
  expect(error).toBeNull();
  const url = new URL(data.url!);
  expect(url.pathname).toBe('/auth/v1/authorize');
  expect(url.searchParams.get('provider')).toBe('google');
  expect(url.searchParams.get('redirect_to')).toBe('http://127.0.0.1:3215/auth/callback');
  expect(url.searchParams.get('code_challenge_method')).toBe('s256');
  expect(jar.has('ap-auth-code-verifier')).toBe(true);

  // No Google or local Auth request: inspect the token request through SDK fetch.
  const tokenRequest = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    expect(body.auth_code).toBe('fixture-code');
    expect(createHash('sha256').update(body.code_verifier).digest('base64url')).toBe(url.searchParams.get('code_challenge'));
    return new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Fixture: exchange stopped before creating session.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  });
  const server = createServerClient('http://127.0.0.1:56151', 'sb_publishable_fixture', {
    cookieOptions: { ...cookieOptions, httpOnly: true }, cookies, global: { fetch: tokenRequest },
  });
  const exchange = await server.auth.exchangeCodeForSession('fixture-code');
  expect(tokenRequest).toHaveBeenCalledOnce();
  expect(exchange.error).not.toBeNull();
});
