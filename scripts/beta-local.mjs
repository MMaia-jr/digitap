import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = process.cwd();
const mode = process.argv[2] ?? 'check';
const evidenceDir = process.env.A_PRACA_EVIDENCE_DIR ?? 'operations/evidence/beta-demo-20261116';

function stop(message) {
  console.error(`BETA BLOQUEADO: ${message}`);
  process.exitCode = 1;
}

function nodeSupported(version) {
  const [, major, minor, patch] = version.match(/^v?(\d+)\.(\d+)\.(\d+)/) ?? [];
  if (!major) return false;
  const value = [Number(major), Number(minor), Number(patch)];
  const atLeast = (minimum) => value[0] > minimum[0]
    || (value[0] === minimum[0] && (value[1] > minimum[1]
      || (value[1] === minimum[1] && value[2] >= minimum[2])));
  return (value[0] === 22 && atLeast([22, 22, 2]))
    || (value[0] === 24 && atLeast([24, 15, 0]))
    || value[0] >= 26;
}

async function preflight() {
  if (mode !== 'check' && mode !== 'demo') return stop('use `check` ou `demo`.');
  if (!existsSync(path.join(root, 'supabase/config.toml')) || !existsSync(path.join(root, 'package-lock.json'))) {
    return stop('execute na raiz do checkout DigItap.');
  }
  if (!nodeSupported(process.version)) return stop(`Node ${process.version} não atende ao engines do package.json.`);
  if (!existsSync(path.join(root, 'node_modules/.bin/next')) || !existsSync(path.join(root, 'node_modules/.bin/supabase'))) {
    return stop('dependências locais ausentes; este procedimento não instala pacotes.');
  }
  if (!/^operations\/evidence\/[a-zA-Z0-9-]+$/.test(evidenceDir)) return stop('diretório de evidências inválido.');

  let local;
  try {
    local = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', root, '--output', 'json'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
    }));
  } catch {
    return stop('não foi possível consultar a stack Supabase local; nenhum serviço foi iniciado.');
  }

  let api, database;
  try { api = new URL(local.API_URL); database = new URL(local.DB_URL); }
  catch { return stop('configuração local ausente ou inválida.'); }
  if (api.origin !== 'http://127.0.0.1:56151' || database.hostname !== '127.0.0.1' || database.port !== '56152') {
    return stop('destinos Supabase não correspondem ao loopback local autorizado.');
  }
  if (!local.SECRET_KEY?.startsWith('sb_secret_') || !local.PUBLISHABLE_KEY?.startsWith('sb_publishable_')) {
    return stop('chaves locais ausentes ou em formato inesperado.');
  }

  const client = new pg.Client({ connectionString: local.DB_URL, connectionTimeoutMillis: 2000 });
  try {
    await client.connect();
    const applied = new Set((await client.query('select version::text from supabase_migrations.schema_migrations')).rows.map(row => row.version));
    const migrationFiles = readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'));
    const pending = migrationFiles.filter(name => /^\d+_/.test(name) && !applied.has(name.split('_', 1)[0]));
    const syntheticUsers = Number((await client.query('select count(*)::int as count from auth.users where email like $1', ['%@example.invalid'])).rows[0].count);
    if (pending.length) {
      console.error(`Migrações locais pendentes (não aplicadas): ${pending.join(', ')}`);
      return stop('histórico local diverge dos arquivos; revisar antes da demonstração.');
    }
    if (syntheticUsers) return stop(`${syntheticUsers} contas sintéticas @example.invalid residuais; investigar e limpar somente com escopo autorizado.`);
    console.log(`Preflight PASS — Node ${process.version}; API/Auth ${api.hostname}:${api.port}; PostgreSQL ${database.hostname}:${database.port}; ${migrationFiles.length} migrations reconhecidas e sem pendências; 0 contas Auth @example.invalid.`);
  } catch {
    return stop('PostgreSQL local indisponível ou consulta de preflight falhou; detalhes privados omitidos.');
  } finally {
    await client.end().catch(() => {});
  }

  if (mode === 'check') return;

  const preload = path.join(root, 'tests/e2e/helpers/gateway-preload.mjs');
  const inheritedOptions = process.env.NODE_OPTIONS?.trim();
  const env = {
    ...process.env,
    A_PRACA_ALLOW_FIXTURE_CLEANUP: '1',
    A_PRACA_EVIDENCE_DIR: evidenceDir,
    DIGITAP_E1_GATEWAY_MOCK: '1',
    AI_GATEWAY_API_KEY: 'e1-synthetic-only',
    NODE_OPTIONS: [inheritedOptions, `--import=${preload}`].filter(Boolean).join(' '),
    NEXT_TELEMETRY_DISABLED: '1',
  };
  console.log('Iniciando demonstração em loopback. A interpretação de propostas usa mock sintético fail-closed; o Gateway real não será chamado. Ctrl-C encerra somente o Next iniciado pelo supervisor.');
  const child = spawn(process.execPath, ['scripts/e2e-server.mjs'], { cwd: root, env, stdio: 'inherit' });
  process.once('SIGINT', () => child.kill('SIGINT'));
  process.once('SIGTERM', () => child.kill('SIGTERM'));
  child.once('error', () => stop('não foi possível iniciar o supervisor local.'));
  child.once('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

await preflight();
