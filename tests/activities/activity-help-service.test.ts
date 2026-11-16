import { afterEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  ownedProfile: vi.fn(),
  publicActivity: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/queries/profiles.server', () => ({ ownedProfile: deps.ownedProfile }));
vi.mock('../../src/lib/queries/collaboration.server', () => ({ ownedProject: vi.fn() }));
vi.mock('../../src/lib/queries/public.server', () => ({
  publicActivities: { byPublisher: vi.fn(async () => []) },
  createPublicQueries: () => ({ get: deps.publicActivity }),
}));
vi.mock('../../src/lib/database.server', () => ({ withTransaction: vi.fn() }));
vi.mock('../../src/lib/supabase/admin.server', () => ({ adminClient: {} }));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: vi.fn() }));
vi.mock('../../src/lib/auth/gateway.server', () => ({ createGateway: vi.fn() }));

import { createE4Service } from '../../src/lib/capabilities/service.server';

const userId = '10000000-0000-4000-8000-000000000001';
const subjectId = '20000000-0000-4000-8000-000000000001';
const activityId = '30000000-0000-4000-8000-000000000001';
const needId = '40000000-0000-4000-8000-000000000001';

function fakeService(query: (sql: string, values?: unknown[]) => unknown) {
  deps.ownedProfile.mockResolvedValue({ id: subjectId, conta_id: 'account-1' });
  deps.publicActivity.mockResolvedValue({ id: activityId, sujeito: { id: subjectId, tipo: 'pessoa_fisica' } });
  return createE4Service({
    verifyUser: async () => ({ id: userId, email_confirmed_at: '2026-11-15T10:00:00Z' }),
    transaction: async operation => operation({ query: async (sql: string, values?: unknown[]) => query(sql, values) } as never),
  }) as ReturnType<typeof createE4Service> & Record<string, (...args: never[]) => Promise<unknown>>;
}

describe('E4.1 — solicitações de ajuda em atividade própria', () => {
  afterEach(() => vi.clearAllMocks());

  it('cria uma solicitação privada vinculada à atividade e ao titular verificado', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('from public.atividades')) return { rows: [{ id: activityId, sujeito_id: subjectId, criada_por_conta_id: 'account-1', organizacao_id: null }] };
      if (sql.includes('insert into public.necessidades_projeto')) return { rows: [{ id: needId }] };
      if (sql.includes('select n.id') && sql.includes('atividade_id')) return { rows: [{ id: needId, atividade_id: activityId, visibilidade: 'privada', estado: 'aberta', versao: 1 }] };
      return { rows: [] };
    });
    const service = fakeService(query);
    await expect(service.createActivityNeed({ activityId, description: 'Preciso de apoio para revisar o material.', categories: ['comunicacao'] })).resolves.toMatchObject({ atividade_id: activityId, visibilidade: 'privada' });
    expect(deps.ownedProfile).toHaveBeenCalledWith(expect.anything(), userId, subjectId, true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('insert into public.necessidades_projeto'), expect.arrayContaining([activityId]));
  });

  it('não aceita titularidade fornecida pelo cliente para consultar ou editar', async () => {
    const query = vi.fn(async (sql: string) => sql.includes('from public.necessidades_projeto')
      ? { rows: [{ id: needId, atividade_id: activityId, sujeito_id: subjectId, versao: 1, visibilidade: 'privada', estado: 'aberta' }] }
      : sql.includes('from public.atividades')
        ? { rows: [{ id: activityId, sujeito_id: subjectId, criada_por_conta_id: 'account-1', organizacao_id: null }] }
        : { rows: [] });
    const service = fakeService(query);
    deps.ownedProfile.mockResolvedValue(null);
    await expect(service.updateActivityNeed({ id: needId, subjectId: 'attacker-controlled', expectedVersion: 1, description: 'Texto alterado por outra conta.', categories: ['cultura'], visibility: 'privada' } as never)).rejects.toMatchObject({ status: 403 });
    expect(deps.ownedProfile).toHaveBeenCalledWith(expect.anything(), userId, subjectId, true);
    expect(deps.ownedProfile).not.toHaveBeenCalledWith(expect.anything(), userId, 'attacker-controlled', true);
  });

  it('exige snapshot público vigente antes de tornar a solicitação visível', async () => {
    const query = vi.fn(async (sql: string) => sql.includes('from public.necessidades_projeto')
      ? { rows: [{ id: needId, atividade_id: activityId, sujeito_id: subjectId, versao: 1, visibilidade: 'privada', estado: 'aberta' }] }
      : sql.includes('from public.atividades')
        ? { rows: [{ id: activityId, sujeito_id: subjectId, criada_por_conta_id: 'account-1', organizacao_id: null }] }
        : { rows: [] });
    const service = fakeService(query);
    deps.publicActivity.mockRejectedValue(new Error('not public'));
    await expect(service.updateActivityNeed({ id: needId, expectedVersion: 1, description: 'Solicitação revisada.', categories: ['cultura'], visibility: 'visivel' })).rejects.toMatchObject({ status: 403 });
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining('update public.necessidades_projeto'), expect.anything());
  });
});
