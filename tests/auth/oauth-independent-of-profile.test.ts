import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/auth/person-access.server', () => ({ personState: () => { throw new Error('consulta PF não deve acontecer durante login'); } }));
import { oauthDestination } from '../../src/lib/auth/oauth.server';
import type { AuthGateway } from '../../src/lib/auth/flow.server';

it('Google OAuth ativo não exige consulta ao cadastro PF para voltar à Praça', async () => {
  const id='11111111-1111-4111-8111-111111111111';
  const gateway={
    currentUser:async()=>({id,email_confirmed_at:'2026-11-06'}),
    account:async()=>({auth_user_id:id,papel:'publicador',organizacao_id:null,situacao:'ativa'}),
  } as unknown as AuthGateway;
  await expect(oauthDestination(gateway)).resolves.toBe('/');
});
