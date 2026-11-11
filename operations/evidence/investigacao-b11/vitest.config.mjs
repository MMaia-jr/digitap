import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['operations/evidence/investigacao-b11/diagnostic.test.tsx'],environment:'jsdom',fileParallelism:false}});
