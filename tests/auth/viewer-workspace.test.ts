import { beforeEach, expect, it, vi } from 'vitest';
const deps = vi.hoisted(() => ({ currentUser: vi.fn(), account: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: async () => ({}) }));
vi.mock('../../src/lib/supabase/admin.server', () => ({ adminClient: vi.fn() }));
vi.mock('../../src/lib/auth/gateway.server', () => ({ createGateway: () => ({ currentUser: deps.currentUser, account: deps.account }) }));
vi.mock('../../src/lib/auth/person-access.server', () => ({ personState: vi.fn() }));
vi.mock('../../src/lib/auth/dashboard.server', () => ({ organizationState: vi.fn(), institutionalState: vi.fn() }));
import { getViewer } from '../../src/components/Viewer.server';

beforeEach(() => {
  vi.clearAllMocks();
  deps.currentUser.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', email_confirmed_at: '2026-11-06' });
  deps.account.mockResolvedValue(null);
});
it('conta confirmada sem vínculo vai para escolha, nunca diretamente para organização', async () => {
  expect(await getViewer()).toMatchObject({ kind: 'ready', dashboard: '/meu-espaco' });
});
it('conta sem confirmação não recebe entrada de criação de perfil', async () => {
  deps.currentUser.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', email_confirmed_at: null });
  expect(await getViewer()).toEqual({ kind: 'unavailable' });
  expect(deps.account).not.toHaveBeenCalled();
});
