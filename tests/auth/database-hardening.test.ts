import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ Pool: vi.fn(class { connect = vi.fn(async () => ({ query: vi.fn(), release: vi.fn() })); on = vi.fn(); }) }));
vi.mock('server-only', () => ({}));
vi.mock('pg', () => ({ Pool: mocks.Pool }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubEnv('NODE_ENV', 'production'); });
afterEach(() => vi.unstubAllEnvs());
it.each(['127.1', '2130706433', '0x7f000001', 'localhost.', 'db.local', 'db.internal', 'db.localhost', '%31%32%37.0.0.1'])('rejeita formas alternativas de destino interno: %s', async host => {
  vi.stubEnv('SUPABASE_DB_URL', `postgresql://fixture:fixture-password@${host}:5432/postgres`);
  vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', `postgresql://${host}:5432/postgres`);
  const db = await import('../../src/lib/database.server');
  await expect(db.withTransaction(async () => {})).rejects.toThrow();
  expect(mocks.Pool).not.toHaveBeenCalled();
});
it.each(['?', '#', '?sslmode=no-verify'])('rejeita delimitadores/opções na URL: %s', async suffix => {
  vi.stubEnv('SUPABASE_DB_URL', `postgresql://fixture:fixture-password@db.pilot.example:5432/postgres${suffix}`);
  vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', 'postgresql://db.pilot.example:5432/postgres');
  const db = await import('../../src/lib/database.server');
  await expect(db.withTransaction(async () => {})).rejects.toThrow();
  expect(mocks.Pool).not.toHaveBeenCalled();
});
it('a configuração SSL explícita prevalece sobre PGSSLMODE permissivo', async () => {
  vi.stubEnv('SUPABASE_DB_URL', 'postgresql://fixture:fixture-password@db.pilot.example:5432/postgres');
  vi.stubEnv('SUPABASE_DB_ALLOWED_ENDPOINT', 'postgresql://db.pilot.example:5432/postgres');
  vi.stubEnv('PGSSLMODE', 'no-verify');
  const db = await import('../../src/lib/database.server');
  await db.withTransaction(async () => {});
  expect(mocks.Pool).toHaveBeenCalledWith(expect.objectContaining({ ssl: { rejectUnauthorized: true } }));
});
