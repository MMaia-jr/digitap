// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const deps = vi.hoisted(() => ({ getViewer: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error('redirect:' + path); } }));
vi.mock('../../src/components/Viewer.server', () => ({ getViewer: deps.getViewer }));
vi.mock('../../src/components/AuthForm', () => ({ AuthForm: ({ mode }: { mode: string }) => <button>{mode}</button> }));
import WorkspaceEntry from '../../src/app/meu-espaco/page';
import { AppHeader } from '../../src/components/AppHeader';

beforeEach(() => { vi.clearAllMocks(); deps.getViewer.mockResolvedValue({ kind: 'ready', name: 'Minha conta', dashboard: '/meu-espaco' }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('conta confirmada sem perfil escolhe conscientemente PF ou organização', async () => {
  render(await WorkspaceEntry());
  expect(screen.getByRole('link', { name: 'Completar meu perfil' }).getAttribute('href')).toBe('/cadastro/pessoa-fisica/completar');
  expect(screen.getByRole('link', { name: 'Cadastrar uma organização' }).getAttribute('href')).toBe('/dashboard/organizacao');
});
it('apresenta os sete Taps em linguagem simples e aponta para percursos existentes', async () => {
  render(await WorkspaceEntry());
  const destinations: Record<string, string> = {
    'Completar meu perfil': '/cadastro/pessoa-fisica/completar',
    'Apresentar minhas capacidades': '/meu-espaco/capacidades',
    'Organizar uma ideia': '/meu-espaco/ideia',
    'Preparar uma atividade': '#preparar-atividade',
    'Cadastrar uma organização': '/dashboard/organizacao',
    'Explorar a Biblioteca de Ações': '/biblioteca-acoes',
    'Descobrir atividades e encontros': '#descobrir-publicamente',
  };
  for (const [label, href] of Object.entries(destinations)) {
    const link = screen.getByRole('link', { name: label });
    expect(link.getAttribute('href')).toBe(href);
    expect(link.tagName).toBe('A');
  }
  expect(screen.getByRole('region', { name: 'Preparar uma atividade' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Descobrir atividades e encontros' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Ver atividades publicadas' }).getAttribute('href')).toBe('/atividades');
  expect(screen.getByRole('link', { name: 'Explorar encontros e necessidades' }).getAttribute('href')).toBe('/encontros');
});
it('preparar atividade apresenta os dois primeiros passos permitidos sem conceder representação', async () => {
  render(await WorkspaceEntry());
  expect(screen.getByRole('link', { name: 'Começar como pessoa física' }).getAttribute('href')).toBe('/cadastro/pessoa-fisica/completar');
  expect(screen.getByRole('link', { name: 'Começar como organização' }).getAttribute('href')).toBe('/dashboard/organizacao');
  expect(screen.getByText(/cadastro não concede representação, publicação ou autorização institucional/i)).toBeTruthy();
  expect(screen.getByText(/cadastro autônomo de coletivos ainda não está disponível/i)).toBeTruthy();
});
it('navegação usa links acessíveis e não chama IA nem concede permissões', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(await WorkspaceEntry());
  expect(screen.getByRole('navigation', { name: 'Taps para participar' })).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  for (const link of screen.getAllByRole('link')) expect(link.tagName).toBe('A');
});
it('conta com PF ativa abre apenas o espaço autorizado', async () => {
  deps.getViewer.mockResolvedValue({ kind: 'ready', name: 'Pessoa Fictícia', dashboard: '/dashboard/pessoa-fisica' });
  await expect(WorkspaceEntry()).rejects.toThrow('redirect:/dashboard/pessoa-fisica');
});
it('conta organizacional ativa abre apenas seu espaço autorizado', async () => {
  deps.getViewer.mockResolvedValue({ kind: 'ready', name: 'Organização Fictícia', dashboard: '/dashboard' });
  await expect(WorkspaceEntry()).rejects.toThrow('redirect:/dashboard');
});
it('visitante recebe encaminhamento ao login', async () => {
  deps.getViewer.mockResolvedValue({ kind: 'visitor' });
  await expect(WorkspaceEntry()).rejects.toThrow('redirect:/login');
});
it('falha de consulta não é tratada como conta sem perfil', async () => {
  deps.getViewer.mockResolvedValue({ kind: 'unavailable' });
  render(await WorkspaceEntry());
  expect(screen.getByRole('heading', { name: 'Serviço indisponível' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Cadastrar organização' })).toBeNull();
});
it('navegação autenticada expõe Meu espaço sem alterar os papéis', async () => {
  render(await AppHeader());
  expect(screen.getByRole('link', { name: 'Meu espaço' }).getAttribute('href')).toBe('/meu-espaco');
});
