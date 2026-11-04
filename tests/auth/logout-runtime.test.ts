import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ userClient: vi.fn(), clear: vi.fn(), clearFactory: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: mocks.userClient, clearAuthCookies: mocks.clearFactory }));
import { mutation } from '../../src/lib/auth/runtime.server';
const origin = 'http://127.0.0.1:3215';
const request = (from = origin, body = '{}') => new Request(origin + '/api/auth/sair', {
  method: 'POST', headers: { origin: from, 'content-type': 'application/json' }, body,
});
beforeEach(() => {
  vi.clearAllMocks(); mocks.clearFactory.mockResolvedValue(mocks.clear);
  mocks.userClient.mockRejectedValue(new Error('configuração/segredo privado'));
  vi.stubEnv('APP_ORIGIN', origin);
});
afterEach(() => vi.unstubAllEnvs());
describe('A08: logout e falhas de inicialização no runtime simulado', () => {
  it('apaga cookies próprios mesmo sem conseguir inicializar o SDK', async () => {
    const response = await mutation('signout', request());
    expect(response.status).toBe(503); expect(mocks.clear).toHaveBeenCalledOnce();
    expect(await response.text()).not.toContain('segredo privado');
  });
  it('não apaga cookies por pedido cross-site', async () => {
    expect((await mutation('signout', request('https://externo.invalid'))).status).toBe(403);
    expect(mocks.clearFactory).not.toHaveBeenCalled(); expect(mocks.userClient).not.toHaveBeenCalled();
  });
  it('não apaga cookies por payload inválido', async () => {
    expect((await mutation('signout', request(origin, '{"papel":"admin"}'))).status).toBe(400);
    expect(mocks.clearFactory).not.toHaveBeenCalled(); expect(mocks.userClient).not.toHaveBeenCalled();
  });
  it('configuração fora do escopo retorna 503 privado sem exceção crua', async () => {
    vi.stubEnv('APP_ORIGIN', 'https://fora-do-escopo.invalid');
    const response = await mutation('signout', request());
    expect(response.status).toBe(503); expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.text()).not.toContain('fora-do-escopo'); expect(mocks.userClient).not.toHaveBeenCalled();
  });
});
