'use client';
import { createBrowserClient } from '@supabase/ssr';

/** Only starts PKCE. Session exchange and HttpOnly session cookies stay on the server. */
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url !== 'http://127.0.0.1:56151' || !key || key.trim().length < 20) {
    throw new Error('Supabase local não configurado.');
  }
  return createBrowserClient(url, key, {
    cookieOptions: { name: 'ap-auth', path: '/', sameSite: 'lax', secure: false },
    auth: { flowType: 'pkce', detectSessionInUrl: false, autoRefreshToken: false },
  });
}
