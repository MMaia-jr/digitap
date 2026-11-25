'use client';
import { createBrowserClient } from '@supabase/ssr';

/** Starts PKCE and uploads to signed Storage URLs. Session exchange and HttpOnly session cookies stay on the server. */
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const production = process.env.NODE_ENV === 'production';
  if (!url || !key || key.trim().length < 20) {
    throw new Error('Supabase não configurado.');
  }
  const validUrl = production
    ? /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)
    : url === 'http://127.0.0.1:56151';
  if (!validUrl) {
    throw new Error('URL do Supabase inválida para o ambiente.');
  }
  return createBrowserClient(url, key, {
    cookieOptions: { name: 'ap-auth', path: '/', sameSite: 'lax', secure: production },
    auth: { flowType: 'pkce', detectSessionInUrl: false, autoRefreshToken: false },
  });
}
