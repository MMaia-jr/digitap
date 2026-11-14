import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityError } from '../../src/lib/activities/domain';

const mocks = vi.hoisted(() => ({ read: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/activities/service.server', () => ({ activities: { realizationActivity: mocks.read } }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock('../../src/components/RealizationForm', () => ({
  RealizationForm: ({ id, version }: { id: string; version: number }) => <form data-activity={id} data-version={version}>FORMULARIO_FICTICIO</form>,
}));
import EvidencePage from '../../src/app/dashboard/pessoa-fisica/atividade/[id]/evidencia/page';

const id = '10000000-0000-4000-8000-000000000001';
const startsAt = '2026-11-13T12:00:00.000Z';
const activity = { id, titulo: 'Encontro fictício', inicio_previsto: startsAt, versao_submetida: 2, registro_estado: null };
async function page() {
  return renderToStaticMarkup(await EvidencePage({ params: Promise.resolve({ id }) }));
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(startsAt));
  mocks.read.mockResolvedValue({ ...activity });
  mocks.redirect.mockImplementation(() => { throw new Error('NEXT_REDIRECT_FIXTURE'); });
  mocks.notFound.mockImplementation(() => { throw new Error('NEXT_NOT_FOUND_FIXTURE'); });
});
afterEach(() => vi.useRealTimers());

describe('PF evidence page — server authorization and temporal boundary', () => {
  it.each([
    [-1, false], [0, true], [1, true],
  ] as const)('%s ms from start: form eligibility %s', async (offset, allowed) => {
    vi.setSystemTime(new Date(Date.parse(startsAt) + offset));
    const html = await page();
    expect(mocks.read).toHaveBeenCalledExactlyOnceWith(id);
    expect(html.includes('FORMULARIO_FICTICIO')).toBe(allowed);
    expect(html.includes('O encontro ainda está por vir')).toBe(!allowed);
    if (allowed) {
      expect(html).toContain(`data-activity="${id}"`);
      expect(html).toContain('data-version="2"');
      expect(html).toContain('Seu envio fica privado até aprovação editorial.');
    }
  });
  it('a subsequent request observes the boundary without reusing a cached clock', async () => {
    vi.setSystemTime(new Date(Date.parse(startsAt) - 1));
    expect(await page()).not.toContain('FORMULARIO_FICTICIO');
    vi.setSystemTime(new Date(startsAt));
    expect(await page()).toContain('FORMULARIO_FICTICIO');
    expect(mocks.read).toHaveBeenCalledTimes(2);
  });
  it('already recorded activity never offers another form, even before start', async () => {
    vi.setSystemTime(new Date(Date.parse(startsAt) - 1));
    mocks.read.mockResolvedValue({ ...activity, registro_estado: 'rascunho' });
    const html = await page();
    expect(html).toContain('✓ Evidência registrada');
    expect(html).not.toContain('FORMULARIO_FICTICIO');
    expect(html).not.toContain('O encontro ainda está por vir');
  });
  it.each(['invalid-date', '', undefined, null])('invalid or missing date %s fails closed', async inicio_previsto => {
    mocks.read.mockResolvedValue({ ...activity, inicio_previsto });
    const html = await page();
    expect(html).toContain('Registro indisponível');
    expect(html).not.toContain('FORMULARIO_FICTICIO');
  });
  it.each([{}, null, { ...activity, id: undefined }, { ...activity, versao_submetida: undefined }])('incomplete activity fails closed: %j', async value => {
    mocks.read.mockResolvedValue(value);
    const html = await page();
    expect(html).toContain('Registro indisponível');
    expect(html).not.toContain('FORMULARIO_FICTICIO');
  });
  it('unauthenticated access still redirects to login', async () => {
    mocks.read.mockRejectedValue(new ActivityError(401, 'Fixture'));
    await expect(page()).rejects.toThrow('NEXT_REDIRECT_FIXTURE');
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith('/login');
  });
  it('activity outside scope still returns not found', async () => {
    mocks.read.mockRejectedValue(new ActivityError(404, 'Fixture'));
    await expect(page()).rejects.toThrow('NEXT_NOT_FOUND_FIXTURE');
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
  it.each([403, 409, 503])('server rejection %s never exposes the form', async status => {
    mocks.read.mockRejectedValue(new ActivityError(status as 403 | 409 | 503, 'Fixture'));
    const html = await page();
    expect(html).toContain('Registro indisponível');
    expect(html).not.toContain('FORMULARIO_FICTICIO');
    expect(html).toContain('href="/dashboard/pessoa-fisica"');
  });
});
