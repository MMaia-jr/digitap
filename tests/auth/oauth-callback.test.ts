import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ exchange: vi.fn(), user: vi.fn(), account: vi.fn(), state: vi.fn(), clear: vi.fn() }));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange } }), clearAuthCookies: async () => mocks.clear }));
vi.mock('../../src/lib/supabase/admin.server', () => ({ adminClient: vi.fn() }));
vi.mock('../../src/lib/auth/gateway.server', () => ({ createGateway: () => ({ currentUser: mocks.user, account: mocks.account }) }));
vi.mock('../../src/lib/auth/person-access.server', () => ({ personState: mocks.state }));
import { GET } from '../../src/app/auth/callback/route';
const origin = 'http://127.0.0.1:3215';
const user = { id: 'fixture-user', email_confirmed_at: '2026-11-06' };
beforeEach(() => { vi.clearAllMocks(); mocks.exchange.mockResolvedValue({ error: null }); mocks.user.mockResolvedValue(user); mocks.account.mockResolvedValue(null); mocks.state.mockResolvedValue({ kind: 'ready' }); });
it('novo usuário troca code e vai completar nome público sem criar PF automaticamente', async () => {
  const r = await GET(new Request(origin + '/auth/callback?code=fixture-code&next=https://externo.invalid'));
  expect(mocks.exchange).toHaveBeenCalledWith('fixture-code');
  expect(r.status).toBe(303); expect(r.headers.get('location')).toBe(origin + '/cadastro/pessoa-fisica/completar');
  expect(r.headers.get('cache-control')).toContain('no-store');
});
it('PF existente vai ao dashboard PF', async () => {
  mocks.account.mockResolvedValue({ auth_user_id: user.id, papel: 'publicador', situacao: 'ativa', organizacao_id: null });
  expect((await GET(new Request(origin + '/auth/callback?code=fixture'))).headers.get('location')).toBe(origin + '/dashboard/pessoa-fisica');
});
it.each(['editor','administrador','organizacao'])('preserva conta %s existente', async papel => {
  mocks.account.mockResolvedValue({ auth_user_id: user.id, papel, situacao: 'ativa', organizacao_id: papel === 'organizacao' ? 'org' : null });
  expect((await GET(new Request(origin + '/auth/callback?code=fixture'))).headers.get('location')).toBe(origin + (papel === 'organizacao' ? '/dashboard' : '/admin/atividades'));
});
it('sem code não tenta trocar sessão', async () => {
  expect((await GET(new Request(origin + '/auth/callback'))).headers.get('location')).toBe(origin + '/login?status=oauth-falhou');
  expect(mocks.exchange).not.toHaveBeenCalled();
});
it('erro de troca não encaminha ao dashboard e limpa cookies locais', async () => {
  mocks.exchange.mockResolvedValue({ error: new Error('privado') });
  expect((await GET(new Request(origin + '/auth/callback?code=fixture'))).headers.get('location')).toBe(origin + '/login?status=oauth-falhou');
  expect(mocks.clear).toHaveBeenCalled();
});
it('conta bloqueada não avança', async () => {
  mocks.account.mockResolvedValue({ auth_user_id: user.id, papel: 'publicador', situacao: 'bloqueada', organizacao_id: null });
  expect((await GET(new Request(origin + '/auth/callback?code=fixture'))).headers.get('location')).toBe(origin + '/login?status=oauth-falhou');
});
