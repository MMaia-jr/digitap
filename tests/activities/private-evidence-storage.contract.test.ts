import {describe, expect, it, vi} from 'vitest';
vi.mock('server-only', () => ({}));

import {createSupabasePrivateFileStorage} from '../../src/lib/evidence/private-files.storage.server';

const KEY = 'evidencias/33333333-3333-4333-8333-333333333333/arquivo-sintetico';
const BUCKET = 'oss01c-test-private';

function fixture() {
  const storageFile = {
    createSignedUploadUrl: vi.fn(async () => ({
      data: {signedUrl: 'http://127.0.0.1:56151/storage/v1/object/upload/sign/fixture?token=synthetic', token: 'synthetic', path: KEY},
      error: null,
    })),
    info: vi.fn(async () => ({
      data: {size: 128, contentType: 'image/png', metadata: {mimetype: 'image/png'}},
      error: null,
    })),
    createSignedUrl: vi.fn(async () => ({
      data: {signedUrl: 'http://127.0.0.1:56151/storage/v1/object/sign/fixture?token=synthetic'},
      error: null,
    })),
  };
  const client = {storage: {from: vi.fn(() => storageFile)}};
  return {client, storageFile};
}

describe('OSS-01C — adaptador Supabase Storage', () => {
  it('emite upload assinado não substituível usando o SDK e retorna o token para uploadToSignedUrl', async () => {
    const f = fixture();
    const storage = createSupabasePrivateFileStorage(f.client as never, BUCKET);

    await expect(storage.signedUpload(KEY)).resolves.toEqual({
      url: 'http://127.0.0.1:56151/storage/v1/object/upload/sign/fixture?token=synthetic',
      token: 'synthetic',
    });
    expect(f.client.storage.from).toHaveBeenCalledWith(BUCKET);
    expect(f.storageFile.createSignedUploadUrl).toHaveBeenCalledWith(KEY, {upsert: false});
  });

  it('consulta metadados reais de objeto pelo método info do SDK', async () => {
    const f = fixture();
    const storage = createSupabasePrivateFileStorage(f.client as never, BUCKET);

    await expect(storage.stat(KEY)).resolves.toEqual({contentType: 'image/png', sizeBytes: 128});
    expect(f.storageFile.info).toHaveBeenCalledWith(KEY);
  });

  it('emite URL de leitura temporária somente pelo SDK e respeita o TTL recebido', async () => {
    const f = fixture();
    const storage = createSupabasePrivateFileStorage(f.client as never, BUCKET);

    await expect(storage.signedRead(KEY, 300)).resolves.toEqual({
      url: 'http://127.0.0.1:56151/storage/v1/object/sign/fixture?token=synthetic',
    });
    expect(f.storageFile.createSignedUrl).toHaveBeenCalledWith(KEY, 300);
  });

  it('trata somente objeto ausente como null e propaga falha técnica para sanitização do serviço', async () => {
    const f = fixture();
    const storage = createSupabasePrivateFileStorage(f.client as never, BUCKET);
    f.storageFile.info.mockResolvedValueOnce({data: null, error: Object.assign(new Error('ausente'), {status: 404})} as never);
    await expect(storage.stat(KEY)).resolves.toBeNull();
    f.storageFile.info.mockResolvedValueOnce({data: null, error: Object.assign(new Error('interno'), {status: 503})} as never);
    await expect(storage.stat(KEY)).rejects.toThrow();
  });
});
