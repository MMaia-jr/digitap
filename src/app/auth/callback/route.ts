import { userClient, clearAuthCookies } from '../../../lib/supabase/server';
import { adminClient } from '../../../lib/supabase/admin.server';
import { appOrigin } from '../../../lib/supabase/config.server';
import { createGateway } from '../../../lib/auth/gateway.server';
import { oauthDestination } from '../../../lib/auth/oauth.server';
import { privateHeaders } from '../../../lib/auth/http.server';

export async function GET(request: Request) {
  const origin = appOrigin();
  const redirect = (path: string) => new Response(null, { status: 303, headers: { ...privateHeaders, Location: origin + path } });
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code || url.searchParams.has('error')) return redirect('/login?status=oauth-falhou');
  const clear = await clearAuthCookies();
  try {
    const client = await userClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    const gateway = createGateway(client, adminClient, clear);
    return redirect(await oauthDestination(gateway));
  } catch {
    clear();
    return redirect('/login?status=oauth-falhou');
  }
}
