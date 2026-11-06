import { test, expect } from '@playwright/test';

test('GG-01: governança pública retorna 200 e identifica editor e canal', async ({ page }) => {
  const response = await page.goto('/governanca');
  expect(response.status()).toBe(200);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Governança provisória', exact: true })).toBeVisible();
  await expect(main).toContainText('Marcos Antonio Maia Júnior');
  await expect(main).toContainText('muralitaperuna@gmail.com');
});

test('GG-02: footer da home oferece link Governança', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Governança', exact: true })).toHaveAttribute('href', '/governanca');
});

test('GG-03: footer oferece canal de contestação por e-mail', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Contestar', exact: true })).toHaveAttribute('href', 'mailto:muralitaperuna@gmail.com');
});
