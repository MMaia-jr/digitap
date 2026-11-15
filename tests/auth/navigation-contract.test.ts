import { describe, expect, it, vi } from 'vitest';
import { executeAuth, type AuthGateway } from '../../src/lib/auth/flow.server';
import { oauthDestination } from '../../src/lib/auth/oauth.server';

vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/auth/person-access.server', () => ({
  personState: vi.fn().mockResolvedValue({ kind: 'ready' }),
}));

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email_confirmed_at: '2026-11-06',
};
const credentials = { email: 'fixture@example.invalid', password: 'SenhaFicticia123!' };

function fixture(account: unknown = null) {
  return {
    signUp: vi.fn().mockResolvedValue({}),
    signIn: vi.fn().mockResolvedValue({ user, session: true }),
    currentUser: vi.fn().mockResolvedValue(user),
    account: vi.fn().mockResolvedValue(account),
    recover: vi.fn().mockResolvedValue({}),
    verify: vi.fn().mockResolvedValue({ user, session: true }),
    changePassword: vi.fn().mockResolvedValue({}),
    logout: vi.fn().mockResolvedValue({}),
    registerOrganization: vi.fn().mockResolvedValue({ organizacao_id: 'org-a' }),
  } satisfies AuthGateway;
}

const activeAccount = (papel: string, organizacao_id: string | null = null) => ({
  auth_user_id: user.id,
  situacao: 'ativa',
  papel,
  organizacao_id,
});

describe('RED — destino de autenticação alinhado à Praça pública', () => {
  it('conta confirmada sem vínculo retorna à Praça, sem presumir onboarding PF', async () => {
    const gateway = fixture();
    const result = await executeAuth('signin', credentials, gateway);
    expect(result.next).toBe('/');
    expect(gateway.registerOrganization).not.toHaveBeenCalled();
    expect(gateway.logout).not.toHaveBeenCalled();
  });

  it.each([
    ['pessoa física', activeAccount('publicador')],
    ['organização', activeAccount('organizacao', 'org-a')],
    ['editor', activeAccount('editor')],
  ])('%s com vínculo ativo retorna à Praça, não a dashboard automático', async (_label, account) => {
    const result = await executeAuth('signin', credentials, fixture(account));
    expect(result.next).toBe('/');
  });

  it('OAuth sem perfil confirmado no banco retorna à Praça, não força PF', async () => {
    expect(await oauthDestination(fixture())).toBe('/');
  });

  it.each([
    ['pessoa física', activeAccount('publicador')],
    ['organização', activeAccount('organizacao', 'org-a')],
  ])('OAuth %s retorna à Praça preservando o vínculo existente', async (_label, account) => {
    expect(await oauthDestination(fixture(account))).toBe('/');
  });

  it('não transforma conta bloqueada em acesso válido', async () => {
    const gateway = fixture({ ...activeAccount('organizacao', 'org-a'), situacao: 'bloqueada' });
    await expect(executeAuth('signin', credentials, gateway)).rejects.toMatchObject({ status: 403 });
    expect(gateway.logout).toHaveBeenCalledOnce();
  });
});
