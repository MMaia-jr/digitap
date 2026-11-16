// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ list: vi.fn(), viewer: vi.fn() }));
vi.mock('../../src/lib/queries/public.server', () => ({ publicActivities: { list: mocks.list } }));
vi.mock('../../src/components/Viewer.server', () => ({ getViewer: mocks.viewer }));
import Home from '../../src/app/page';
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.viewer.mockResolvedValue({ kind: 'visitor' }); });
const snapshot = { tipo: 'atividade-publica.v2', id: '30000000-0000-4000-8000-000000000001', versao: 1, titulo: 'Oficina comunitária fictícia', descricao: 'Encontro fictício para compartilhar saberes.', inicio_previsto: '2030-04-12T18:30:00.000Z', orientacao_acesso: 'Entrada gratuita fictícia.', referencia_oficial: null, sujeito: { id: '20000000-0000-4000-8000-000000000001', tipo: 'pessoa_fisica', nome_publico: 'Pessoa Fictícia' }, estado_programacao: 'programada', publicada_em: '2026-11-06T03:00:00.000Z' };
const secondSnapshot = { ...snapshot, id: '30000000-0000-4000-8000-000000000002', titulo: 'Roda de conversa fictícia' };
const collectiveSnapshot = { ...snapshot, id: '30000000-0000-4000-8000-000000000003', sujeito: { id: '20000000-0000-4000-8000-000000000002', tipo: 'coletivo_informal', nome_publico: 'Coletivo Fictício' } };
const organizationSnapshot = { tipo: 'atividade-publica.v1', id: '30000000-0000-4000-8000-000000000004', versao: 1, titulo: 'Mutirão fictício', descricao: 'Atividade pública fictícia.', inicio_previsto: '2030-04-12T18:30:00.000Z', orientacao_acesso: 'Entrada gratuita fictícia.', referencia_oficial: null, organizacao: { id: '20000000-0000-4000-8000-000000000003', nome_publico: 'Organização Fictícia' }, estado_programacao: 'programada', publicada_em: '2026-11-06T03:00:00.000Z' };
it('home lista snapshots públicos pelo serviço existente e oferece publicação ao visitante', async () => {
  mocks.list.mockResolvedValue([snapshot]);
  render(await Home());
  expect(mocks.list).toHaveBeenCalledOnce();
  expect(screen.getByRole('link', { name: snapshot.titulo }).getAttribute('href')).toBe('/atividade/' + snapshot.id);
  expect(within(screen.getByRole('region', { name: 'Encontre seu próximo encontro.' })).getByText('Pessoa Fictícia')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Quero publicar uma atividade' }).getAttribute('href')).toBe('/login');
});
it('home vazia convida a participar sem fabricar atividades', async () => {
  mocks.list.mockResolvedValue([]); render(await Home());
  expect(screen.getByRole('heading', { name: 'A Praça está esperando a primeira atividade' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Quero criar uma atividade' }).getAttribute('href')).toBe('/login');
  expect(screen.queryByRole('link', { name: snapshot.titulo })).toBeNull();
  expect(document.querySelector('.activity-grid')).toBeNull();
  expect(screen.queryByText(/Não foi possível carregar as atividades/)).toBeNull();
});
it('consulta indisponível não é apresentada como lista vazia', async () => {
  mocks.list.mockRejectedValue(new Error('fixture'));
  render(await Home()); expect(screen.getByText(/Não foi possível carregar as atividades/)).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'A Praça está esperando a primeira atividade' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Quero criar uma atividade' })).toBeNull();
});
it('pessoa autenticada recebe link de publicação para o dashboard PF', async () => {
  mocks.list.mockResolvedValue([]); mocks.viewer.mockResolvedValue({ kind: 'ready', name: 'Pessoa Fictícia', dashboard: '/dashboard/pessoa-fisica' });
  render(await Home()); expect(screen.getByRole('link', { name: 'Quero publicar uma atividade' }).getAttribute('href')).toBe('/dashboard/pessoa-fisica');
});

it('torna descobrível o publicador de uma atividade por link público ao perfil', async () => {
  mocks.list.mockResolvedValue([snapshot]);
  render(await Home());
  const discovery = screen.getByRole('region', { name: 'Quem faz a Praça' });
  expect(within(discovery).getByRole('link', { name: 'Ver perfil e portfólio de Pessoa Fictícia' }).getAttribute('href')).toBe('/perfil/' + snapshot.sujeito.id);
});

it('deduplica atividades do mesmo publicador e apresenta sujeitos diferentes separadamente', async () => {
  mocks.list.mockResolvedValue([snapshot, secondSnapshot, collectiveSnapshot, organizationSnapshot]);
  render(await Home());
  const discovery = screen.getByRole('region', { name: 'Quem faz a Praça' });
  expect(within(discovery).getAllByRole('link', { name: 'Ver perfil e portfólio de Pessoa Fictícia' })).toHaveLength(1);
  expect(within(discovery).getByRole('link', { name: 'Ver perfil e portfólio de Pessoa Fictícia' }).getAttribute('href')).toBe('/perfil/' + snapshot.sujeito.id);
  expect(within(discovery).getByRole('link', { name: 'Ver perfil e portfólio de Coletivo Fictício' }).getAttribute('href')).toBe('/perfil/' + collectiveSnapshot.sujeito.id);
  expect(within(discovery).getByRole('link', { name: 'Ver perfil e portfólio de Organização Fictícia' }).getAttribute('href')).toBe('/perfil/' + organizationSnapshot.organizacao.id);
  expect(within(discovery).getAllByRole('link')).toHaveLength(3);
});

it('preserva o nome público do primeiro snapshot, que é o mais recente na lista', async () => {
  const latest = { ...snapshot, sujeito: { ...snapshot.sujeito, nome_publico: 'Nome público mais recente' } };
  const older = { ...secondSnapshot, sujeito: { ...secondSnapshot.sujeito, nome_publico: 'Nome público antigo' } };
  mocks.list.mockResolvedValue([latest, older]);
  render(await Home());
  const discovery = screen.getByRole('region', { name: 'Quem faz a Praça' });
  expect(within(discovery).getByRole('link', { name: 'Ver perfil e portfólio de Nome público mais recente' }).getAttribute('href')).toBe('/perfil/' + snapshot.sujeito.id);
  expect(within(discovery).queryByRole('link', { name: 'Ver perfil e portfólio de Nome público antigo' })).toBeNull();
});

it('não inventa sujeitos quando não há atividades públicas', async () => {
  mocks.list.mockResolvedValue([]);
  render(await Home());
  expect(screen.queryByRole('region', { name: 'Quem faz a Praça' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Pessoa Fictícia' })).toBeNull();
});

it('não apresenta ausência de sujeitos como resultado válido quando a consulta pública falha', async () => {
  mocks.list.mockRejectedValue(new Error('fixture'));
  render(await Home());
  expect(screen.getByText(/Não foi possível carregar as atividades/)).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Quem faz a Praça' })).toBeNull();
  expect(screen.queryByText(/Nenhuma pessoa, coletivo ou organização/)).toBeNull();
});

it('mantém a descoberta pública disponível a visitantes e limita a identidade aos campos do snapshot', async () => {
  mocks.list.mockResolvedValue([{ ...snapshot, email_privado: 'nao-exibir@example.invalid', telefone_privado: 'NAO_EXIBIR', sujeito: { ...snapshot.sujeito, documento: 'NAO_EXIBIR', email: 'nao-exibir@example.invalid' } }]);
  render(await Home());
  const discovery = screen.getByRole('region', { name: 'Quem faz a Praça' });
  expect(within(discovery).getByRole('link', { name: 'Ver perfil e portfólio de Pessoa Fictícia' }).getAttribute('href')).toBe('/perfil/' + snapshot.sujeito.id);
  expect(within(discovery).queryByText(/NAO_EXIBIR|nao-exibir/)).toBeNull();
  expect(within(discovery).queryByText(/documento|email|telefone/i)).toBeNull();
});
