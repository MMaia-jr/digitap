// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ list: vi.fn(), viewer: vi.fn() }));
vi.mock('../../src/lib/queries/public.server', () => ({ publicActivities: { list: mocks.list } }));
vi.mock('../../src/components/Viewer.server', () => ({ getViewer: mocks.viewer }));
import Home from '../../src/app/page';
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.viewer.mockResolvedValue({ kind: 'visitor' }); });
const snapshot = { tipo: 'atividade-publica.v2', id: '30000000-0000-4000-8000-000000000001', versao: 1, titulo: 'Oficina comunitária fictícia', descricao: 'Encontro fictício para compartilhar saberes.', inicio_previsto: '2030-04-12T18:30:00.000Z', orientacao_acesso: 'Entrada gratuita fictícia.', referencia_oficial: null, sujeito: { id: '20000000-0000-4000-8000-000000000001', tipo: 'pessoa_fisica', nome_publico: 'Pessoa Fictícia' }, estado_programacao: 'programada', publicada_em: '2026-11-06T03:00:00.000Z' };
it('home lista snapshots públicos pelo serviço existente e oferece publicação ao visitante', async () => {
  mocks.list.mockResolvedValue([snapshot]);
  render(await Home());
  expect(mocks.list).toHaveBeenCalledOnce();
  expect(screen.getByRole('link', { name: snapshot.titulo }).getAttribute('href')).toBe('/atividade/' + snapshot.id);
  expect(screen.getByText('Pessoa Fictícia')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Quero publicar uma atividade' }).getAttribute('href')).toBe('/login');
});
it('home vazia convida a participar sem fabricar atividades', async () => {
  mocks.list.mockResolvedValue([]); render(await Home());
  expect(screen.getByText(/A Praça está sendo construída/)).toBeTruthy();
});
it('consulta indisponível não é apresentada como lista vazia', async () => {
  mocks.list.mockRejectedValue(new Error('fixture'));
  render(await Home()); expect(screen.getByText(/Não foi possível carregar as atividades/)).toBeTruthy();
  expect(screen.queryByText(/A Praça está sendo construída/)).toBeNull();
});
it('pessoa autenticada recebe link de publicação para o dashboard PF', async () => {
  mocks.list.mockResolvedValue([]); mocks.viewer.mockResolvedValue({ kind: 'ready', name: 'Pessoa Fictícia', dashboard: '/dashboard/pessoa-fisica' });
  render(await Home()); expect(screen.getByRole('link', { name: 'Quero publicar uma atividade' }).getAttribute('href')).toBe('/dashboard/pessoa-fisica');
});
