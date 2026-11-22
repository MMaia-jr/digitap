import {describe, expect, it, vi} from 'vitest';
vi.mock('server-only', () => ({}));

// OSS-01A / RED-1: proteção adicional de upload privado.
// Contrato experimental com mocks. NÃO valida Storage, RLS, conteúdo binário ou produção.
// Novos testes: acrescentar somente este arquivo; preservar RED-0/GREEN-1 intactos.
import {createPrivateFileService} from '../../src/lib/evidence/private-files.server';

const OWNER = '11111111-1111-4111-8111-111111111111';
const RECORD = '33333333-3333-4333-8333-333333333333';
const FILE = '44444444-4444-4444-8444-444444444444';
const MIME = 'image/png';
const BYTES = 128;

type Metadata = {registroId: string; objectKey: string; contentType: string; sizeBytes: number};
type PrivateFile = Metadata & {id: string; estado: 'pendente' | 'confirmado'};

function fixture() {
  let actor: string | null = OWNER;
  let allowed = true;
  let file: PrivateFile | null = null;
  let successfulConfirmations = 0;

  const verifyActor = vi.fn(async () => actor);
  const authorize = vi.fn(async ({actorId, registroId}: {
    actorId: string; registroId: string; scope: 'upload' | 'read';
  }) => actorId === OWNER && registroId === RECORD && allowed);

  const repository = {
    insertPending: vi.fn(async (metadata: Metadata) => {
      file = {id: FILE, ...metadata, estado: 'pendente'};
      return file;
    }),
    find: vi.fn(async (id: string) => id === FILE ? file : null),
    listConfirmed: vi.fn(async () => []),
    // Sem contrato de produção para compensação ainda. Este método é proposto pelo RED-1.
    deletePending: vi.fn(async (id: string) => {
      if (file?.id === id && file.estado === 'pendente') file = null;
    }),
    // Simula CAS atômico: uma única transição pendente -> confirmado.
    markConfirmed: vi.fn(async ({arquivoId: id}: {arquivoId: string}) => {
      if (id !== FILE || !file || file.estado !== 'pendente') {
        throw Object.assign(new Error('Conflito sintético'), {status: 409});
      }
      file = {...file, estado: 'confirmado'};
      successfulConfirmations++;
      return file;
    }),
  };

  const storage = {
    signedUpload: vi.fn(async (_key: string) => ({url: 'https://storage.example.invalid/private/upload?signature=synthetic', token: 'synthetic-upload-token'})),
    stat: vi.fn(async (_key: string): Promise<{contentType: string; sizeBytes: number} | null> => ({
      contentType: MIME, sizeBytes: BYTES,
    })),
    signedRead: vi.fn(async (_key: string, expiresIn: number) => ({
      url: `https://storage.example.invalid/private/read?ttl=${expiresIn}`,
    })),
  };

  const service = createPrivateFileService({verifyActor, authorize, repository, storage});
  return {
    service, repository, storage, authorize,
    get file() {return file;},
    get successfulConfirmations() {return successfulConfirmations;},
    setActor(value: string | null) {actor = value;},
    revoke() {allowed = false;},
  };
}

const uploadInput = () => ({registroId: RECORD, contentType: MIME, sizeBytes: BYTES});

