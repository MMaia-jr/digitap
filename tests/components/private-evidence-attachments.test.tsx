// @vitest-environment jsdom
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const {uploadToSignedUrl, from} = vi.hoisted(() => ({
  uploadToSignedUrl: vi.fn(),
  from: vi.fn(),
}));
from.mockImplementation(() => ({uploadToSignedUrl}));
vi.mock('../../src/lib/supabase/browser', () => ({browserClient: () => ({storage: {from}})}));

import {PrivateEvidenceAttachments} from '../../src/components/PrivateEvidenceAttachments';

const recordId = '55555555-5555-4555-8555-555555555555';
const fileId = '66666666-6666-4666-8666-666666666666';
const key = `evidencias/${recordId}/fixture`;

beforeEach(() => { from.mockImplementation(() => ({uploadToSignedUrl})); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe('INC-OSS-01D — anexos privados no registro de realização', () => {
  it('envia bytes pelo SDK, confirma e mostra o anexo sem expor token ou URL assinada', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({arquivos: []}))
      .mockResolvedValueOnce(Response.json({arquivo: {id: fileId, objectKey: key, uploadToken: 'synthetic-token', bucket: 'oss01d-private-test'}}))
      .mockResolvedValueOnce(Response.json({estado: 'confirmado'}))
      .mockResolvedValueOnce(Response.json({arquivos: [{id: fileId, contentType: 'image/png', sizeBytes: 7, estado: 'confirmado'}]}));
    vi.stubGlobal('fetch', fetcher);
    uploadToSignedUrl.mockResolvedValue({data: {path: key}, error: null});
    render(<PrivateEvidenceAttachments registroId={recordId} canUpload/>);

    const file = new File(['PNGTEST'], 'evidencia-sintetica.png', {type: 'image/png'});
    fireEvent.change(await screen.findByLabelText('Arquivo de evidência privada'), {target: {files: [file]}});
    fireEvent.click(screen.getByRole('button', {name: 'Enviar evidência privada'}));

    await screen.findByRole('link', {name: 'Abrir anexo privado'});
    expect(from).toHaveBeenCalledWith('oss01d-private-test');
    expect(uploadToSignedUrl).toHaveBeenCalledWith(key, 'synthetic-token', file, {contentType: 'image/png', upsert: false});
    expect(fetcher.mock.calls.map(([, options]) => options?.method ?? 'GET')).toEqual(['GET', 'POST', 'POST', 'GET']);
    const html = document.body.innerHTML;
    expect(html).not.toContain('synthetic-token');
    expect(html).not.toContain('signedUrl');
    expect(html).not.toContain(key);
  });

  it('preserva a seleção e mostra erro recuperável quando a rede falha antes da confirmação', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({arquivos: []}))
      .mockResolvedValueOnce(Response.json({arquivo: {id: fileId, objectKey: key, uploadToken: 'synthetic-token', bucket: 'oss01d-private-test'}})));
    uploadToSignedUrl.mockResolvedValue({data: null, error: new Error('falha sintética de rede')});
    render(<PrivateEvidenceAttachments registroId={recordId} canUpload/>);
    const input = await screen.findByLabelText('Arquivo de evidência privada') as HTMLInputElement;
    const file = new File(['PNGTEST'], 'evidencia-sintetica.png', {type: 'image/png'});
    fireEvent.change(input, {target: {files: [file]}});
    fireEvent.click(screen.getByRole('button', {name: 'Enviar evidência privada'}));
    expect((await screen.findByRole('alert')).textContent).toContain('Não foi possível enviar o arquivo. Você pode tentar novamente.');
    expect(input.files?.[0]).toBe(file);
    expect(screen.queryByRole('link', {name: 'Abrir anexo privado'})).toBeNull();
  });

  it('não apresenta controles de upload para leitura sem escopo editar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({arquivos: []})));
    render(<PrivateEvidenceAttachments registroId={recordId} canUpload={false}/>);
    await waitFor(() => expect(screen.queryByText('Carregando anexos privados…')).toBeNull());
    expect(screen.queryByLabelText('Arquivo de evidência privada')).toBeNull();
    expect(screen.queryByRole('button', {name: 'Enviar evidência privada'})).toBeNull();
  });
});
