import { defineConfig } from 'vitest/config';
// Never part of default unit/component run. Requires an isolated real stack.
export default defineConfig({test:{include:['tests/security/database.test.ts','tests/integration/**/*.test.ts'],fileParallelism:false}});
