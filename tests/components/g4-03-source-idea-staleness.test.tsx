// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const deps = vi.hoisted(() => ({
  personState: vi.fn(), userClient: vi.fn(), getIdea: vi.fn(), managedProfile: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children as never}</a> }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error('redirect:' + path); },
  notFound: () => { throw new Error('not-found'); },
}));
vi.mock('../../src/lib/auth/person-access.server', () => ({ personState: deps.personState }));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: deps.userClient }));
vi.mock('../../src/lib/ideas/service.server', () => ({
  createIdeasService: () => ({ get: deps.getIdea }),
  ideaView: (idea: Record<string, unknown>) => { const { owner_id: _owner, ...view } = idea; void _owner; return view; },
}));
vi.mock('../../src/lib/queries/projects.server', () => ({ managedProfile: deps.managedProfile }));
vi.mock('../../src/components/ActivityForm', () => ({ ActivityForm: () => <div data-testid="activity-form" /> }));
vi.mock('../../src/lib/actions/catalog', () => ({ actionTemplates: [] }));

import NewPersonActivity from '../../src/app/dashboard/pessoa-fisica/nova/page';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const interpretation = {
  estado: 'revisao_humana_pendente', verificacao: 'nao_verificada',
  dados: { atividades: [{ descricao: 'Oficina da versão antiga', trecho: 'oficina' }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  deps.personState.mockResolvedValue({ kind: 'ready', person: { sujeito_id: 'pf-test' } });
  deps.userClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'owner-test', email_confirmed_at: '2026-11-23T12:00:00Z' } }, error: null }) } });
  deps.managedProfile.mockResolvedValue({ availableProjects: [] });
  deps.getIdea.mockResolvedValue({
    id, owner_id: 'owner-test', title: 'Ideia revisada', original_text: 'A oficina será realizada.',
    revised_text: 'A oficina foi cancelada. Quero organizar uma feira.',
    original_interpretation: interpretation, revised_interpretation: null, version: 2,
  });
});
afterEach(cleanup);

it('não reapresenta sugestão da versão antiga ao preparar atividade após revisão manual', async () => {
  render(await NewPersonActivity({ searchParams: Promise.resolve({ ideia: id }) }));
  expect(screen.getByRole('heading', { name: 'Usar ideia para criar atividade' })).toBeTruthy();
  expect(screen.getByText(/A oficina foi cancelada/)).toBeTruthy();
  expect(screen.queryByText('Oficina da versão antiga')).toBeNull();
  expect(screen.getByText(/texto revisado ainda não possui sugestões atualizadas/)).toBeTruthy();
  expect(screen.getByTestId('activity-form')).toBeTruthy();
  expect(deps.getIdea).toHaveBeenCalledWith('owner-test', id);
});


it('mantém as sugestões revisadas pela pessoa quando a interpretação atual existe', async () => {
  deps.getIdea.mockResolvedValue({
    id, owner_id: 'owner-test', title: 'Ideia revista com interpretação',
    original_text: 'A oficina será realizada.', revised_text: 'Oficina revisada.',
    original_interpretation: interpretation,
    revised_interpretation: {
      ...interpretation,
      dados: { atividades: [{ descricao: 'Oficina revisada pela pessoa', trecho: 'Oficina' }] },
    },
    version: 2,
  });
  render(await NewPersonActivity({ searchParams: Promise.resolve({ ideia: id }) }));
  expect(screen.getByText('Oficina revisada pela pessoa')).toBeTruthy();
  expect(screen.queryByText('Oficina da versão antiga')).toBeNull();
});
