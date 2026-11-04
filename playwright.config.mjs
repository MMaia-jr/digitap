import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e', testMatch:'**/*.spec.mjs', workers:1,
  retries:0, timeout:90000, expect:{timeout:15000},
  outputDir:'.playwright-results',
  reporter:[['./tests/e2e/reporter.mjs']],
  use:{baseURL:'http://127.0.0.1:3215',headless:true,trace:'off',video:'off',screenshot:'off'},
  projects:[{name:'chromium',use:{browserName:'chromium'}}],
});
