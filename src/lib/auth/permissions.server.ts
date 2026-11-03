import 'server-only';

export class AccessError extends Error {
  constructor(public readonly status: 401 | 403 | 503) {
    super(status === 503 ? 'Serviço indisponível.' : status === 401 ? 'Autenticação necessária.' : 'Acesso negado.');
    this.name = 'AccessError';
  }
}

export interface VerifiedUser { id: string; email_confirmed_at?: string | null }
export interface AccessAccount {
  auth_user_id: string;
  papel: 'organizacao' | 'editor' | 'administrador';
  situacao: 'ativa' | 'bloqueada' | 'desativada';
  organizacao_id: string | null;
}
export interface AccessDependencies {
  verifyUser(): Promise<VerifiedUser | null>;
  findAccount(userId: string): Promise<AccessAccount | null>;
}
export type AccessRequest =
  | { action: 'editorial' | 'administracao' }
  | { action: 'organizacao'; organizationId: string };

/** Dependencies must be constructed in a server-only adapter, never from request payloads. */
export async function authorize(deps: AccessDependencies, request: AccessRequest): Promise<AccessAccount> {
  let user: VerifiedUser | null;
  try { user = await deps.verifyUser(); } catch { throw new AccessError(503); }
  if (!user?.id) throw new AccessError(401);
  if (!user.email_confirmed_at) throw new AccessError(403);

  let account: AccessAccount | null;
  try { account = await deps.findAccount(user.id); } catch { throw new AccessError(503); }
  if (!account || account.auth_user_id !== user.id || account.situacao !== 'ativa') throw new AccessError(403);
  if (!['organizacao', 'editor', 'administrador'].includes(account.papel)) throw new AccessError(403);

  switch (request.action) {
    case 'organizacao':
      if (account.papel !== 'organizacao' || !account.organizacao_id || account.organizacao_id !== request.organizationId) throw new AccessError(403);
      break;
    case 'editorial':
      if (!['editor', 'administrador'].includes(account.papel)) throw new AccessError(403);
      break;
    case 'administracao':
      if (account.papel !== 'administrador') throw new AccessError(403);
      break;
    default: throw new AccessError(403);
  }
  return account;
}
