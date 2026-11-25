import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const origin = 'http://127.0.0.1:3215';
const supabaseOrigin = 'http://127.0.0.1:56151';
test.use({ launchOptions: { chromiumSandbox: true } });

test('CAP-01: PF salva uma declaração privada multilinha e a recupera após recarregar', async ({ page }) => {
  if (process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1') throw new Error('CAP-01 exige escopo de fixtures locais.');
  const config = JSON.parse(execFileSync('./node_modules/.bin/supabase', ['status', '--workdir', process.cwd(), '--output', 'json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }));
  const dbUrl = new URL(config.DB_URL);
  if (config.API_URL !== supabaseOrigin || dbUrl.hostname !== '127.0.0.1' || dbUrl.port !== '56152' || dbUrl.pathname !== '/postgres') {
    throw new Error('CAP-01 exige Supabase local.');
  }
  const db = new Client(config.DB_URL);
  await db.connect();
  const admin = createClient(supabaseOrigin, config.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `cap-01-${randomUUID()}@example.invalid`;
  const password = `${randomUUID()}aA1!`;
  let userId, subjectId;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    userId = created.data.user.id;
    const profile = await admin.rpc('criar_pf_com_sujeito', { p_auth_user_id: userId, p_nome_publico: 'PF sintética CAP-01' });
    expect(profile.error).toBeNull();
    subjectId = profile.data;
    await page.context().route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || url.pathname === '/api/propostas/interpretar') return route.abort();
      return route.continue();
    });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page).toHaveURL(origin + '/');
    await page.goto('/meu-espaco/capacidades');

    const input = page.getByLabel('Descrição', { exact: true });
    const submit = page.getByRole('button', { name: 'Salvar capacidade privada' });
    const save = async () => {
      const response = page.waitForResponse(r => r.url() === origin + '/api/e4' && r.request().method() === 'POST');
      await submit.click();
      return response;
    };
    const persisted = () => db.query('select descricao, condicoes, visibilidade from public.capacidades where sujeito_id=$1', [subjectId]);
    await input.fill('Oficina <inválida>');
    expect((await save()).status()).toBe(422);
    await expect(page.getByText('Confira os dados informados.', { exact: true })).toBeVisible();
    await expect(input).toHaveValue('Oficina <inválida>');
    expect((await persisted()).rowCount).toBe(0);

    const description = 'Facilito oficinas de leitura.\nTambém organizo rodas de conversa.';
    const conditions = 'Encontros a combinar.\nSem compromisso prévio.';
    await input.fill(description);
    await page.getByLabel('Condições de colaboração').fill(conditions);
    expect((await save()).status()).toBe(200);
    await expect(page.getByRole('status')).toContainText('Capacidade salva');
    const row = page.getByRole('article').filter({ hasText: 'Facilito oficinas de leitura.' });
    await expect(row).toContainText('Privada');
    expect((await persisted()).rows).toEqual([{ descricao: description, condicoes: conditions, visibilidade: 'privada' }]);
    await page.reload();
    await expect(row).toContainText('Também organizo rodas de conversa.');
    await expect(row).toContainText('Privada');
  } finally {
    try {
      if (userId) {
        await db.query('begin');
        try {
          await db.query('delete from public.capacidades where sujeito_id=$1', [subjectId]);
          await db.query('delete from public.vinculos_publicadores where sujeito_id=$1', [subjectId]);
          await db.query('delete from public.pessoas_fisicas where sujeito_id=$1', [subjectId]);
          await db.query('delete from public.sujeitos_publicadores where id=$1', [subjectId]);
          await db.query('delete from public.contas_acesso where auth_user_id=$1', [userId]);
          await db.query('commit');
        } catch (error) { await db.query('rollback'); throw error; }
        expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
        expect((await db.query('select exists(select 1 from auth.users where id=$1) or exists(select 1 from public.capacidades where sujeito_id=$2) as residual', [userId, subjectId])).rows[0].residual).toBe(false);
      }
    } finally { await db.end(); }
  }
});
