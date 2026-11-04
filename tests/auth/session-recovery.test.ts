import { describe, expect, it, vi } from 'vitest';
import { executeAuth, type AuthGateway } from '../../src/lib/auth/flow.server';
import type { AccessAccount } from '../../src/lib/auth/permissions.server';
vi.mock('server-only', () => ({}));
const user = { id: '11111111-1111-4111-8111-111111111111', email_confirmed_at: '2026-11-04' };
const account: AccessAccount = { auth_user_id: user.id, organizacao_id: 'org-ficticia', papel: 'organizacao', situacao: 'ativa' };
const credentials = { email: 'ficticio@example.invalid', password: 'SenhaFicticia123!' };
function fixture() {
  return {
    signUp: vi.fn<AuthGateway['signUp']>().mockResolvedValue({}),
    signIn: vi.fn<AuthGateway['signIn']>().mockResolvedValue({ user, session: true }),
    recover: vi.fn<AuthGateway['recover']>().mockResolvedValue({}),
    verify: vi.fn<AuthGateway['verify']>().mockResolvedValue({ user, session: true }),
    changePassword: vi.fn<AuthGateway['changePassword']>().mockResolvedValue({}),
    logout: vi.fn<AuthGateway['logout']>().mockResolvedValue({}),
    currentUser: vi.fn<AuthGateway['currentUser']>().mockResolvedValue(user),
    account: vi.fn<AuthGateway['account']>().mockResolvedValue(null),
    registerOrganization: vi.fn<AuthGateway['registerOrganization']>().mockResolvedValue({ organizacao_id: account.organizacao_id! }),
  } satisfies AuthGateway;
}

