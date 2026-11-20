import {describe, expect, it, vi} from 'vitest';
vi.mock('server-only', () => ({}));

// OSS-01A RED-0: contrato PROPOSTO; o módulo não existe nesta base.
// Criar somente o teste primeiro. Não instalar, habilitar Storage ou implementar serviço.
// O import ausente causa RED de coleta; não representa execução das asserções.
// signedUpload e o prefixo evidencias/ são preservados do pacote, pendentes de decisão contratual.
import {createPrivateFileService} from '../../src/lib/evidence/private-files.server';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const RECORD = '33333333-3333-4333-8333-333333333333';
const FILE = '44444444-4444-4444-8444-444444444444';
const MIME = 'image/png';
const BYTES = 128;

type PrivateFile = {
  id: string;
  registroId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  estado: 'pendente' | 'confirmado';
};

function fixture(initialActor: string | null = OWNER) {
  let actor = initialActor;
  let allowed = true;
  let file: PrivateFile | null = null;

  const verifyActor = vi.fn(async () => actor);
  const authorize = vi.fn(async ({actorId, registroId, scope}: {
    actorId: string; registroId: string; scope: 'upload' | 'read';
  }) => actorId === OWNER && registroId === RECORD && allowed && (scope === 'upload' || scope === 'read'));
  const repository = {
    insertPending: vi.fn(async (data: Omit<PrivateFile, 'id' | 'estado'>) => {
      file = {id: FILE, ...data, estado: 'pendente'};
      return file;
    }),
    find: vi.fn(async (id: string) => id === FILE ? file : null),
    markConfirmed: vi.fn(async ({arquivoId: id}: {arquivoId: string}) => {
      if (id !== FILE || !file) throw new Error('Arquivo não encontrado');
      file = {...file, estado: 'confirmado'};
      return file;
    }),
  };
  const storage = {
    signedUpload: vi.fn(async (_key: string) => ({url: 'https://storage.example.invalid/private/upload?signature=synthetic'})),
    stat: vi.fn(async (_key: string): Promise<{contentType: string; sizeBytes: number} | null> => ({contentType: MIME, sizeBytes: BYTES})),
    signedRead: vi.fn(async (_key: string, expiresIn: number) => ({url: `https://storage.example.invalid/private/read?ttl=${expiresIn}&signature=synthetic`})),
  };
  const service = createPrivateFileService({verifyActor, authorize, repository, storage});
  return {service, verifyActor, authorize, repository, storage,
    get file() {return file;},
    setActor(value: string | null) {actor = value;},
    revoke() {allowed = false;},
  };
}

const uploadInput = () => ({registroId: RECORD, contentType: MIME, sizeBytes: BYTES});

async function confirmed(f: ReturnType<typeof fixture>) {
  const created = await f.service.iniciarUpload(uploadInput());
  f.verifyActor.mockClear();
  f.authorize.mockClear();
  await f.service.confirmarUpload({arquivoId: created.arquivoId});
  expect(f.verifyActor).toHaveBeenCalledOnce();
  expect(f.authorize).toHaveBeenCalledWith({actorId: OWNER, registroId: RECORD, scope: 'upload'});
  expect(f.storage.stat).toHaveBeenCalledWith(created.objectKey);
  expect(f.repository.markConfirmed).toHaveBeenCalledWith({actorId: OWNER, arquivoId: created.arquivoId, registroId: RECORD});
  expect(f.file?.estado).toBe('confirmado');
  return created;
}

