// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const deps = vi.hoisted(() => ({
  personState: vi.fn(),
  institutionalState: vi.fn(),
  managedProfile: vi.fn(),
  activitiesList: vi.fn(),
  publicPortfolio: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error('redirect:' + path); } }));
vi.mock('../../src/lib/auth/person-access.server', () => ({ personState: deps.personState }));
vi.mock('../../src/lib/auth/dashboard.server', () => ({ institutionalState: deps.institutionalState }));
vi.mock('../../src/lib/queries/projects.server', () => ({ managedProfile: deps.managedProfile }));
vi.mock('../../src/lib/activities/service.server', () => ({ activities: { list: deps.activitiesList } }));
vi.mock('../../src/lib/queries/portfolio.server', () => ({ publicPortfolio: deps.publicPortfolio }));
vi.mock('../../src/components/ConfirmationCounts', () => ({ ConfirmationCounts: () => null }));
vi.mock('../../src/components/CollaborationInvitations', () => ({ CollaborationInvitations: () => null }));
vi.mock('../../src/components/PublisherPresentation', () => ({ PublisherPresentation: () => <div data-testid="publisher-presentation" /> }));
vi.mock('../../src/components/SubmitActivityForm', () => ({ SubmitActivityForm: () => null }));
vi.mock('../../src/components/WorkspaceOverview', () => ({ WorkspaceOverview: () => null }));
vi.mock('../../src/components/PortfolioEvidenceList', () => ({ PortfolioEvidenceList: () => null }));
vi.mock('../../src/components/AuthForm', () => ({ AuthForm: () => null }));

import PersonDashboard from '../../src/app/dashboard/pessoa-fisica/page';
import OrganizationDashboard from '../../src/app/dashboard/page';

beforeEach(() => {
  vi.clearAllMocks();
  deps.personState.mockResolvedValue({ kind: 'ready', person: { sujeito_id: 'person-id', nome_publico: 'Pessoa de teste', estado: 'ativo' } });
  deps.institutionalState.mockResolvedValue({ kind: 'ready', organization: { id: 'org-id', nome_publico: 'Organização de teste', estado_validacao: 'pendente' } });
  deps.managedProfile.mockResolvedValue({ subject: { id: 'subject-id', bio: null }, projects: [] });
  deps.activitiesList.mockResolvedValue([]);
  deps.publicPortfolio.mockResolvedValue({ subject: { id: 'subject-id' }, activities: [], evidence: { unavailable: false, items: [] } });
});
afterEach(cleanup);

it('pessoa física cadastrada encontra os Taps dentro do dashboard autorizado', async () => {
  render(await PersonDashboard({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole('navigation', { name: 'Taps para participar' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Preparar uma atividade' }).getAttribute('href')).toBe('/dashboard/pessoa-fisica/nova');
  expect(screen.getByRole('link', { name: 'Completar meu perfil' }).getAttribute('href')).toBe('#profile-pessoa-fisica');
  expect(screen.getByRole('link', { name: 'Cadastrar uma organização' }).getAttribute('href')).toBe('/cadastro/organizacao');
  expect(screen.getByRole('link', { name: 'Apresentar minhas capacidades' }).getAttribute('href')).toBe('/meu-espaco/capacidades');
  expect(screen.getByRole('link', { name: 'Organizar uma ideia' }).getAttribute('href')).toBe('/meu-espaco/ideia');
  expect(screen.getByText(/navegação não concede escopos, representação ou autorização de publicação/i)).toBeTruthy();
});

it('organização cadastrada encontra os Taps no dashboard com seu destino de atividade', async () => {
  render(await OrganizationDashboard({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole('navigation', { name: 'Taps para participar' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Preparar uma atividade' }).getAttribute('href')).toBe('/dashboard/nova-atividade');
  expect(screen.getByRole('link', { name: 'Completar meu perfil' }).getAttribute('href')).toBe('#profile-organizacao');
  expect(screen.getByRole('link', { name: 'Acessar minha organização' }).getAttribute('href')).toBe('/dashboard/organizacao');
  expect(screen.getByRole('link', { name: 'Apresentar minhas capacidades' }).getAttribute('href')).toBe('/meu-espaco/capacidades');
  expect(screen.getByRole('link', { name: 'Organizar uma ideia' }).getAttribute('href')).toBe('/meu-espaco/ideia');
  expect(screen.getByText(/navegação não concede escopos, representação ou autorização de publicação/i)).toBeTruthy();
});

it('dashboard PF mantém o redirecionamento de visitante ao login e não revela Taps', async () => {
  deps.personState.mockResolvedValue({ kind: 'login' });
  await expect(PersonDashboard({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/login');
});

it('dashboard organizacional mantém o redirecionamento de onboarding', async () => {
  deps.institutionalState.mockResolvedValue({ kind: 'onboarding' });
  await expect(OrganizationDashboard({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/dashboard/organizacao');
});

it.each([
  ['pessoa física', PersonDashboard],
  ['organização', OrganizationDashboard],
])('TAP 08 encaminha %s para selecionar a atividade a acompanhar', async (_name, Dashboard) => {
  deps.activitiesList.mockResolvedValue([{ id: 'activity-id', titulo: 'Oficina de cultura', estado_editorial: 'rascunho', inicio_previsto: '2030-01-01T12:00:00Z' }]);
  const { container } = render(await Dashboard({ searchParams: Promise.resolve({}) }));
  const tap = screen.getByRole('link', { name: 'Acompanhar compromissos e evidências' });
  const target = tap.getAttribute('href');
  expect(target).toBe('#minhas-atividades');
  expect(container.querySelector(target!)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Acompanhar Oficina de cultura' }).getAttribute('href'))
    .toBe('/dashboard/atividade/activity-id#acompanhamento');
});
