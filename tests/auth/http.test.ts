import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { handleMutation } from '../../src/lib/auth/http.server';
import { FlowError } from '../../src/lib/auth/flow.server';
vi.mock('server-only', () => ({}));
const origin='http://127.0.0.1:3215';
const request=(body: string, headers: Record<string,string>={}) => new Request(origin+'/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body});
describe('rotas simuladas: fronteira HTTP', () => {
  it('bloqueia origem externa antes de criar cliente privilegiado',async()=>{
    const run=vi.fn();const response=await handleMutation(request('{}',{origin:'https://externo.invalid'}),origin,run);
    expect(response.status).toBe(403);expect(run).not.toHaveBeenCalled();
  });
  it('bloqueia origem ausente ou null',async()=>{
    const run=vi.fn();const r=request('{}');r.headers.delete('origin');expect((await handleMutation(r,origin,run)).status).toBe(403);
    expect((await handleMutation(request('{}',{origin:'null'}),origin,run)).status).toBe(403);
  });
  it('bloqueia fetch cross-site mesmo com origem falsamente coerente',async()=>{
    const run=vi.fn();expect((await handleMutation(request('{}',{'sec-fetch-site':'cross-site'}),origin,run)).status).toBe(403);expect(run).not.toHaveBeenCalled();
  });
  it('bloqueia conteúdo não JSON e JSON malformado',async()=>{
    const run=vi.fn();expect((await handleMutation(request('{}',{'content-type':'text/plain'}),origin,run)).status).toBe(415);
    expect((await handleMutation(request('{'),origin,run)).status).toBe(400);expect(run).not.toHaveBeenCalled();
  });
  it('limita corpo mesmo sem Content-Length',async()=>{
    const run=vi.fn();expect((await handleMutation(request('a'.repeat(9000)),origin,run)).status).toBe(413);expect(run).not.toHaveBeenCalled();
  });
  it('permite limite maior explicitamente configurado sem mudar o padrão das rotas Auth',async()=>{
    const run=vi.fn().mockResolvedValue({message:'Ok'});const response=await handleMutation(request(JSON.stringify({texto:'x'.repeat(9000)})),origin,run,12000);
    expect(response.status).toBe(200);expect(run).toHaveBeenCalledOnce();
  });
  it('encaminha somente JSON validado e impede cache',async()=>{
    const run=vi.fn().mockResolvedValue({message:'Ok'});const response=await handleMutation(request('{"nome_publico":"Fictícia"}'),origin,run);
    expect(run).toHaveBeenCalledWith({nome_publico:'Fictícia'});expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('erros de campos são explícitos sem devolver credenciais',async()=>{
    const run=vi.fn().mockRejectedValue(new FlowError(422,'Confira os campos.',{email:'Inválido'}));const response=await handleMutation(request('{}'),origin,run);
    expect(response.status).toBe(422);expect(await response.json()).toEqual({message:'Confira os campos.',fields:{email:'Inválido'}});
  });
  it('erro inesperado é sanitizado',async()=>{
    const run=vi.fn().mockRejectedValue(new Error('senha-segredo'));const response=await handleMutation(request('{}'),origin,run);
    expect(response.status).toBe(503);expect(await response.text()).not.toContain('senha-segredo');
  });
});

describe('origem do host',()=>{
 it('recusa Host incompatível mesmo com Origin local',async()=>{
   const run=vi.fn();const response=await handleMutation(request('{}',{host:'externo.invalid'}),origin,run);
   expect(response.status).toBe(403);expect(run).not.toHaveBeenCalled();
 });
});

const canonical='https://canonical.example';
const deploymentHost='digitap-fixture-team.vercel.app';
const deploymentOrigin=`https://${deploymentHost}`;
afterEach(()=>vi.unstubAllEnvs());
describe('PROD-11 — origens exatas e CSRF',()=>{
 beforeEach(()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('APP_ORIGIN',canonical);
  vi.stubEnv('VERCEL','1');vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VERCEL_URL',deploymentHost);
 });
 function req(value:string|undefined,host:string|undefined,extra:Record<string,string>={}){
  return new Request(deploymentOrigin+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json',...(value===undefined?{}:{origin:value}),...(host===undefined?{}:{host}),...extra},body:'{}'});
 }
 it.each([[canonical,'canonical.example'],[deploymentOrigin,deploymentHost]])('autoriza origem e host correspondentes: %s',async(value,host)=>{
  const run=vi.fn().mockResolvedValue({message:'Ok'});
  expect((await handleMutation(req(value,host),canonical,run)).status).toBe(200);expect(run).toHaveBeenCalledOnce();
 });
 it.each([
  ['https://other-team.vercel.app','other-team.vercel.app',{}],
  [deploymentOrigin+'.evil.example',deploymentHost+'.evil.example',{}],
  ['https://user@'+deploymentHost,deploymentHost,{}],
  [deploymentOrigin+'/path',deploymentHost,{}],[deploymentOrigin+':443',deploymentHost,{}],
  [undefined,deploymentHost,{}],['null',deploymentHost,{}],
  [deploymentOrigin,'evil.example',{}],
  [deploymentOrigin,'evil.example',{'x-forwarded-host':deploymentHost}],
  [deploymentOrigin,deploymentHost,{'sec-fetch-site':'cross-site'}],
  [canonical,deploymentHost,{}],[deploymentOrigin,'canonical.example',{}],
 ] as const)('rejeita origem/host incompatíveis: %s / %s',async(value,host,extra)=>{
  const run=vi.fn();const response=await handleMutation(req(value,host,extra),canonical,run);
  expect(response.status).toBe(403);expect(run).not.toHaveBeenCalled();
  expect(await response.json()).toEqual({message:'Origem não permitida.'});
  expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
  expect(response.headers.get('pragma')).toBe('no-cache');expect(response.headers.get('referrer-policy')).toBe('no-referrer');
 });
 it('não amplia a origem explicitamente passada por outro consumidor',async()=>{
  const run=vi.fn();expect((await handleMutation(req(deploymentOrigin,deploymentHost),'https://other.example',run)).status).toBe(403);expect(run).not.toHaveBeenCalled();
 });
});
