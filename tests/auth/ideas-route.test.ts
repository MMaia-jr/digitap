import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(), account: vi.fn(), create: vi.fn(), list: vi.fn(), get: vi.fn(), update: vi.fn(), remove: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: vi.fn(async () => ({})) }));
vi.mock('../../src/lib/supabase/admin.server', () => ({ adminClient: vi.fn() }));
vi.mock('../../src/lib/auth/gateway.server', () => ({ createGateway: () => ({ currentUser: mocks.currentUser, account: mocks.account }) }));
vi.mock('../../src/lib/supabase/config.server', () => ({ appOrigin: () => 'http://127.0.0.1:3215', mutationOrigins: (origin: string) => [origin] }));
vi.mock('../../src/lib/ideas/service.server', () => ({
  createIdeasService: () => ({ create: mocks.create, list: mocks.list, get: mocks.get, update: mocks.update, delete: mocks.remove }),
  ideaView: (idea: Record<string, unknown>) => { const view = { ...idea }; delete view.owner_id; return view; },
  IdeasError: class IdeasError extends Error { constructor(readonly status: number, message: string) { super(message); } },
}));
import { GET, POST } from '../../src/app/api/ideias/route';

const id = '11111111-1111-4111-8111-111111111111';
const idea = { id: '22222222-2222-4222-8222-222222222222', owner_id: id, title: 'Ideia', version: 1 };
const origin = 'http://127.0.0.1:3215';
function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(origin + '/api/ideias', { method: 'POST', headers: { origin, host: '127.0.0.1:3215', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentUser.mockResolvedValue({ id, email_confirmed_at: 'confirmed' });
  mocks.account.mockResolvedValue(null);
  mocks.create.mockResolvedValue(idea); mocks.list.mockResolvedValue([idea]);
  mocks.get.mockResolvedValue(idea); mocks.update.mockResolvedValue(idea); mocks.remove.mockResolvedValue(true);
});

describe('fronteira HTTP de Minhas ideias', () => {
  it('deriva owner da sessão, ignora tentativa de fornecer owner e não o devolve ao navegador', async () => {
    const response = await POST(post({ action: 'create', title: 'Ideia', originalText: 'texto', originalInterpretation: {}, owner_id: '33333333-3333-4333-8333-333333333333' }));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('usa identidade verificada da sessão como único proprietário do novo rascunho', async () => {
    const payload = { action: 'create', title: 'Ideia', originalText: 'texto', originalInterpretation: {}, revisedInterpretation: {} };
    const response = await POST(post(payload));
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(id, { title: 'Ideia', originalText: 'texto', originalInterpretation: {}, revisedInterpretation: {} });
    expect(await response.json()).toEqual({ message: 'Rascunho salvo em Minhas ideias.', ideia: { id: idea.id, title: idea.title, version: idea.version } });
  });
  it('exige sessão e e-mail confirmado antes de consultar ideias', async () => {
    mocks.currentUser.mockResolvedValueOnce(null);
    expect((await GET(new Request(origin + '/api/ideias', { headers: { host: '127.0.0.1:3215' } }))).status).toBe(401);
    mocks.currentUser.mockResolvedValueOnce({ id, email_confirmed_at: null });
    expect((await GET(new Request(origin + '/api/ideias', { headers: { host: '127.0.0.1:3215' } }))).status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('rejeita origem externa antes de verificar a sessão', async () => {
    const response = await POST(post({ action: 'create' }, { origin: 'https://evil.invalid' }));
    expect(response.status).toBe(403); expect(mocks.currentUser).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
  });
  it('rejeita Host não autorizado em GET sem Origin antes de consultar a sessão', async () => {
    const response = await GET(new Request(origin + '/api/ideias', { headers: { host: 'evil.invalid' } }));
    expect(response.status).toBe(403);
    expect(mocks.currentUser).not.toHaveBeenCalled();
  });
  it('aceita Host confiável quando a URL interna do runtime tem outro host', async () => {
    const response = await GET(new Request('http://next-internal/api/ideias', { headers: { host: '127.0.0.1:3215' } }));
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(id);
  });
  it('rejeita conta bloqueada e mantém respostas privadas sem cache', async () => {
    mocks.account.mockResolvedValue({ auth_user_id: id, situacao: 'bloqueada' });
    const response = await POST(post({ action: 'create', title: 'Ideia', originalText: 'texto', originalInterpretation: {} }));
    expect(response.status).toBe(403); expect(mocks.create).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('lista apenas por identidade autenticada e omite owner_id da resposta', async () => {
    const response = await GET(new Request(origin + '/api/ideias', { headers: { host: '127.0.0.1:3215' } }));
    expect(response.status).toBe(200); expect(mocks.list).toHaveBeenCalledWith(id);
    expect(await response.json()).toEqual({ ideias: [{ id: idea.id, title: idea.title, version: 1 }] });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
