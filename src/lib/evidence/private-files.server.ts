import 'server-only';
import { randomUUID } from 'node:crypto';

type Scope = 'upload' | 'read';
type Metadata = { registroId: string; objectKey: string; contentType: string; sizeBytes: number };
type PrivateFile = Metadata & { id: string; estado: 'pendente' | 'confirmado' };
interface Dependencies {
  verifyActor(): Promise<string | null>;
  authorize(input: { actorId: string; registroId: string; scope: Scope }): Promise<boolean>;
  repository: {
    insertPending(metadata: Metadata): Promise<PrivateFile>;
    find(id: string): Promise<PrivateFile | null>;
    markConfirmed(id: string): Promise<PrivateFile>;
  };
  storage: {
    signedUpload(key: string): Promise<{ url: string }>;
    stat(key: string): Promise<{ contentType: string; sizeBytes: number } | null>;
    signedRead(key: string, expiresIn: number): Promise<{ url: string }>;
  };
}

class PrivateFileError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
function parameters(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))
    || Reflect.ownKeys(value).some(key => typeof key !== 'string' || !allowed.includes(key))) {
    throw new PrivateFileError(400, 'Pedido inválido.');
  }
  return value as Record<string, unknown>;
}
function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new PrivateFileError(400, 'Identificador inválido.');
  }
  return value.toLowerCase();
}

// Fronteira experimental: nenhum adaptador real, persistência ou autoridade editorial aqui.
export function createPrivateFileService(deps: Dependencies) {
  async function run<T>(operation: (actorId: string) => Promise<T>): Promise<T> {
    try {
      const actorId = await deps.verifyActor();
      if (!actorId) throw new PrivateFileError(401, 'Entre na sua conta para continuar.');
      return await operation(actorId);
    } catch (error) {
      if (error instanceof PrivateFileError) throw error;
      throw new PrivateFileError(503, 'Serviço indisponível. Tente novamente.');
    }
  }
  async function authorize(actorId: string, registroId: string, scope: Scope) {
    if (await deps.authorize({ actorId, registroId, scope }) !== true) {
      throw new PrivateFileError(403, 'Você não tem autorização para este registro.');
    }
  }
  async function authorizedFile(actorId: string, input: unknown, scope: Scope) {
    const { arquivoId } = parameters(input, ['arquivoId']);
    const file = await deps.repository.find(identifier(arquivoId));
    if (!file) throw new PrivateFileError(404, 'Arquivo não encontrado.');
    await authorize(actorId, file.registroId, scope);
    return file;
  }

  return {
    async iniciarUpload(input: unknown) {
      return run(async actorId => {
        const body = parameters(input, ['registroId', 'contentType', 'sizeBytes']);
        const registroId = identifier(body.registroId);
        if (typeof body.contentType !== 'string' || body.contentType.length > 255
          || !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i.test(body.contentType)
          || typeof body.sizeBytes !== 'number' || !Number.isSafeInteger(body.sizeBytes) || body.sizeBytes <= 0) {
          throw new PrivateFileError(422, 'Tipo ou tamanho de arquivo inválido.');
        }
        await authorize(actorId, registroId, 'upload');
        const objectKey = `evidencias/${registroId}/${randomUUID()}`;
        const file = await deps.repository.insertPending({
          registroId, objectKey, contentType: body.contentType, sizeBytes: body.sizeBytes,
        });
        const upload = await deps.storage.signedUpload(objectKey);
        return { arquivoId: file.id, objectKey, uploadUrl: upload.url };
      });
    },
    async confirmarUpload(input: unknown) {
      return run(async actorId => {
        const file = await authorizedFile(actorId, input, 'upload');
        if (file.estado !== 'pendente') throw new PrivateFileError(409, 'Arquivo não está pendente.');
        const actual = await deps.storage.stat(file.objectKey);
        if (!actual || actual.contentType !== file.contentType || actual.sizeBytes !== file.sizeBytes) {
          throw new PrivateFileError(422, 'Arquivo ausente ou incompatível com o upload solicitado.');
        }
        await deps.repository.markConfirmed(file.id);
        return { estado: 'confirmado' as const };
      });
    },
    async obterUrlLeitura(input: unknown) {
      return run(async actorId => {
        const file = await authorizedFile(actorId, input, 'read');
        if (file.estado !== 'confirmado') throw new PrivateFileError(409, 'Arquivo ainda não confirmado.');
        const expiresIn = 300;
        const signed = await deps.storage.signedRead(file.objectKey, expiresIn);
        return { url: signed.url, expiresIn };
      });
    },
  };
}
