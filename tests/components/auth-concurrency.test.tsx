// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AuthForm } from '../../src/components/AuthForm';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('cadastro: requisições concorrentes no componente simulado', () => {
  it('dois submits no mesmo instante fazem um POST e uma nova tentativa é permitida após erro', async () => {
    let release!: (response: { ok: boolean; json: () => Promise<{ message: string }> }) => void;
    const fetcher = vi.fn().mockImplementation(() => new Promise(resolve => { release = resolve; }));
    vi.stubGlobal('fetch', fetcher); render(<AuthForm mode="organization" />);
    fireEvent.change(screen.getByLabelText('Nome público da organização'), { target: { value: 'Fictícia' } });
    const form = screen.getByRole('button', { name: 'Vincular organização' }).closest('form')!;
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => { release({ ok: false, json: async () => ({ message: 'Falha temporária.' }) }); });
    fireEvent.submit(form); expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => { release({ ok: false, json: async () => ({ message: 'Falha temporária.' }) }); });
  });
});
