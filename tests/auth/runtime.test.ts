import {describe,it,expect,vi} from 'vitest';
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
