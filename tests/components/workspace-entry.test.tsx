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
afterEach(cleanup);

it('conta confirmada sem perfil escolhe conscientemente PF ou organização', async () => {
  render(await WorkspaceEntry());
  expect(screen.getByRole('link', { name: 'Continuar como pessoa física' }).getAttribute('href')).toBe('/cadastro/pessoa-fisica/completar');
  expect(screen.getByRole('link', { name: 'Cadastrar organização' }).getAttribute('href')).toBe('/dashboard/organizacao');
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
