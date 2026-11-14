import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* AF-P0-02 — contrato proposto, sem conexão real.
 * SUPABASE_DB_URL: URL com credenciais, exclusivamente no servidor.
 * SUPABASE_DB_ALLOWED_ENDPOINT: postgresql://host:porta/banco, sem credenciais,
 * query ou fragmento; autorização independente por igualdade exata do destino.
 * Produção: proibir loopback/localhost/IP privado, mesmo se autorizado; exigir
 * ssl.rejectUnauthorized === true (CA confiável padrão ou CA explícita validada).
 * Neste contrato mínimo não admitir query/fragmento na URL: sslmode e similares
 * não podem sobrescrever a política TLS. Não basta liberar *.supabase.co.
 * Não se testa handshake/DNS/RLS com mocks; isso exige validação futura separada.
 */
const mock = vi.hoisted(() => {
  const query = vi.fn();
  const release = vi.fn();
  const connect = vi.fn();
  const on = vi.fn();
  const end = vi.fn();
  const Pool = vi.fn(class {
    query = query;
    connect = connect;
    on = on;
    end = end;
  });
  return { query, release, connect, on, end, Pool };
});
vi.mock('server-only', () => ({}));
vi.mock('pg', () => ({ Pool: mock.Pool }));

const local = 'postgresql://postgres:fixture-password@127.0.0.1:56152/postgres';
const endpoint = 'postgresql://db.pilot.example:5432/postgres';
const cloud = 'postgresql://pilot_user:fixture-password@db.pilot.example:5432/postgres';
const operation = vi.fn(async () => 'resultado');

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('SUPABASE_DB_URL', local);
  vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', undefined);
  mock.query.mockResolvedValue({ rows: [] });
  mock.connect.mockResolvedValue({ query: mock.query, release: mock.release });
  mock.end.mockResolvedValue(undefined);
  operation.mockResolvedValue('resultado');
});
afterEach(() => vi.unstubAllEnvs());

async function adapter() { return import('../../src/lib/database.server'); }
function production(url: string | undefined = cloud, allowed: string | undefined = endpoint) {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SUPABASE_DB_URL', url);
  vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', allowed);
}
async function denied() {
  const db = await adapter();
  await expect(db.withTransaction(operation)).rejects.toBeInstanceOf(Error);
  expect(mock.Pool).not.toHaveBeenCalled();
  expect(mock.connect).not.toHaveBeenCalled();
  expect(operation).not.toHaveBeenCalled();
}
async function acceptedProduction() {
  const db = await adapter();
  expect(await db.withTransaction(operation)).toBe('resultado');
  expect(mock.Pool).toHaveBeenCalledOnce();
  return mock.Pool.mock.calls[0] as unknown as [Record<string, unknown>];
}

describe('AF-P0-02-A — local estritamente autorizado', () => {
  it('aceita somente o endpoint local vigente e mantém limites do pool', async () => {
    const db = await adapter();
    expect(await db.withTransaction(operation)).toBe('resultado');
    expect(mock.Pool).toHaveBeenCalledWith(expect.objectContaining({ connectionString: local, max: 4, idleTimeoutMillis: 5000, connectionTimeoutMillis: 3000 }));
  });
  it.each([
    'postgresql://postgres:fixture-password@localhost:56152/postgres',
    'postgresql://postgres:fixture-password@127.0.0.1:5432/postgres',
    'postgresql://postgres:fixture-password@127.0.0.1:56152/outro',
    'postgresql://outro:fixture-password@127.0.0.1:56152/postgres',
    cloud,
  ])('rejeita destino local alternativo %#', async url => {
    vi.stubEnv('SUPABASE_DB_URL', url); await denied();
  });
});

describe('AF-P0-02-B — produção não admite destinos internos ou não autorizados', () => {
  it.each(['127.0.0.1', '127.0.0.2', 'localhost', 'localhost.localdomain', '[::1]', '0.0.0.0', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '[fc00::1]', '[fe80::1]'])('rejeita %s mesmo explicitamente listado', async host => {
    // Porta local: também detecta o bypass atual de NODE_ENV=production.
    production(`postgresql://postgres:fixture-password@${host}:56152/postgres`, `postgresql://${host}:56152/postgres`);
    await denied();
  });
  it.each([
    'postgresql://pilot_user:fixture-password@other.example:5432/postgres',
    'postgresql://pilot_user:fixture-password@db.pilot.example.evil.example:5432/postgres',
    'postgresql://pilot_user:fixture-password@db.pilot.example:6543/postgres',
    'postgresql://pilot_user:fixture-password@db.pilot.example:5432/outro',
    'postgresql://pilot_user:fixture-password@db.pilot.example@evil.example:5432/postgres',
  ])('rejeita divergência do endpoint autorizado %#', async url => {
    production(url); await denied();
  });
});

describe('AF-P0-02-C — endpoint explícito de produção', () => {
  it('aceita exatamente o endpoint autorizado sem derivar autorização da própria URL', async () => {
    production();
    const [options] = await acceptedProduction();
    expect(options.connectionString).toBe(cloud);
  });
  it('não aceita um destino Cloud na ausência de autorização independente', async () => {
    production(); vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', undefined); await denied();
  });
});

describe('AF-P0-02-D — TLS obrigatório com verificação', () => {
  it('configura verificação de certificado explicitamente no Pool de produção', async () => {
    production();
    const [options] = await acceptedProduction();
    expect(options.ssl).toEqual(expect.objectContaining({ rejectUnauthorized: true }));
  });
  it.each(['sslmode=disable', 'sslmode=no-verify', 'sslmode=require', 'sslmode=verify-full', 'ssl=false', 'rejectUnauthorized=false'])('rejeita parâmetro TLS da URL: %s', async query => {
    production(`${cloud}?${query}`); await denied();
  });
});

