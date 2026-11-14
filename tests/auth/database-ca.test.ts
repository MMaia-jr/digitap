import { generateKeyPairSync, sign, X509Certificate } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Certificados exclusivamente sintéticos, gerados em memória. Nenhum PEM real,
// chave privada ou credencial é incluído no repositório ou escrito em arquivo.
// DER mínimo para certificados sintéticos: apenas APIs nativas de Node, sem
// OpenSSL externo, fixtures PEM persistidas ou mock de X509Certificate.
function der(tag: number, ...parts: Buffer[]): Buffer {
  const body = Buffer.concat(parts);
  const hex = body.length.toString(16).padStart(2, '0');
  const size = Buffer.from(hex.length % 2 ? '0' + hex : hex, 'hex');
  const length = body.length < 128 ? Buffer.from([body.length]) : Buffer.concat([Buffer.from([0x80 | size.length]), size]);
  return Buffer.concat([Buffer.from([tag]), length, body]);
}
function certificate(ca: boolean) {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const algorithm = der(0x30, Buffer.from('06082a8648ce3d040302', 'hex')); // ecdsa-with-SHA256
  const name = der(0x30, der(0x31, der(0x30, Buffer.from('0603550403', 'hex'), der(0x0c, Buffer.from('DigItap synthetic CA test')))));
  const validity = der(0x30, der(0x17, Buffer.from('260101000000Z')), der(0x17, Buffer.from('491231235959Z')));
  const constraints = der(0x30, ...(ca ? [Buffer.from('0101ff', 'hex')] : []));
  const extension = der(0x30, Buffer.from('0603551d13', 'hex'), Buffer.from('0101ff', 'hex'), der(0x04, constraints));
  const tbs = der(0x30, der(0xa0, Buffer.from('020102', 'hex')), Buffer.from('020101', 'hex'), algorithm, name, validity, name,
    publicKey.export({ type: 'spki', format: 'der' }), der(0xa3, der(0x30, extension)));
  const encoded = der(0x30, tbs, algorithm, der(0x03, Buffer.from([0]), sign('sha256', tbs, privateKey))).toString('base64');
  return '-----BEGIN CERTIFICATE-----\n' + encoded.match(/.{1,64}/g)!.join('\n') + '\n-----END CERTIFICATE-----\n';
}
const mocks = vi.hoisted(() => {
  const query = vi.fn(), release = vi.fn(), connect = vi.fn();
  const Pool = vi.fn(class { connect = connect; on = vi.fn(); end = vi.fn(); });
  return { Pool, query, release, connect };
});
vi.mock('server-only', () => ({}));
vi.mock('pg', () => ({ Pool: mocks.Pool }));
let ca: string, leaf: string;
beforeAll(() => {
  ca = certificate(true); leaf = certificate(false);
  expect(new X509Certificate(ca).ca).toBe(true);
  expect(new X509Certificate(leaf).ca).toBe(false);
});
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SUPABASE_DB_URL', 'postgresql://fixture:fixture-password@db.fixture.example:6543/postgres');
  vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', 'postgresql://db.fixture.example:6543/postgres');
  vi.stubEnv('SUPABASE_DB_CA_PEM', undefined);
  mocks.query.mockResolvedValue({ rows: [] });
  mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
});
afterEach(() => vi.unstubAllEnvs());
async function transact() {
  const db = await import('../../src/lib/database.server');
  await db.withTransaction(async () => 'fixture');
}
async function rejected() {
  await expect(transact()).rejects.toThrow('Configuração PostgreSQL indisponível ou não autorizada.');
  expect(mocks.Pool).not.toHaveBeenCalled(); expect(mocks.connect).not.toHaveBeenCalled();
}
describe('P0 — CA opcional PostgreSQL', () => {
  it('aceita Transaction pooler com usuário qualificado e consultas sem nome', async () => {
    vi.stubEnv('SUPABASE_DB_URL', 'postgresql://postgres.fixture-project:fixture-password@aws-0-fixture.pooler.supabase.com:6543/postgres');
    vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', 'postgresql://aws-0-fixture.pooler.supabase.com:6543/postgres');
    await transact();
    expect(mocks.Pool).toHaveBeenCalledWith(expect.objectContaining({ ssl: { rejectUnauthorized: true } }));
    expect(mocks.query.mock.calls.map(([sql]) => sql)).toEqual(['begin', "set local statement_timeout='5s'", "set local lock_timeout='3s'", 'commit']);
    expect(mocks.query.mock.calls.every(([sql]) => typeof sql === 'string')).toBe(true);
    expect(mocks.connect).toHaveBeenCalledOnce();
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith(false);
  });
  it('sem CA explícita preserva verificação TLS e max:4', async () => {
    await transact();
    expect(mocks.Pool).toHaveBeenCalledWith(expect.objectContaining({ max: 4, ssl: { rejectUnauthorized: true } }));
  });
  it('encaminha PEM válido de CA sem enfraquecer TLS', async () => {
    vi.stubEnv('SUPABASE_DB_CA_PEM', ca);
    await transact();
    expect(mocks.Pool).toHaveBeenCalledWith(expect.objectContaining({ max: 4, ssl: { rejectUnauthorized: true, ca } }));
  });
  it.each(['', '   ', 'not-a-certificate', '-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----'])('rejeita CA configurada inválida antes de criar Pool: caso %#', async pem => {
    vi.stubEnv('SUPABASE_DB_CA_PEM', pem); await rejected();
  });
  it('rejeita certificado que não seja CA', async () => {
    vi.stubEnv('SUPABASE_DB_CA_PEM', leaf); await rejected();
  });
  it('rejeita texto adicional ou bundle em vez de um único PEM de CA', async () => {
    for (const pem of [ca + 'unexpected', ca + leaf]) {
      vi.stubEnv('SUPABASE_DB_CA_PEM', pem); await rejected();
    }
  });
  it('erro de CA inválida não retém PEM ou causa de parsing', async () => {
    const pem = 'invalid-ca-fixture-marker';
    vi.stubEnv('SUPABASE_DB_CA_PEM', pem);
    const error = await transact().then(() => null, (failure: unknown) => failure);
    expect(error).toBeInstanceOf(Error);
    const properties = Object.fromEntries(Object.getOwnPropertyNames(error).map(key => [key, Reflect.get(error as object, key)]));
    expect(JSON.stringify(properties)).not.toContain(pem);
    expect(properties).not.toHaveProperty('cause');
    expect(mocks.Pool).not.toHaveBeenCalled();
  });
  it('CA não permite que PGSSLMODE desabilite verificação', async () => {
    vi.stubEnv('SUPABASE_DB_CA_PEM', ca); vi.stubEnv('PGSSLMODE', 'no-verify');
    await transact();
    expect(mocks.Pool).toHaveBeenCalledWith(expect.objectContaining({ ssl: { rejectUnauthorized: true, ca } }));
  });
  it('continua rejeitando opções SSL na connection string mesmo com CA', async () => {
    vi.stubEnv('SUPABASE_DB_CA_PEM', ca);
    vi.stubEnv('SUPABASE_DB_URL', 'postgresql://fixture:fixture-password@db.fixture.example:6543/postgres?sslmode=disable');
    await rejected();
  });
  it('CA não autoriza endpoint divergente', async () => {
    vi.stubEnv('SUPABASE_DB_CA_PEM', ca);
    vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', 'postgresql://other.example:6543/postgres');
    await rejected();
  });
  it('CA não autoriza loopback em produção', async () => {
    vi.stubEnv('SUPABASE_DB_CA_PEM', ca);
    vi.stubEnv('SUPABASE_DB_URL', 'postgresql://postgres:fixture-password@127.0.0.1:56152/postgres');
    vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', 'postgresql://127.0.0.1:56152/postgres');
    await rejected();
  });
  it('desenvolvimento preserva configuração local, sem consumir a CA de produção', async () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('SUPABASE_DB_CA_PEM', 'not-used-locally');
    vi.stubEnv('SUPABASE_DB_URL', 'postgresql://postgres:fixture-password@127.0.0.1:56152/postgres');
    await transact();
    expect(mocks.Pool).toHaveBeenCalledWith(expect.objectContaining({ max: 4 }));
    const [options] = mocks.Pool.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(options).not.toHaveProperty('ssl');
  });
});
