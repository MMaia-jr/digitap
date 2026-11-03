import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['tests/security/access.test.ts','tests/security/adapter.test.ts','tests/auth/**/*.test.ts','tests/components/**/*.test.tsx'],restoreMocks:true}});
