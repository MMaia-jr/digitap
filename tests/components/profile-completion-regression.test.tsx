// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const deps = vi.hoisted(() => ({ currentUser: vi.fn(), account: vi.fn(), personState: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error('redirect:' + path); } }));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: async () => ({}) }));
vi.mock('../../src/lib/supabase/admin.server', () => ({ adminClient: vi.fn() }));
vi.mock('../../src/lib/auth/gateway.server', () => ({ createGateway: () => ({ currentUser: deps.currentUser, account: deps.account }) }));
vi.mock('../../src/lib/auth/person-access.server', () => ({ personState: deps.personState }));
vi.mock('../../src/components/AuthForm', () => ({ AuthForm: ({ mode }: { mode: string }) => <div data-testid={'auth-' + mode} /> }));
import CompletePersonProfile from '../../src/app/cadastro/pessoa-fisica/completar/page';

const identity = { id: '11111111-1111-4111-8111-111111111111', email_confirmed_at: '2026-11-06' };
beforeEach(() => {
  vi.clearAllMocks();
  deps.currentUser.mockResolvedValue(identity);
  deps.account.mockResolvedValue(null);
  deps.personState.mockResolvedValue({ kind: 'ready', person: { nome_publico: 'Pessoa Fictícia' } });
});
afterEach(cleanup);

describe('PF-REG — conclusão explícita não depende do destino pós-login', () => {
  it('identidade confirmada sem vínculo pode escolher completar PF', async () => {
    render(await CompletePersonProfile());
    expect(screen.getByRole('heading', { name: 'Complete seu perfil de pessoa física' })).toBeTruthy();
    expect(screen.getByTestId('auth-complete_pf')).toBeTruthy();
  });
  it('PF existente e válida segue ao próprio espaço, sem recadastro', async () => {
    deps.account.mockResolvedValue({ auth_user_id: identity.id, papel: 'publicador', organizacao_id: null, situacao: 'ativa' });
    await expect(CompletePersonProfile()).rejects.toThrow('redirect:/dashboard/pessoa-fisica');
  });
  it('organização não é convertida em PF', async () => {
    deps.account.mockResolvedValue({ auth_user_id: identity.id, papel: 'organizacao', organizacao_id: 'org-fixture', situacao: 'ativa' });
    await expect(CompletePersonProfile()).rejects.toThrow('redirect:/meu-espaco');
  });
  it('conta bloqueada não acessa o formulário PF', async () => {
    deps.account.mockResolvedValue({ auth_user_id: identity.id, papel: 'publicador', organizacao_id: null, situacao: 'bloqueada' });
    render(await CompletePersonProfile());
    expect(screen.getByRole('heading', { name: 'Acesso indisponível' })).toBeTruthy();
    expect(screen.queryByTestId('auth-complete_pf')).toBeNull();
  });
  it('erro na consulta de conta não é interpretado como ausência de vínculo', async () => {
    deps.account.mockRejectedValue(new Error('detalhe privado'));
    render(await CompletePersonProfile());
    expect(screen.getByRole('heading', { name: 'Serviço indisponível' })).toBeTruthy();
    expect(screen.queryByTestId('auth-complete_pf')).toBeNull();
  });
  it('visitante sem sessão volta ao login', async () => {
    deps.currentUser.mockResolvedValue(null);
    await expect(CompletePersonProfile()).rejects.toThrow('redirect:/login');
  });
});
