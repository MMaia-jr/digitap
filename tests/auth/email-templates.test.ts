import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const config = readFileSync(resolve('supabase/config.toml'), 'utf8');
describe('templates de Auth resolvidos pela CLI a partir da raiz do projeto', () => {
  it.each(['confirmation', 'recovery'])('%s aponta para arquivo local existente', name => {
    const section = config.split(`[auth.email.template.${name}]`)[1]?.split('\n[')[0];
    const relative = section?.match(/content_path\s*=\s*"([^"]+)"/)?.[1];
    expect(relative).toBeTruthy();
    const file = resolve(relative!);
    expect(file.startsWith(resolve('supabase/templates') + '/')).toBe(true);
    expect(existsSync(file)).toBe(true);
  });
});
