import { describe, it, expect, vi } from 'vitest';
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