describe('AF-P0-02-E — validação antes de instanciar o Pool', () => {
  it.each([undefined, '', 'not-a-url', 'https://db.pilot.example/postgres', 'postgresql://pilot_user@db.pilot.example:5432/postgres', `${cloud}#fragment`])('rejeita URL ausente/inválida %#', async url => {
    production(); vi.stubEnv('SUPABASE_DB_URL', url); await denied();
  });
  it.each(['', 'not-a-url', 'postgresql://*.example:5432/postgres', 'postgresql://db.pilot.example:5432/postgres?sslmode=disable', 'postgresql://user:fixture-password@db.pilot.example:5432/postgres'])('rejeita autorização malformada %#', async allowed => {
    production(cloud, allowed); await denied();
  });
});

describe('AF-P0-02-F — erros sanitizados', () => {
  it.each(['postgresql://fixture-user:fixture-secret@[invalid', 'postgresql://fixture-user:fixture-secret@host.example:wrong/postgres'])('não expõe URL, usuário ou senha em Error/cause/propriedades %#', async url => {
    production(url);
    const db = await adapter();
    const error = await db.withTransaction(operation).then(() => null, (failure: unknown) => failure);
    expect(error).toBeInstanceOf(Error);
    // Inclui propriedades não enumeráveis, input de URL inválida e causas aninhadas.
    const seen = new WeakSet<object>();
    const expose = (value: unknown): unknown => {
      if (!value || typeof value !== 'object') return String(value);
      if (seen.has(value)) return '[circular]';
      seen.add(value);
      return Object.fromEntries(Object.getOwnPropertyNames(value).map(key => [key, expose(Reflect.get(value, key))]));
    };
    const serialized = JSON.stringify(expose(error));
    for (const marker of [url, 'fixture-user', 'fixture-secret']) expect(serialized).not.toContain(marker);
    expect(mock.Pool).not.toHaveBeenCalled();
    expect(mock.connect).not.toHaveBeenCalled();
  });
  it('não registra configuração inválida no console', async () => {
    const spies = ['error', 'warn', 'log', 'info', 'debug'].map(method => vi.spyOn(console, method as 'error').mockImplementation(() => {}));
    try {
      production('postgresql://fixture-user:fixture-secret@[invalid');
      await denied();
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally { spies.forEach(spy => spy.mockRestore()); }
  });
});

describe('AF-P0-02-G — regressão transacional sem PostgreSQL', () => {
  it.each(['development', 'production'])('preserva begin, timeouts, commit, release e reutilização do Pool em %s', async mode => {
    if (mode === 'production') production();
    const db = await adapter();
    expect(await db.withTransaction(operation)).toBe('resultado');
    expect(mock.query.mock.calls.map(([sql]) => sql)).toEqual(['begin', "set local statement_timeout='5s'", "set local lock_timeout='3s'", 'commit']);
    expect(mock.release).toHaveBeenCalledExactlyOnceWith(false);
    await db.withTransaction(operation);
    expect(mock.Pool).toHaveBeenCalledOnce();
    await db.closeDatabasePool(); expect(mock.end).toHaveBeenCalledOnce();
  });
  it('faz rollback e libera conexão após falha da operação', async () => {
    const failure = new Error('falha sintética'); operation.mockRejectedValueOnce(failure);
    const db = await adapter(); await expect(db.withTransaction(operation)).rejects.toBe(failure);
    expect(mock.query.mock.calls.map(([sql]) => sql)).toEqual(['begin', "set local statement_timeout='5s'", "set local lock_timeout='3s'", 'rollback']);
    expect(mock.release).toHaveBeenCalledExactlyOnceWith(false);
  });
  it('descarta conexão se rollback falhar e preserva erro original', async () => {
    const failure = new Error('falha sintética'); operation.mockRejectedValueOnce(failure);
    mock.query.mockImplementation(async sql => { if (sql === 'rollback') throw new Error('rollback sintético'); return { rows: [] }; });
    const db = await adapter(); await expect(db.withTransaction(operation)).rejects.toBe(failure);
    expect(mock.release).toHaveBeenCalledExactlyOnceWith(true);
  });
  it.each(['begin', "set local statement_timeout='5s'", "set local lock_timeout='3s'", 'commit'])('falha em %s faz rollback e libera conexão', async step => {
    const failure = new Error('falha SQL sintética');
    mock.query.mockImplementation(async sql => { if (sql === step) throw failure; return { rows: [] }; });
    const db = await adapter(); await expect(db.withTransaction(operation)).rejects.toBe(failure);
    expect(mock.query).toHaveBeenLastCalledWith('rollback');
    expect(mock.release).toHaveBeenCalledExactlyOnceWith(false);
    if (step !== 'commit') expect(operation).not.toHaveBeenCalled();
  });
  it('falha ao adquirir conexão não executa operação nem libera cliente inexistente', async () => {
    const failure = new Error('aquisição sintética'); mock.connect.mockRejectedValueOnce(failure);
    const db = await adapter(); await expect(db.withTransaction(operation)).rejects.toBe(failure);
    expect(operation).not.toHaveBeenCalled(); expect(mock.query).not.toHaveBeenCalled(); expect(mock.release).not.toHaveBeenCalled();
  });
});
