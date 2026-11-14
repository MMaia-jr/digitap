import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthGateway } from '../../src/lib/auth/flow.server';

const mocks = vi.hoisted(() => ({
  origin: vi.fn(), client: vi.fn(), cookies: vi.fn(), gateway: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('../../src/lib/supabase/config.server', () => ({ appOrigin: mocks.origin }));
vi.mock('../../src/lib/supabase/server', () => ({ userClient: mocks.client, clearAuthCookies: mocks.cookies }));
vi.mock('../../src/lib/supabase/admin.server', () => ({ adminClient: vi.fn() }));
vi.mock('../../src/lib/auth/gateway.server', () => ({ createGateway: mocks.gateway }));
import { mutation } from '../../src/lib/auth/runtime.server';

// Only in-memory fixtures: no real SDK, credentials, database, or HTTP service.
const markers = ['SEC_P0_FAKE_MESSAGE_71', 'SEC_P0_FAKE_STACK_72', 'SEC_P0_FAKE_CAUSE_73', 'SEC_P0_FAKE_PAYLOAD_74'];
const unavailable = { message: 'Serviço indisponível. Tente novamente.' };
const signupMessage = { message: 'Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Se já tem conta, entre ou recupere o acesso.' };
const origin = 'http://127.0.0.1:3215';
const actions = ['signup', 'signup_pf'] as const;
const methods = ['error', 'warn', 'log', 'info', 'debug', 'trace', 'dir', 'table'] as const;
let logs: ReturnType<typeof vi.spyOn>[];
function sensitiveError() {
  const error = new Error(markers[0], { cause: { detail: markers[2] } });
  error.stack = markers[1];
  return Object.assign(error, { payload: { credential: markers[3] } });
}
function fixture() {
  return {
    signUp: vi.fn().mockResolvedValue({}), signUpPF: vi.fn().mockResolvedValue({}),
    signIn: vi.fn(), recover: vi.fn(), verify: vi.fn(), changePassword: vi.fn(),
    logout: vi.fn().mockResolvedValue({}), currentUser: vi.fn(), account: vi.fn(),
    registerOrganization: vi.fn(), registerPerson: vi.fn(),
  } satisfies AuthGateway;
}
let gateway: ReturnType<typeof fixture>;
beforeEach(() => {
  vi.resetAllMocks();
  logs = methods.map(method => vi.spyOn(console, method).mockImplementation(() => {}));
  gateway = fixture();
  mocks.origin.mockReturnValue(origin);
  mocks.client.mockResolvedValue({});
  mocks.cookies.mockResolvedValue(vi.fn());
  mocks.gateway.mockReturnValue(gateway);
});
afterEach(() => vi.restoreAllMocks());
async function request(action: typeof actions[number]) {
  return mutation(action, new Request(`${origin}/api/auth/${action}`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'synthetic@example.invalid', password: 'SyntheticPasswordOnly!',
      ...(action === 'signup_pf' ? { nome_publico: 'Pessoa Sintética' } : {}) }),
  }));
}
async function safeResponse(response: Response, status: number, body: object) {
  expect(response.status).toBe(status);
  const text = await response.text();
  expect(JSON.parse(text)).toEqual(body);
  for (const marker of markers) expect(text).not.toContain(marker);
  expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
}
function safeLogs() {
  // inspect includes non-enumerable Error message/stack/cause and nested objects.
  const argumentsLogged = logs.flatMap(log => log.mock.calls);
  const serialized = inspect(argumentsLogged, { depth: null, showHidden: true, customInspect: false });
  for (const marker of markers) expect(serialized).not.toContain(marker);
  const containsError = (value: unknown): boolean => value instanceof Error ||
    (Array.isArray(value) && value.some(containsError));
  expect(argumentsLogged.some(containsError)).toBe(false);
}

describe.each(actions)('SEC-P0-LOGS — %s, HTTP and logs with synthetic failures', action => {
  const signup = () => action === 'signup' ? gateway.signUp : gateway.signUpPF;
  it('provider returns sensitive error: generic HTTP response and no raw logs', async () => {
    signup().mockResolvedValue({ error: Object.assign(sensitiveError(), { status: 500, code: 'synthetic_failure' }) });
    await safeResponse(await request(action), 503, unavailable);
    expect(signup()).toHaveBeenCalledOnce();
    safeLogs();
  });
  it('provider throws sensitive exception: generic HTTP response and no raw logs', async () => {
    signup().mockRejectedValue(sensitiveError());
    await safeResponse(await request(action), 503, unavailable);
    expect(signup()).toHaveBeenCalledOnce();
    safeLogs();
  });
  it('runtime origin initialization failure: generic HTTP response and no raw logs', async () => {
    mocks.origin.mockImplementation(() => { throw sensitiveError(); });
    await safeResponse(await request(action), 503, unavailable);
    expect(mocks.client).not.toHaveBeenCalled();
    safeLogs();
  });
  it('runtime client initialization failure: generic HTTP response and no raw logs', async () => {
    mocks.client.mockRejectedValue(sensitiveError());
    await safeResponse(await request(action), 503, unavailable);
    expect(mocks.gateway).not.toHaveBeenCalled();
    safeLogs();
  });
  it('runtime cookie initialization failure remains generic and unlogged', async () => {
    mocks.cookies.mockRejectedValue(sensitiveError());
    await safeResponse(await request(action), 503, unavailable);
    expect(mocks.client).not.toHaveBeenCalled();
    safeLogs();
  });
  it.each(['user_already_exists', 'email_exists'])('duplicate %s preserves non-enumerating response without raw logs', async code => {
    signup().mockResolvedValue({ error: Object.assign(sensitiveError(), { status: 400, code }) });
    await safeResponse(await request(action), 200, signupMessage);
    safeLogs();
  });
  it('immediate session still ends before returning confirmation instructions', async () => {
    signup().mockResolvedValue({ session: true });
    await safeResponse(await request(action), 200, signupMessage);
    expect(gateway.logout).toHaveBeenCalledOnce();
    expect(gateway.registerPerson).not.toHaveBeenCalled();
    expect(gateway.registerOrganization).not.toHaveBeenCalled();
    safeLogs();
  });
  it('logout failure after immediate session remains generic and unlogged', async () => {
    signup().mockResolvedValue({ session: true });
    gateway.logout.mockRejectedValue(sensitiveError());
    await safeResponse(await request(action), 503, unavailable);
    expect(gateway.logout).toHaveBeenCalledOnce();
    safeLogs();
  });
  it('rate limit preserves 429 without raw provider logs', async () => {
    signup().mockResolvedValue({ error: Object.assign(sensitiveError(), { status: 429, code: 'over_request_rate_limit' }) });
    await safeResponse(await request(action), 429, { message: 'Muitas tentativas. Aguarde antes de tentar novamente.' });
    safeLogs();
  });
});
