import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['tests/i4/expand.database.test.ts'], fileParallelism: false } });
