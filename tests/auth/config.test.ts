import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { appOrigin, localConfig } from '../../src/lib/supabase/config.server';

afterEach(() => vi.unstubAllEnvs());
function configure(mode: 'production' | 'development', url: string) {
  vi.stubEnv('NODE_ENV', mode);
  vi.stubEnv('APP_ORIGIN', mode === 'production' ? 'https://apraca.example' : 'http://127.0.0.1:3215');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
}
describe('configuração por ambiente', () => {
  it.each(['sb_publishable_fixture', 'eyJ_fixture_legacy_key', 'opaque_fixture_key20'])('aceita chave opaca com tamanho mínimo: %s', key => {
    configure('production', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', key);
    expect(localConfig().key).toBe(key);
  });
  it.each([undefined, '', ' '.repeat(25), 'a'.repeat(19), 'sb_publishable_', 'eyJ'])('rejeita chave ausente ou curta: %s', key => {
    configure('production', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', key);
    expect(() => localConfig()).toThrow('Chave pública do Supabase inválida.');
  });
  it('aceita o endpoint local em desenvolvimento', () => {
    configure('development', 'http://127.0.0.1:56151');
    expect(localConfig().url).toBe('http://127.0.0.1:56151');
  });
  it('aceita o projeto Cloud e a origem HTTPS em produção', () => {
    configure('production', 'https://nlvgfrblxckrpflpdemj.supabase.co');
    expect(localConfig().url).toBe('https://nlvgfrblxckrpflpdemj.supabase.co');
    expect(appOrigin()).toBe('https://apraca.example');
  });
  it.each([
    'http://nlvgfrblxckrpflpdemj.supabase.co', 'http://127.0.0.1:56151',
    'https://192.0.2.1', 'https://project.supabase.co.evil.example',
    'https://project.supabase.co@evil.example', 'https://evil.example/?x=.supabase.co',
    'https://user:password@project.supabase.co', 'https://project.supabase.co:8443',
    'https://project.supabase.co/path', 'https://project.supabase.co?x=1',
  ])('rejeita URL suspeita em produção: %s', url => {
    configure('production', url);
    expect(() => localConfig()).toThrow();
  });
  it.each(['http://127.0.0.1:9999', 'http://127.0.0.1.evil.example:56151', 'https://project.supabase.co'])('restringe desenvolvimento ao endpoint exato: %s', url => {
    configure('development', url);
    expect(() => localConfig()).toThrow();
  });
  it('exige APP_ORIGIN HTTPS explícita em produção', () => {
    configure('production', 'https://project.supabase.co');
    vi.stubEnv('APP_ORIGIN', undefined);
    expect(() => appOrigin()).toThrow();
    vi.stubEnv('APP_ORIGIN', 'http://apraca.example');
    expect(() => appOrigin()).toThrow();
  });
});

import { handleMutation } from '../../src/lib/auth/http.server';
describe('PROD-11 — proveniência e formato do deployment',()=>{
 const host='digitap-fixture-team.vercel.app';
 async function status(origin:string){
  const response=await handleMutation(new Request(origin+'/api/auth/login',{method:'POST',headers:{origin,host:new URL(origin).host,'content-type':'application/json'},body:'{}'}),appOrigin(),vi.fn().mockResolvedValue({message:'Ok'}));
  return response.status;
 }
 it.each(['production','preview'])('habilita o hostname exato no ambiente Vercel %s',async mode=>{
  configure('production','https://fixture.supabase.co');vi.stubEnv('VERCEL','1');vi.stubEnv('VERCEL_ENV',mode);vi.stubEnv('VERCEL_URL',host);
  expect(appOrigin()).toBe('https://apraca.example');expect(await status('https://'+host)).toBe(200);
 });
 it.each([undefined,'',' '+host,host+' ', 'https://'+host,host+':443',host+'/',host+'?x=1',host+'#x','user@'+host,host+'.evil.example','*.vercel.app','-bad.vercel.app','bad..vercel.app','bad_name.vercel.app','vercel.app','a'.repeat(64)+'.vercel.app','bad%2ehost.vercel.app'])('ignora VERCEL_URL ausente ou malformada: %s',async value=>{
  configure('production','https://fixture.supabase.co');vi.stubEnv('VERCEL','1');vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VERCEL_URL',value);
  expect(await status('https://'+host)).toBe(403);expect(await status(appOrigin())).toBe(200);
 });
 it.each([[undefined,'production'],['0','production'],['1',undefined],['1','development']])('exige contexto Vercel: %s / %s',async(vercel,mode)=>{
  configure('production','https://fixture.supabase.co');vi.stubEnv('VERCEL',vercel);vi.stubEnv('VERCEL_ENV',mode);vi.stubEnv('VERCEL_URL',host);
  expect(await status('https://'+host)).toBe(403);expect(await status(appOrigin())).toBe(200);
 });
 it('preserva desenvolvimento mesmo com variáveis Vercel presentes',async()=>{
  configure('development','http://127.0.0.1:56151');vi.stubEnv('VERCEL','1');vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VERCEL_URL',host);
  expect(await status(appOrigin())).toBe(200);expect(await status('https://'+host)).toBe(403);
 });
});
