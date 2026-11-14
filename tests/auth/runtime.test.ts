import {afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('../../src/lib/supabase/server',()=>({userClient:vi.fn().mockRejectedValue(new Error('sem configuração')),clearAuthCookies:vi.fn()}));
import { mutation } from '../../src/lib/auth/runtime.server';
import { userClient } from '../../src/lib/supabase/server';
describe('validação sem banco nem SDK inicializado',()=>{
 it('payload inválido é rejeitado antes de instanciar Auth',async()=>{
  const response=await mutation('signup',new Request('http://127.0.0.1:3215/api/auth/cadastro',{method:'POST',headers:{origin:'http://127.0.0.1:3215','content-type':'application/json'},body:JSON.stringify({email:'inválido',password:'curta'})}));
  expect(response.status).toBe(422);expect(userClient).not.toHaveBeenCalled();
 });
});

afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe('PROD-11 — rejeição antes de Auth',()=>{
 it.each(['signup','signup_pf','signin','recover'] as const)('bloqueia %s sem inicializar cliente nem cookies',async action=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('APP_ORIGIN','https://canonical.example');
  vi.stubEnv('VERCEL','1');vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VERCEL_URL','digitap-fixture-team.vercel.app');
  const {clearAuthCookies}=await import('../../src/lib/supabase/server');
  const response=await mutation(action,new Request('https://evil.example/api/auth/login',{method:'POST',headers:{origin:'https://evil.example',host:'evil.example','content-type':'application/json'},body:JSON.stringify({email:'synthetic@example.invalid',password:'SyntheticOnlyPassword!'})}));
  expect(response.status).toBe(403);expect(await response.json()).toEqual({message:'Origem não permitida.'});
  expect(userClient).not.toHaveBeenCalled();expect(clearAuthCookies).not.toHaveBeenCalled();
 });
});

it('MVP: runtime encaminha ao SDK somente o deployment aprovado pelo handler',async()=>{
 vi.stubEnv('NODE_ENV','production');vi.stubEnv('APP_ORIGIN','https://canonical.example');vi.stubEnv('VERCEL','1');vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('VERCEL_URL','digitap-fixture-team.vercel.app');
 const signUp=vi.fn().mockResolvedValue({data:{},error:null});
 vi.mocked(userClient).mockResolvedValueOnce({auth:{signUp}} as never);
 const {clearAuthCookies}=await import('../../src/lib/supabase/server');vi.mocked(clearAuthCookies).mockResolvedValueOnce(vi.fn());
 const origin='https://digitap-fixture-team.vercel.app';
 const response=await mutation('signup',new Request(origin+'/api/auth/cadastro',{method:'POST',headers:{origin,host:'digitap-fixture-team.vercel.app','content-type':'application/json'},body:JSON.stringify({email:'synthetic@example.invalid',password:'SyntheticOnlyPassword!'})}));
 expect(response.status).toBe(200);expect(signUp).toHaveBeenCalledWith({email:'synthetic@example.invalid',password:'SyntheticOnlyPassword!',options:{emailRedirectTo:origin+'/auth/confirm'}});
});
