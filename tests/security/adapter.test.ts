import { describe, it, expect, vi } from 'vitest';
import { createAccessDependencies } from '../../src/lib/auth/supabase-access.server';
vi.mock('server-only', () => ({}));
describe('adapter Supabase server-only', () => {
  const setup = () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'ficticio' } }, error: null });
    return { getUser, from, select, eq, maybeSingle, deps: createAccessDependencies({ auth: { getUser } } as never, { from } as never) };
  };
  it('verifica usuário com Auth, sem confiar em sessão do navegador', async () => {
    const { deps, getUser } = setup();
    expect(await deps.verifyUser()).toEqual({ id: 'ficticio' });
    expect(getUser).toHaveBeenCalledOnce();
  });
  it('busca somente os campos de autorização e filtra identidade verificada', async () => {
    const { deps, from, select, eq } = setup();
    expect(await deps.findAccount('ficticio')).toBeNull();
    expect(from).toHaveBeenCalledWith('contas_acesso');
    expect(select).toHaveBeenCalledWith('auth_user_id,organizacao_id,papel,situacao');
    expect(eq).toHaveBeenCalledWith('auth_user_id', 'ficticio');
  });
  it('JWT inválido é tratado como ausência de autenticação', async () => {
    const { deps, getUser } = setup();
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } } as never);
    expect(await deps.verifyUser()).toBeNull();
  });
  it('falha do Auth não se transforma em autorização', async () => {
    const { deps, getUser } = setup();
    getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } } as never);
    await expect(deps.verifyUser()).rejects.toThrow();
  });
  it('erro de consulta não é confundido com conta inexistente', async () => {
    const { deps, maybeSingle } = setup();
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'detalhe privado' } } as never);
    await expect(deps.findAccount('ficticio')).rejects.toThrow('Consulta indisponível.');
  });
});
