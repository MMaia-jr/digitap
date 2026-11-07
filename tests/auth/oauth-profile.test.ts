import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { executeAuth, type AuthAction, type AuthGateway } from '../../src/lib/auth/flow.server';
const user = { id: 'fixture-user', email_confirmed_at: '2026-11-06' };
function gateway() { return { currentUser: vi.fn<() => Promise<typeof user | null>>().mockResolvedValue(user), account: vi.fn().mockResolvedValue(null), registerPerson: vi.fn().mockResolvedValue({ sujeito_id: 'fixture-subject' }) }; }
it('completar perfil usa identidade autenticada e nome informado na RPC', async () => {
  const g = gateway();
  expect(await executeAuth('complete_pf' as AuthAction, { nome_publico: ' Pessoa Fictícia ' }, g as unknown as AuthGateway)).toMatchObject({ next: '/dashboard/pessoa-fisica' });
  expect(g.registerPerson).toHaveBeenCalledWith(user.id, 'Pessoa Fictícia');
});
it('nome inválido não chama RPC', async () => {
  const g = gateway();
  await expect(executeAuth('complete_pf' as AuthAction, { nome_publico: '<script>' }, g as unknown as AuthGateway)).rejects.toMatchObject({ status: 422 });
  expect(g.registerPerson).not.toHaveBeenCalled();
});
it('visitante não completa PF', async () => {
  const g = gateway(); g.currentUser.mockResolvedValue(null);
  await expect(executeAuth('complete_pf' as AuthAction, { nome_publico: 'Pessoa Fictícia' }, g as unknown as AuthGateway)).rejects.toMatchObject({ status: 401 });
  expect(g.registerPerson).not.toHaveBeenCalled();
});
