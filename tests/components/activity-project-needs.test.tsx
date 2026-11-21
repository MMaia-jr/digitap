// @vitest-environment jsdom
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import ActivityDetail from '../../src/app/dashboard/atividade/[id]/page';

const mocks = vi.hoisted(() => ({activity: vi.fn(), profile: vi.fn()}));
vi.mock('../../src/lib/activities/service.server', () => ({
  activities: {get: mocks.activity, getRecord: async () => null},
}));
vi.mock('../../src/lib/queries/projects.server', () => ({managedProfile: mocks.profile}));

const id = '10000000-0000-4000-8000-000000000001';
const project = {id: '10000000-0000-4000-8000-000000000002', titulo: 'Projeto fictício'};
const link = {name: 'Gerenciar necessidades do projeto'};
const activity = {
  id, titulo: 'Oficina fictícia', descricao: 'Relato de demonstração.',
  orientacao_acesso: 'Acesso local', inicio_previsto: '2030-01-10T12:00:00Z',
  estado_editorial: 'publicada', versao_submetida: 1, projeto_id: project.id,
  pode_editar: true,
};

beforeEach(() => {
  mocks.activity.mockResolvedValue(activity);
  mocks.profile.mockResolvedValue({
    subject: {tipo: 'organizacao'}, projects: [project], availableProjects: [project],
  });
});
afterEach(cleanup);

async function openActivity() {
  render(await ActivityDetail({params: Promise.resolve({id})}));
}

it('links the organization activity to its managed project needs', async () => {
  await openActivity();
  expect(screen.getByRole('link', link).getAttribute('href'))
    .toBe(`/dashboard/projetos/${project.id}/necessidades`);
});

it('withholds the management link when the project is only available via collaboration', async () => {
  mocks.profile.mockResolvedValue({
    subject: {tipo: 'pessoa_fisica'}, projects: [], availableProjects: [project],
  });
  await openActivity();
  expect(screen.queryByRole('link', link)).toBeNull();
});

it('withholds the management link when there is no associated project', async () => {
  mocks.activity.mockResolvedValue({...activity, projeto_id: null});
  await openActivity();
  expect(screen.queryByRole('link', link)).toBeNull();
});