describe('Etapa B — regressões de sessão e retomada com provider/banco simulados', () => {
  it('A03: login com identidade vazia não produz acesso nem consulta conta', async () => {
    const g = fixture(); g.signIn.mockResolvedValue({ user: { ...user, id: '' }, session: true });
    await expect(executeAuth('signin', credentials, g)).rejects.toMatchObject({ status: 401 });
    expect(g.account).not.toHaveBeenCalled(); expect(g.logout).toHaveBeenCalledOnce();
  });
  it('A01: confirmação sem identidade não deixa uma sessão válida', async () => {
    const g = fixture(); g.verify.mockResolvedValue({ user: { ...user, id: '' }, session: true });
    await expect(executeAuth('confirm', { token_hash: 'a'.repeat(64) }, g)).rejects.toMatchObject({ status: 422 });
    expect(g.logout).toHaveBeenCalledOnce();
  });
  it('A05/A07: vínculo não aceita identidade vazia nem consulta banco', async () => {
    const g = fixture(); g.currentUser.mockResolvedValue({ ...user, id: '' });
    await expect(executeAuth('organization', { nome_publico: 'Fictícia' }, g)).rejects.toMatchObject({ status: 401 });
    expect(g.account).not.toHaveBeenCalled(); expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it.each([429, 503])('A08: falha %s de login encerra a sessão parcial', async status => {
    const g = fixture(); g.signIn.mockResolvedValue({ error: { status }, user, session: true });
    await expect(executeAuth('signin', credentials, g)).rejects.toMatchObject({ status });
    expect(g.logout).toHaveBeenCalledOnce();
  });
  it('A08: falha de transporte de login também encerra a sessão', async () => {
    const g = fixture(); g.signIn.mockRejectedValue(new Error('detalhe privado'));
    await expect(executeAuth('signin', credentials, g)).rejects.toMatchObject({ status: 503 });
    expect(g.logout).toHaveBeenCalledOnce();
  });
  it('A01/A08: falha do provider na confirmação limpa a sessão', async () => {
    const g = fixture(); g.verify.mockResolvedValue({ error: { status: 503 }, user, session: true });
    await expect(executeAuth('confirm', { token_hash: 'a'.repeat(64) }, g)).rejects.toMatchObject({ status: 503 });
    expect(g.logout).toHaveBeenCalledOnce();
  });
  it('A04: exceção na confirmação também limpa a sessão', async () => {
    const g = fixture(); g.verify.mockRejectedValue(new Error('detalhe privado'));
    await expect(executeAuth('confirm', { token_hash: 'a'.repeat(64) }, g)).rejects.toMatchObject({ status: 503 });
    expect(g.logout).toHaveBeenCalledOnce();
  });
  it('A01: confirmação sem sessão não preserva dados parciais', async () => {
    const g = fixture(); g.verify.mockResolvedValue({ user, session: false });
    await expect(executeAuth('confirm', { token_hash: 'a'.repeat(64) }, g)).rejects.toMatchObject({ status: 422 });
    expect(g.logout).toHaveBeenCalledOnce();
  });
  it('confirmação bem-sucedida mantém a sessão para onboarding', async () => {
    const g = fixture();
    expect(await executeAuth('confirm', { token_hash: 'a'.repeat(64) }, g)).toMatchObject({ next: '/dashboard/organizacao' });
    expect(g.logout).not.toHaveBeenCalled();
  });
  it('login bem-sucedido mantém a sessão própria ativa', async () => {
    const g = fixture(); g.account.mockResolvedValue(account);
    expect(await executeAuth('signin', credentials, g)).toMatchObject({ next: '/dashboard' });
    expect(g.logout).not.toHaveBeenCalled();
  });
  it('repetir cadastro já vinculado não escreve novamente nem depende da RPC', async () => {
    const g = fixture(); g.account.mockResolvedValue(account);
    g.registerOrganization.mockRejectedValue(new Error('RPC indisponível'));
    expect(await executeAuth('organization', { nome_publico: 'Nome de retry' }, g)).toMatchObject({ next: '/dashboard' });
    expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it('retoma após resposta perdida do vínculo sem recriar identidade/organização', async () => {
    const g = fixture();
    g.account.mockResolvedValueOnce(null).mockResolvedValueOnce(account);
    g.registerOrganization.mockRejectedValueOnce(new Error('resposta perdida após commit simulado'));
    await expect(executeAuth('organization', { nome_publico: 'Fictícia' }, g)).rejects.toMatchObject({ status: 503 });
    expect(await executeAuth('organization', { nome_publico: 'Fictícia' }, g)).toMatchObject({ next: '/dashboard' });
    expect(g.registerOrganization).toHaveBeenCalledOnce(); expect(g.signUp).not.toHaveBeenCalled();
  });
  it.each(['editor', 'administrador'] as const)('retry não converte conta %s em organização', async papel => {
    const g = fixture(); g.account.mockResolvedValue({ ...account, papel });
    await expect(executeAuth('organization', { nome_publico: 'Fictícia' }, g)).rejects.toMatchObject({ status: 403 });
    expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it.each(['bloqueada', 'desativada'] as const)('retry não reativa conta %s', async situacao => {
    const g = fixture(); g.account.mockResolvedValue({ ...account, situacao });
    await expect(executeAuth('organization', { nome_publico: 'Fictícia' }, g)).rejects.toMatchObject({ status: 403 });
    expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it('pedidos paralelos encaminham a identidade verificada; unicidade do banco segue NOT RUN', async () => {
    const g = fixture();
    const requests = await Promise.all(Array.from({ length: 4 }, () => executeAuth('organization', { nome_publico: 'Fictícia' }, g)));
    expect(requests.every(result => result.next === '/dashboard')).toBe(true);
    expect(g.registerOrganization).toHaveBeenCalledTimes(4);
    for (const call of g.registerOrganization.mock.calls) expect(call).toEqual([user.id, 'Fictícia']);
    expect(g.signUp).not.toHaveBeenCalled();
  });
});

describe('A04: identidade no fluxo de recuperação simulado', () => {
  it('OTP sem identidade não permite alterar senha e encerra sessão temporária', async () => {
    const g = fixture(); g.verify.mockResolvedValue({ user: { ...user, id: '' }, session: true });
    await expect(executeAuth('reset', { token_hash: 'a'.repeat(64), password: credentials.password }, g)).rejects.toMatchObject({ status: 422 });
    expect(g.changePassword).not.toHaveBeenCalled(); expect(g.logout).toHaveBeenCalledOnce();
  });
});
