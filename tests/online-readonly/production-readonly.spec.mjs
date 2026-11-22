import { test as base, expect } from '@playwright/test';

function safePath(raw) {
  try {
    return new URL(raw).pathname
      .replace(/\/perfil\/[^/]+/g, '/perfil/[subject]')
      .replace(/\/atividades\/[^/]+(?=\/|$)/g, '/atividades/[id]')
      .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/ig, '/[id]');
  } catch {
    return '[path]';
  }
}

const test = base.extend({
  readOnlyMonitor: [async ({ context, page }, use) => {
    const blockedWrites = [];
    const consoleErrors = [];
    const serverErrors = [];

    await context.route('**/*', async (route) => {
      const request = route.request();
      if (request.method() !== 'GET' && request.method() !== 'HEAD') {
        blockedWrites.push(`${request.method()} ${safePath(request.url())}`);
        await route.abort();
        return;
      }
      await route.continue();
    });

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push('browser console error');
    });
    page.on('pageerror', (error) => {
      consoleErrors.push(`page error: ${error.name || 'Error'}`);
    });
    page.on('response', (response) => {
      const request = response.request();
      if (response.status() >= 500 && ['document', 'fetch', 'xhr'].includes(request.resourceType())) {
        serverErrors.push(`${response.status()} ${safePath(response.url())}`);
      }
    });
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText || 'request failed';
      if (!reason.includes('ERR_ABORTED') && ['document', 'fetch', 'xhr'].includes(request.resourceType())) {
        serverErrors.push(`${reason.split(':')[0]} ${safePath(request.url())}`);
      }
    });

    await use({ blockedWrites, consoleErrors, serverErrors });

    expect(blockedWrites, 'the public-site gate must not issue writes').toEqual([]);
    expect(consoleErrors, 'the visited route must not emit browser errors').toEqual([]);
    expect(serverErrors, 'the visited route must not return server errors').toEqual([]);
  }, { auto: true }],
});

const email = (page) => page.locator('input[type="email"]');
const password = (page) => page.locator('input[type="password"]');

test('visitante: home apresenta proposta e caminhos públicos', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A vida acontece.*se encontra/i })).toBeVisible();
  await expect(page.locator('a[href="/encontros"]').first()).toBeVisible();
  await expect(page.locator('a[href="/cadastro"]').first()).toBeVisible();
  await expect(page.locator('a[href="/login"]').first()).toBeVisible();
});

test('visitante: link Encontros abre a jornada pública', async ({ page }) => {
  await page.goto('/');
  // The public page hydrates before this client-side link is interactive.
  await page.waitForTimeout(3000);
  await page.getByRole('link', { name: 'Encontros', exact: true }).click();
  await expect(page).toHaveURL(/\/encontros$/);
  await expect(page.getByRole('heading', { name: 'Descobrir compatibilidades' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pedidos de ajuda em atividades' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compatibilidades encontradas' })).toBeVisible();
});

test('visitante: login mostra formulário sem autenticar', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
  await expect(email(page)).toHaveCount(1);
  await expect(password(page)).toHaveCount(1);
});

test('visitante: cadastro PF mostra primeiro passo sem criar conta', async ({ page }) => {
  await page.goto('/cadastro');
  await expect(page.getByRole('heading', { name: 'Crie seu acesso como pessoa física' })).toBeVisible();
  await expect(email(page)).toHaveCount(1);
  await expect(password(page)).toHaveCount(1);
  await expect(page.locator('a[href="/cadastro/organizacao"]').first()).toBeVisible();
});

test('visitante: cadastro organizacional explica confirmação de e-mail', async ({ page }) => {
  await page.goto('/cadastro/organizacao');
  await expect(page.getByRole('heading', { name: 'Crie seu acesso' })).toBeVisible();
  await expect(page.getByText('Confirme seu e-mail antes de cadastrar a organização.')).toBeVisible();
  await expect(email(page)).toHaveCount(1);
  await expect(password(page)).toHaveCount(1);
});

test('visitante: recuperação de acesso oferece formulário de e-mail', async ({ page }) => {
  await page.goto('/recuperar-acesso');
  await expect(page.getByRole('heading', { name: 'Recupere seu acesso' })).toBeVisible();
  await expect(email(page)).toHaveCount(1);
  await expect(password(page)).toHaveCount(0);
});

test('visitante anônimo: dashboard PF redireciona para login', async ({ page }) => {
  await page.goto('/dashboard/pessoa-fisica');
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
});

test('visitante: atividades públicas mostra listagem ou estado vazio explícito', async ({ page }) => {
  await page.goto('/atividades');
  await expect(page.getByRole('heading', { name: 'Atividades publicadas' })).toBeVisible();
  const detailPaths = await page.locator('main a[href]').evaluateAll((links) => links
    .map((link) => new URL(link.href).pathname)
    .filter((path) => /^\/atividades\/[^/]+\/?$/.test(path)));
  if (detailPaths.length === 0) {
    await expect(page.getByText('Nenhuma atividade publicada disponível.')).toBeVisible();
    test.info().annotations.push({
      type: 'production-data',
      description: 'No public activity is currently available; details cannot be exercised without published data.',
    });
  } else {
    await expect(page.locator(`main a[href="${detailPaths[0]}"]`).first()).toBeVisible();
  }
});

test('visitante: detalhe de atividade pública, quando houver atividade publicada', async ({ page }) => {
  await page.goto('/atividades');
  const detailPaths = await page.locator('main a[href]').evaluateAll((links) => links
    .map((link) => new URL(link.href).pathname)
    .filter((path) => /^\/atividades\/[^/]+\/?$/.test(path)));
  test.skip(detailPaths.length === 0, 'Production has no public activities; a detail page cannot be reached without data.');
  await page.locator(`main a[href="${detailPaths[0]}"]`).first().click();
  await expect(page).toHaveURL(/\/atividades\/[^/]+\/?$/);
  await expect(page.locator('main h1').first()).toBeVisible();
});

// All navigation above is anonymous and read-only; no field is filled and no submit control is clicked.
