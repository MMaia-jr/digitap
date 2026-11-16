import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityError } from '../../src/lib/activities/domain';

const mocks = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/activities/service.server', () => ({
  activities: {
    getExecutionPlan: mocks.get,
    createExecutionPlan: mocks.create,
    updateExecutionPlan: mocks.update,
  },
}));
vi.mock('../../src/lib/supabase/config.server', () => ({
  appOrigin: () => 'http://127.0.0.1:3215',
  mutationOrigins: (origin: string) => [origin],
}));

import { GET, PATCH, POST } from '../../src/app/api/atividades/[id]/planejamento/route';

const origin = 'http://127.0.0.1:3215';
const activityId = '30000000-0000-4000-8000-000000000071';
const plan = {
  id: '40000000-0000-4000-8000-000000000001', activity_id: activityId,
  subject_id: '50000000-0000-4000-8000-000000000001', version: 1,
  estado: 'privado', total_previsto_centavos: 1250,
  recursos: [{ categoria: 'material', descricao: 'Papel', valor_previsto_centavos: 1250 }],
};
const context = { params: Promise.resolve({ id: activityId }) };
function request(method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/atividades/${activityId}/planejamento`, {
    method,
    headers: {
      host: '127.0.0.1:3215',
      ...(body === undefined ? {} : { origin, 'content-type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(plan);
  mocks.create.mockResolvedValue(plan);
  mocks.update.mockResolvedValue({ ...plan, version: 2 });
});

describe('API privada de planejamento de execução', () => {
  it('consulta com sessão no servidor, retorna no-store e identifica como privado', async () => {
    const response = await GET(request('GET'), context);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ plano: plan });
    expect(mocks.get).toHaveBeenCalledWith(activityId);
  });

  it('bloqueia Host não autorizado antes de acessar o serviço', async () => {
    const response = await GET(request('GET', undefined, { host: 'evil.invalid' }), context);
    expect(response.status).toBe(403);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejeita POST cross-site antes de chamar a mutação', async () => {
    const response = await POST(request('POST', { recursos: plan.recursos }, { origin: 'https://evil.invalid' }), context);
    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('cria plano somente após POST same-origin e usa o ID da rota', async () => {
    const payload = { recursos: plan.recursos };
    const response = await POST(request('POST', payload), context);
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(activityId, payload);
    expect(await response.json()).toMatchObject({ plano: { id: plan.id, estado: 'privado' } });
  });

  it('atualiza por PATCH e preserva HTTP 409 para versão concorrente', async () => {
    mocks.update.mockRejectedValue(new ActivityError(409, 'O planejamento mudou. Recarregue antes de salvar.'));
    const payload = { versao_esperada: 1, recursos: plan.recursos };
    const response = await PATCH(request('PATCH', payload), context);
    expect(response.status).toBe(409);
    expect(mocks.update).toHaveBeenCalledWith(activityId, payload);
    expect(await response.json()).toMatchObject({ message: expect.stringMatching(/mudou|recarregue/i) });
  });

  it('mantém 401 quando a sessão do servidor não existe', async () => {
    mocks.create.mockRejectedValue(new ActivityError(401, 'Autenticação necessária.'));
    const response = await POST(request('POST', { recursos: plan.recursos }), context);
    expect(response.status).toBe(401);
  });
});
