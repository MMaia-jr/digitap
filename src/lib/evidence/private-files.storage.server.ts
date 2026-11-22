import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';

/** Storage adapter backed only by the supported Supabase SDK. */
export function createSupabasePrivateFileStorage(client: SupabaseClient, bucketName: string) {
  if (!bucketName || bucketName.trim() !== bucketName) throw new Error('Bucket privado não configurado.');
  const bucket = client.storage.from(bucketName);

  return {
    async signedUpload(key: string) {
      const {data, error} = await bucket.createSignedUploadUrl(key, {upsert: false});
      if (error || !data) throw new Error('Não foi possível iniciar o upload privado.');
      return {url: data.signedUrl, token: data.token};
    },
    async stat(key: string) {
      const {data, error} = await bucket.info(key);
      if (error) {
        const status = Number(error.statusCode ?? error.status);
        if (status === 404) return null;
        throw new Error('Não foi possível consultar o arquivo privado.');
      }
      if (!data) return null;
      const metadata = data.metadata as Record<string, unknown> | null | undefined;
      const contentType = data.contentType ?? (typeof metadata?.mimetype === 'string' ? metadata.mimetype : null);
      const sizeBytes = Number(data.size ?? metadata?.size);
      if (!contentType || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
        throw new Error('Metadados do arquivo privado inválidos.');
      }
      return {contentType, sizeBytes};
    },
    async signedRead(key: string, expiresIn: number) {
      const {data, error} = await bucket.createSignedUrl(key, expiresIn);
      if (error || !data) throw new Error('Não foi possível emitir leitura temporária.');
      return {url: data.signedUrl};
    },
  };
}
