import { describe, it, expect, vi } from 'vitest';
import { authorize, AccessError } from '../../src/lib/auth/permissions.server';

vi.mock('server-only', () => ({}));
const user = { id: 'ficticio-usuario', email_confirmed_at: '2026-01-01T00:00:00Z' };
const account = { auth_user_id: user.id, papel: 'organizacao', situacao: 'ativa', organizacao_id: 'org-a' };
const setup = (u: unknown = user, a: unknown = account) => ({
  verifyUser: vi.fn().mockResolvedValue(u),
  findAccount: vi.fn().mockResolvedValue(a),
});
const denied = (promise: Promise<unknown>, status: number) => expect(promise).rejects.toMatchObject({ status });

describe('fronteira de autorização no servidor — testes unitários, sem alegação de RLS', () => {
  it('A09 parcial: visitante não alcança consulta privilegiada', async () => {
    const deps = setup(null);
    await denied(authorize(deps, { action: 'editorial' }), 401);
    expect(deps.findAccount).not.toHaveBeenCalled();
  });
  it('rejeita identidade sem confirmação de email', async () => {
    await denied(authorize(setup({ ...user, email_confirmed_at: null }), { action: 'editorial' }), 403);
  });
  it('G06 parcial: usuário sem conta explícita não vira editor', async () => {
    await denied(authorize(setup(user, null), { action: 'editorial' }), 403);
  });
  it('A06 parcial: user_metadata/e-mail não concedem papel editorial', async () => {
    await denied(authorize(setup({ ...user, email: 'admin@example.invalid', user_metadata: { papel: 'administrador' } }), { action: 'editorial' }), 403);
  });
  it.each(['bloqueada', 'desativada'])('A08 parcial: conta %s é negada', async situacao => {
    await denied(authorize(setup(user, { ...account, situacao }), { action: 'organizacao', organizationId: 'org-a' }), 403);
  });
  it('A05 parcial: organização não acessa objeto de outro tenant', async () => {
    await denied(authorize(setup(), { action: 'organizacao', organizationId: 'org-b' }), 403);
  });
  it('organização acessa somente o próprio tenant', async () => {
    expect(await authorize(setup(), { action: 'organizacao', organizationId: 'org-a' })).toEqual(account);
  });
  it('organização sem vínculo é negada', async () => {
    await denied(authorize(setup(user, { ...account, organizacao_id: null }), { action: 'organizacao', organizationId: 'org-a' }), 403);
  });
  it.each(['editor', 'administrador'])('%s ativo recebe acesso editorial explícito', async papel => {
    expect(await authorize(setup(user, { ...account, papel }), { action: 'editorial' })).toMatchObject({ papel });
  });
  it('editor não recebe administração de contas', async () => {
    await denied(authorize(setup(user, { ...account, papel: 'editor' }), { action: 'administracao' }), 403);
  });
  it('administrador ativo recebe administração de contas', async () => {
    expect(await authorize(setup(user, { ...account, papel: 'administrador' }), { action: 'administracao' })).toMatchObject({ papel: 'administrador' });
  });
  it('não confunde identidade verificada com a conta retornada', async () => {
    await denied(authorize(setup(user, { ...account, auth_user_id: 'outro' }), { action: 'organizacao', organizationId: 'org-a' }), 403);
  });
  it('papel desconhecido falha fechado', async () => {
    await denied(authorize(setup(user, { ...account, papel: 'superadmin' }), { action: 'editorial' }), 403);
  });
  it('falha na verificação da sessão não consulta dados privilegiados', async () => {
    const deps = setup(); deps.verifyUser.mockRejectedValue(new Error('segredo-ficticio'));
    await denied(authorize(deps, { action: 'editorial' }), 503);
    expect(deps.findAccount).not.toHaveBeenCalled();
  });
  it('falha do banco não vaza detalhes internos', async () => {
    const deps = setup(); deps.findAccount.mockRejectedValue(new Error('segredo-ficticio'));
    await expect(authorize(deps, { action: 'editorial' })).rejects.toMatchObject({ status: 503, message: 'Serviço indisponível.' });
  });
  it('papel é relido em cada operação após bloqueio', async () => {
    const deps = setup(user, { ...account, papel: 'editor' });
    await authorize(deps, { action: 'editorial' });
    deps.findAccount.mockResolvedValue({ ...account, papel: 'editor', situacao: 'bloqueada' });
    await denied(authorize(deps, { action: 'editorial' }), 403);
    expect(deps.findAccount).toHaveBeenCalledTimes(2);
  });
  it('erros de acesso têm classe própria e status sem payload privado', () => {
    expect(new AccessError(403)).toMatchObject({ status: 403, message: 'Acesso negado.' });
  });
});
