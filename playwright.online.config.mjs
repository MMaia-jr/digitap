import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/online-readonly',
  testMatch: '**/*.spec.mjs',
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  outputDir: './test-results/online-readonly',
  use: {
    baseURL: 'https://www.digitap.com.br',
    browserName: 'chromium',
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
