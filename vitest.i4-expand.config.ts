// ENV BLOCKER: execução requer Supabase local rodando (portas 56151/56152).
// O setup atual usa execFileSync para CLI Supabase, que é bloqueada pelo sandbox.
// Fix pendente: trocar por conexão direta via 'pg' (node-postgres), já dependência do projeto.
// Status: RED não comprovado; EXPAND bloqueado até ambiente preparado.
import { defineConfig } from 'vitest/config';

// Explicit opt-in; never changes the I3 suites or their assertions.
export default defineConfig({ test: { include: ['tests/i4/expand.database.test.ts'], fileParallelism: false } });