describe('OSS-01A / RED-1 — limites e consistência de evidências privadas', () => {
  it('recusa upload absurdamente grande (1 TiB), sem criar metadados ou URL', async () => {
    const f = fixture();
    // 1 TiB é apenas um caso seguramente excessivo; NÃO fixa o limite final do produto.
    await expect(f.service.iniciarUpload({...uploadInput(), sizeBytes: 2 ** 40}))
      .rejects.toMatchObject({status: 422});
    expect(f.repository.insertPending).not.toHaveBeenCalled();
    expect(f.storage.signedUpload).not.toHaveBeenCalled();
  });

  it.each(['text/html', 'image/svg+xml'] as const)(
    'recusa MIME ativo %s, antes de persistir ou assinar URL', async contentType => {
      const f = fixture();
      // Não define ainda a whitelist final. HTML e SVG ativo são vetores de conteúdo ativo.
      await expect(f.service.iniciarUpload({...uploadInput(), contentType}))
        .rejects.toMatchObject({status: 422});
      expect(f.repository.insertPending).not.toHaveBeenCalled();
      expect(f.storage.signedUpload).not.toHaveBeenCalled();
    },
  );

  // GREEN-2A: política técnica provisória de 25 MiB; decisão final exige revisão humana.
  it('GREEN-2A: recusa 25 MiB mais um byte antes de persistir ou assinar', async () => {
    const f = fixture();
    await expect(f.service.iniciarUpload({...uploadInput(), sizeBytes: 25 * 1024 * 1024 + 1}))
      .rejects.toMatchObject({status: 422});
    expect(f.repository.insertPending).not.toHaveBeenCalled();
    expect(f.storage.signedUpload).not.toHaveBeenCalled();
  });

  it('GREEN-2A: permite 25 MiB exatos com MIME seguro listado', async () => {
    const f = fixture();
    await expect(f.service.iniciarUpload({...uploadInput(), sizeBytes: 25 * 1024 * 1024}))
      .resolves.toMatchObject({arquivoId: FILE});
    expect(f.repository.insertPending).toHaveBeenCalledOnce();
    expect(f.storage.signedUpload).toHaveBeenCalledOnce();
  });

  it.each(['application/octet-stream', 'text/plain'] as const)(
    'GREEN-2A: recusa MIME não listado %s antes de criar metadados', async contentType => {
      const f = fixture();
      await expect(f.service.iniciarUpload({...uploadInput(), contentType}))
        .rejects.toMatchObject({status: 422});
      expect(f.repository.insertPending).not.toHaveBeenCalled();
      expect(f.storage.signedUpload).not.toHaveBeenCalled();
    },
  );

  it.each(['image/jpeg', 'image/webp', 'application/pdf'] as const)(
    'GREEN-2A: permite MIME listado %s', async contentType => {
      const f = fixture();
      await expect(f.service.iniciarUpload({...uploadInput(), contentType}))
        .resolves.toMatchObject({arquivoId: FILE});
      expect(f.repository.insertPending).toHaveBeenCalledOnce();
      expect(f.storage.signedUpload).toHaveBeenCalledOnce();
    },
  );

  it('não deixa metadados pendentes sem tratamento quando falha a assinatura do upload', async () => {
    const f = fixture();
    f.storage.signedUpload.mockRejectedValueOnce(new Error('Falha sintética do adaptador'));
    await expect(f.service.iniciarUpload(uploadInput()))
      .rejects.toMatchObject({status: 503});
    // Regra a implementar depois do RED: compensar a falha com operação atômica/
    // limpeza restrita ao metadado pendente. Não remover conteúdo existente de outro ator.
    expect(f.repository.deletePending).toHaveBeenCalledWith(FILE);
    expect(f.file).toBeNull();
  });

  it('GREEN-2B: falha da compensação devolve 503 sanitizado sem afirmar limpeza', async () => {
    const f = fixture();
    f.storage.signedUpload.mockRejectedValueOnce(new Error('synthetic-signature-secret'));
    f.repository.deletePending.mockRejectedValueOnce(new Error('synthetic-delete-secret'));
    let failure: unknown;
    try { await f.service.iniciarUpload(uploadInput()); } catch (error) { failure = error; }
    expect(failure).toMatchObject({status: 503});
    expect(String(failure)).not.toMatch(/synthetic-signature-secret|synthetic-delete-secret/);
    expect(f.repository.deletePending).toHaveBeenCalledOnce();
    expect(f.repository.deletePending).toHaveBeenCalledWith(FILE);
    expect(f.file?.estado).toBe('pendente'); // exige reconciliação futura; não inventar garantia transacional.
  });

  it('GREEN-2B: assinatura bem-sucedida não remove metadado pendente', async () => {
    const f = fixture();
    await expect(f.service.iniciarUpload(uploadInput())).resolves.toMatchObject({arquivoId: FILE});
    expect(f.repository.deletePending).not.toHaveBeenCalled();
    expect(f.file?.estado).toBe('pendente');
  });

  it('GREEN-2C1: falha na reautorização não confirma nem revela erro interno', async () => {
    const f = fixture();
    const {arquivoId} = await f.service.iniciarUpload(uploadInput());
    // Autoriza a primeira verificação da confirmação; simula erro só na segunda.
    f.authorize.mockResolvedValueOnce(true);
    f.authorize.mockRejectedValueOnce(new Error('synthetic-auth-adapter-secret'));
    let failure: unknown;
    try { await f.service.confirmarUpload({arquivoId}); } catch (error) { failure = error; }
    expect(failure).toMatchObject({status: 503});
    expect(String(failure)).not.toContain('synthetic-auth-adapter-secret');
    expect(f.storage.stat).toHaveBeenCalledOnce();
    expect(f.authorize).toHaveBeenCalledTimes(3); // upload, pré-stat, pós-stat
    expect(f.repository.markConfirmed).not.toHaveBeenCalled();
    expect(f.file?.estado).toBe('pendente');
  });

  it('não confirma arquivo quando a autorização é revogada durante o stat do Storage', async () => {
    const f = fixture();
    const {arquivoId} = await f.service.iniciarUpload(uploadInput());
    f.storage.stat.mockImplementationOnce(async () => {
      f.revoke(); // revogação intercalada após a primeira autorização
      return {contentType: MIME, sizeBytes: BYTES};
    });
    await expect(f.service.confirmarUpload({arquivoId}))
      .rejects.toMatchObject({status: 403});
    expect(f.repository.markConfirmed).not.toHaveBeenCalled();
    expect(f.file?.estado).toBe('pendente');
    // Em produção, a atomicidade da autorização final deve ser verificada no DB.
  });

  it('GREEN-2C2: conflito CAS 409 permanece sanitizado', async () => {
    const f = fixture();
    const {arquivoId} = await f.service.iniciarUpload(uploadInput());
    f.repository.markConfirmed.mockRejectedValueOnce(
      Object.assign(new Error('private-cas-secret-synthetic'), {status: 409}),
    );
    let failure: unknown;
    try { await f.service.confirmarUpload({arquivoId}); } catch (error) { failure = error; }
    expect(failure).toMatchObject({status: 409});
    expect(String(failure)).not.toContain('private-cas-secret-synthetic');
    expect(f.repository.markConfirmed).toHaveBeenCalledOnce();
    expect(f.file?.estado).toBe('pendente');
  });

  it('GREEN-2C2: erro inesperado do CAS retorna 503 sanitizado', async () => {
    const f = fixture();
    const {arquivoId} = await f.service.iniciarUpload(uploadInput());
    f.repository.markConfirmed.mockRejectedValueOnce(
      Object.assign(new Error('private-cas-internal-synthetic'), {status: 500}),
    );
    let failure: unknown;
    try { await f.service.confirmarUpload({arquivoId}); } catch (error) { failure = error; }
    expect(failure).toMatchObject({status: 503});
    expect(String(failure)).not.toContain('private-cas-internal-synthetic');
    expect(f.repository.markConfirmed).toHaveBeenCalledOnce();
    expect(f.file?.estado).toBe('pendente');
  });

  it('confirma concorrência uma única vez; tentativa perdedora retorna conflito controlado', async () => {
    const f = fixture();
    const {arquivoId} = await f.service.iniciarUpload(uploadInput());
    const results = await Promise.allSettled([
      f.service.confirmarUpload({arquivoId}),
      f.service.confirmarUpload({arquivoId}),
    ]);
    const ok = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (rejected[0]?.status === 'rejected') {
      expect(rejected[0].reason).toMatchObject({status: 409});
    }
    expect(f.successfulConfirmations).toBe(1);
    expect(f.file?.estado).toBe('confirmado');
  });

  it('falha de stat não confirma nem revela erro interno do adaptador', async () => {
    const f = fixture();
    const {arquivoId} = await f.service.iniciarUpload(uploadInput());
    f.storage.stat.mockRejectedValueOnce(new Error('private-adapter-secret-synthetic'));
    let error: unknown;
    try { await f.service.confirmarUpload({arquivoId}); } catch (caught) {error = caught;}
    expect(error).toMatchObject({status: 503});
    expect(String(error)).not.toContain('private-adapter-secret-synthetic');
    expect(f.repository.markConfirmed).not.toHaveBeenCalled();
    expect(f.file?.estado).toBe('pendente');
  });
});