describe('OSS-01A RED-0 / fronteira privada independente do editorial', () => {
  it('anônimo não recebe upload e não chama Storage', async () => {
    const f = fixture(null);
    await expect(f.service.iniciarUpload(uploadInput())).rejects.toMatchObject({status: 401});
    expect(f.storage.signedUpload).not.toHaveBeenCalled();
    expect(f.repository.insertPending).not.toHaveBeenCalled();
  });

  it('conta sem vínculo não recebe upload e não chama Storage', async () => {
    const f = fixture(OTHER);
    await expect(f.service.iniciarUpload(uploadInput())).rejects.toMatchObject({status: 403});
    expect(f.storage.signedUpload).not.toHaveBeenCalled();
    expect(f.repository.insertPending).not.toHaveBeenCalled();
  });

  it('gera objectKey no servidor e não persiste URL temporária ou URL pública', async () => {
    const f = fixture();
    const created = await f.service.iniciarUpload(uploadInput());
    expect(created.arquivoId).toBe(FILE);
    expect(created.uploadUrl).toContain('/private/upload');
    expect(created.objectKey).toMatch(new RegExp(`^evidencias/${RECORD}/`));
    expect(f.repository.insertPending).toHaveBeenCalledOnce();
    expect(f.file).toMatchObject({id: FILE, registroId: RECORD, contentType: MIME, sizeBytes: BYTES, estado: 'pendente'});
    expect(JSON.stringify(f.file)).not.toMatch(/signed|signature|uploadUrl|url_publica|versao_publicada|aprovada_publicacao/i);
  });

  it('não aceita objectKey, URL ou estado editorial enviados pelo cliente', async () => {
    const f = fixture();
    await expect(f.service.iniciarUpload({
      ...uploadInput(), objectKey: '../outro-sujeito/arquivo', url_publica: 'https://example.invalid',
      estado_editorial: 'publicada',
    })).rejects.toMatchObject({status: 400});
    expect(f.storage.signedUpload).not.toHaveBeenCalled();
  });

  it('não confirma objeto cujos metadados divergem do declarado', async () => {
    const f = fixture();
    await f.service.iniciarUpload(uploadInput());
    f.storage.stat.mockResolvedValueOnce({contentType: 'application/x-msdownload', sizeBytes: 9000000});
    await expect(f.service.confirmarUpload({arquivoId: FILE})).rejects.toMatchObject({status: 422});
    expect(f.repository.markConfirmed).not.toHaveBeenCalled();
    expect(f.file?.estado).toBe('pendente');
  });

  it('após confirmar, emite leitura curta e revalida escopo após revogação', async () => {
    const f = fixture();
    const {arquivoId} = await confirmed(f);
    f.verifyActor.mockClear();
    f.authorize.mockClear();
    const response = await f.service.obterUrlLeitura({arquivoId});
    expect(f.verifyActor).toHaveBeenCalledOnce();
    expect(f.authorize).toHaveBeenCalledWith({actorId: OWNER, registroId: RECORD, scope: 'read'});
    expect(response.url).toContain('/private/read');
    expect(response.expiresIn).toBeGreaterThan(0);
    expect(response.expiresIn).toBeLessThanOrEqual(300);
    expect(f.storage.signedRead).toHaveBeenCalledWith(f.file?.objectKey, response.expiresIn);
    f.revoke();
    await expect(f.service.obterUrlLeitura({arquivoId})).rejects.toMatchObject({status: 403});
    expect(f.verifyActor).toHaveBeenCalledTimes(2);
    expect(f.authorize).toHaveBeenCalledTimes(2);
    expect(f.authorize).toHaveBeenLastCalledWith({actorId: OWNER, registroId: RECORD, scope: 'read'});
    expect(f.storage.signedRead).toHaveBeenCalledTimes(1);
  });

  it('não permite leitura de arquivo ainda pendente, mesmo com vínculo', async () => {
    const f = fixture();
    const {arquivoId} = await f.service.iniciarUpload(uploadInput());
    await expect(f.service.obterUrlLeitura({arquivoId})).rejects.toMatchObject({status: 409});
    expect(f.storage.signedRead).not.toHaveBeenCalled();
  });

  it('não confirma upload quando o objeto está ausente no Storage', async () => {
    const f = fixture();
    const created = await f.service.iniciarUpload(uploadInput());
    f.storage.stat.mockResolvedValueOnce(null);
    await expect(f.service.confirmarUpload({arquivoId: created.arquivoId})).rejects.toMatchObject({status: 422});
    expect(f.storage.stat).toHaveBeenCalledWith(created.objectKey);
    expect(f.repository.markConfirmed).not.toHaveBeenCalled();
    expect(f.file?.estado).toBe('pendente');
  });

  it.each(['confirmarUpload', 'obterUrlLeitura'] as const)('%s revalida a sessão e nega terceiro antes de acessar o Storage', async method => {
    const f = fixture();
    const created = method === 'obterUrlLeitura'
      ? await confirmed(f)
      : await f.service.iniciarUpload(uploadInput());
    const before = {...f.file};
    f.setActor(OTHER);
    f.verifyActor.mockClear();
    f.authorize.mockClear();
    f.storage.stat.mockClear();
    f.repository.markConfirmed.mockClear();
    await expect(f.service[method]({arquivoId: created.arquivoId})).rejects.toMatchObject({status: 403});
    expect(f.verifyActor).toHaveBeenCalledOnce();
    expect(f.authorize).toHaveBeenCalledWith({actorId: OTHER, registroId: RECORD, scope: method === 'confirmarUpload' ? 'upload' : 'read'});
    expect(f.storage.stat).not.toHaveBeenCalled();
    expect(f.storage.signedRead).not.toHaveBeenCalled();
    expect(f.storage.signedUpload).toHaveBeenCalledTimes(1);
    expect(f.repository.markConfirmed).not.toHaveBeenCalled();
    expect(f.file).toEqual(before);
  });

  it('não confirma upload depois da revogação do escopo', async () => {
    const f = fixture();
    const created = await f.service.iniciarUpload(uploadInput());
    f.revoke();
    f.authorize.mockClear();
    await expect(f.service.confirmarUpload({arquivoId: created.arquivoId})).rejects.toMatchObject({status: 403});
    expect(f.authorize).toHaveBeenCalledWith({actorId: OWNER, registroId: RECORD, scope: 'upload'});
    expect(f.storage.stat).not.toHaveBeenCalled();
    expect(f.repository.markConfirmed).not.toHaveBeenCalled();
    expect(f.file?.estado).toBe('pendente');
  });
});
