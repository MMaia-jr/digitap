import 'server-only';
import { randomUUID } from 'node:crypto';

// Política técnica provisória; requer validação de produto e enforcement no Storage.
const MAX_PRIVATE_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_PRIVATE_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

type Scope = 'upload' | 'read';
type Metadata = { registroId: string; objectKey: string; contentType: string; sizeBytes: number };
type PrivateFile = Metadata & { id: string; estado: 'pendente' | 'confirmado' };
interface Dependencies {
  verifyActor(): Promise<string | null>;
  authorize(input: { actorId: string; registroId: string; scope: Scope }): Promise<boolean>;
  repository: {
    insertPending(metadata: Metadata, actorId: string): Promise<PrivateFile>;
    listConfirmed(input: {actorId: string; registroId: string}): Promise<Array<{id: string; contentType: string; sizeBytes: number}>>;
    // Adaptadores existentes podem ainda não implementar a compensação;
    // integração real exige remoção condicional de metadados ainda pendentes.
    deletePending?(id: string): Promise<void>;
    find(id: string): Promise<PrivateFile | null>;
    markConfirmed(input: { actorId: string; arquivoId: string; registroId: string }): Promise<PrivateFile>;
  };
  storage: {
    signedUpload(key: string): Promise<{ url: string; token: string }>;
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

// O serviço recebe os adaptadores por injeção e opera fora do fluxo editorial.
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
        if (typeof body.contentType !== 'string'
          || !ALLOWED_PRIVATE_FILE_TYPES.has(body.contentType)
          || typeof body.sizeBytes !== 'number'
          || !Number.isSafeInteger(body.sizeBytes)
          || body.sizeBytes <= 0
          || body.sizeBytes > MAX_PRIVATE_FILE_BYTES) {
          throw new PrivateFileError(422, 'Tipo ou tamanho de arquivo inválido.');
        }
        await authorize(actorId, registroId, 'upload');
        const objectKey = `evidencias/${registroId}/${randomUUID()}`;
        let file: PrivateFile;
        try {
          file = await deps.repository.insertPending({
            registroId, objectKey, contentType: body.contentType, sizeBytes: body.sizeBytes,
          }, actorId);
        } catch (error) {
          if (error instanceof Error && 'status' in error && error.status === 403) {
            throw new PrivateFileError(403, 'Você não tem autorização para este registro.');
          }
          throw error;
        }
        let upload: { url: string; token: string };
        try {
          upload = await deps.storage.signedUpload(objectKey);
        } catch {
          // Compensação apenas do registro pendente recém-criado, jamais do objeto no Storage.
          // Se falhar ou não existir no adaptador, é necessária reconciliação posterior.
          try {
            await deps.repository.deletePending?.(file.id);
          } catch {
            // Não expor detalhes do adaptador nem alegar que a limpeza ocorreu.
          }
          throw new PrivateFileError(503, 'Serviço indisponível. Tente novamente.');
        }
        return { arquivoId: file.id, objectKey, uploadUrl: upload.url, uploadToken: upload.token };
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
        // O acesso pode ter sido revogado durante o stat externo.
        // Esta segunda checagem ainda não substitui a autorização atômica no banco.
        await authorize(actorId, file.registroId, 'upload');
        try {
          // O adaptador deve garantir CAS atômico pendente -> confirmado.
          await deps.repository.markConfirmed({ actorId, arquivoId: file.id, registroId: file.registroId });
        } catch (error) {
          if (error instanceof Error && 'status' in error) {
            if (error.status === 403) throw new PrivateFileError(403, 'Você não tem autorização para este registro.');
            if (error.status === 404) throw new PrivateFileError(404, 'Arquivo não encontrado.');
            if (error.status === 409) throw new PrivateFileError(409, 'Arquivo não está pendente.');
          }
          // Erros inesperados continuam sanitizados por run() como 503.
          throw error;
        }
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
    async listarArquivos(input: unknown) {
      return run(async actorId => {
        const body = parameters(input, ['registroId']);
        const registroId = identifier(body.registroId);
        try {
          const arquivos = await deps.repository.listConfirmed({actorId, registroId});
          return {arquivos};
        } catch (error) {
          if (error instanceof Error && 'status' in error && error.status === 403) {
            throw new PrivateFileError(403, 'Você não tem autorização para este registro.');
          }
          throw error;
        }
      });
    },
  };
}
