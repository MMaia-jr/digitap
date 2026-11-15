import 'server-only';
import type { AuthGateway } from './flow.server';
import { FlowError } from './flow.server';

/** Database state determines destination; Google metadata never assigns roles. */
export async function oauthDestination(gateway: AuthGateway) {
  const user = await gateway.currentUser();
  if (!user?.id || !user.email_confirmed_at) throw new FlowError(403, 'Acesso indisponível.');
  const account = await gateway.account(user.id);
  if (!account) return '/';
  if (account.auth_user_id !== user.id || account.situacao !== 'ativa') throw new FlowError(403, 'Acesso indisponível.');
  if (account.papel === 'organizacao' && account.organizacao_id) return '/';
  if (account.papel === 'editor' || account.papel === 'administrador') return '/';
  if (account.papel === 'publicador' && account.organizacao_id === null) {
    return '/';
  }
  throw new FlowError(403, 'Acesso indisponível.');
}
