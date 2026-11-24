import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(), update: vi.fn(), confirmDecisions: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: async () => ({}) }));
vi.mock('../../src/lib/supabase/admin.server', () => ({ adminClient: vi.fn() }));
vi.mock('../../src/lib/auth/gateway.server', () => ({
  createGateway: () => ({ currentUser: mocks.currentUser, account: async () => null }),
}));
vi.mock('../../src/lib/supabase/config.server', () => ({
  appOrigin: () => 'http://127.0.0.1:3215', mutationOrigins: (origin: string) => [origin],
}));
vi.mock('../../src/lib/ideas/service.server', () => ({
  createIdeasService: () => ({ update: mocks.update, confirmDecisions: mocks.confirmDecisions }),
  ideaView: ({ owner_id, ...idea }: Record<string, unknown>) => { void owner_id; return idea; },
  IdeasError: class IdeasError extends Error { constructor(readonly status: number, message: string) { super(message); } },
}));
import { POST } from '../../src/app/api/ideias/route';

const ownerId = '11111111-1111-4111-8111-111111111111';
const ideaId = '22222222-2222-4222-8222-222222222222';
const decisions = [
  { chave: 'formato', estado: 'DEFINIDO', descricao: 'Presencial.' },
  { chave: 'horario', estado: 'PROVISÓRIO', descricao: 'Sábado às 15h, sujeito a confirmação.' },
  { chave: 'local', estado: 'PENDENTE', descricao: 'Escolher local acessível.' },
  { chave: 'cobranca', estado: 'EXCLUÍDO', descricao: 'Cobrança de ingresso.' },
];
const command = { action: 'confirm-decisions', id: ideaId, expectedVersion: 2, decisions };
const revision = {
  action: 'update', id: ideaId, expectedVersion: 2, title: 'Oficina',
  revisedText: 'Uma oficina de leitura.', revisedInterpretation: null,
};

function post(body: unknown) {
  const origin = 'http://127.0.0.1:3215';
  return POST(new Request(origin + '/api/ideias', {
    method: 'POST', headers: { origin, host: '127.0.0.1:3215', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Transporte externo fora do contrato')));
  mocks.currentUser.mockResolvedValue({ id: ownerId, email_confirmed_at: 'synthetic' });
  mocks.update.mockResolvedValue({ id: ideaId, owner_id: ownerId, version: 3, revised_text: revision.revisedText });
  mocks.confirmDecisions.mockResolvedValue({ id: ideaId, owner_id: ownerId, version: 3, decisions });
});
afterEach(() => vi.unstubAllGlobals());

it('editar o texto usa a revisão existente sem promover sugestões a decisão', async () => {
  expect((await post(revision)).status).toBe(200);
  expect(mocks.update).toHaveBeenCalledExactlyOnceWith(ownerId, ideaId, {
    expectedVersion: 2, title: revision.title, revisedText: revision.revisedText, revisedInterpretation: null,
  });
  expect(mocks.confirmDecisions).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it('revisão comum recusa decisões injetadas junto ao texto', async () => {
  expect((await post({ ...revision, decisions })).status).toBe(400);
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.confirmDecisions).not.toHaveBeenCalled();
});

it('sessão ausente ou não confirmada não pode confirmar decisões', async () => {
  mocks.currentUser.mockResolvedValueOnce(null);
  expect((await post(command)).status).toBe(401);
  mocks.currentUser.mockResolvedValueOnce({ id: ownerId, email_confirmed_at: null });
  expect((await post(command)).status).toBe(403);
  expect(mocks.confirmDecisions).not.toHaveBeenCalled();
});

it('confirmação explícita entrega os quatro estados e usa identidade da sessão', async () => {
  const response = await post(command);
  expect(response.status).toBe(200);
  expect(mocks.confirmDecisions).toHaveBeenCalledExactlyOnceWith(ownerId, ideaId, { expectedVersion: 2, decisions });
  const { ideia } = await response.json();
  expect(ideia).toMatchObject({ id: ideaId, version: 3, decisions });
  expect(ideia).not.toHaveProperty('owner_id');
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(fetch).not.toHaveBeenCalled();
});
