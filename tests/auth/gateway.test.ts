import { afterEach,describe,it,expect,vi } from 'vitest';
import { createGateway } from '../../src/lib/auth/gateway.server';
vi.mock('server-only',()=>({}));
afterEach(()=>vi.unstubAllEnvs());
const setup=()=>{
 const auth={signUp:vi.fn().mockResolvedValue({data:{user:null,session:null},error:null}),signInWithPassword:vi.fn().mockResolvedValue({data:{user:{id:'ficticio'},session:{}},error:null}),resetPasswordForEmail:vi.fn().mockResolvedValue({data:{},error:null}),verifyOtp:vi.fn().mockResolvedValue({data:{user:{id:'ficticio'},session:{}},error:null}),updateUser:vi.fn().mockResolvedValue({data:{user:{}},error:null}),signOut:vi.fn().mockResolvedValue({error:null}),getUser:vi.fn().mockResolvedValue({data:{user:{id:'ficticio'}},error:null})};
 const maybeSingle=vi.fn().mockResolvedValue({data:null,error:null});const eq=vi.fn().mockReturnValue({maybeSingle});const select=vi.fn().mockReturnValue({eq});const from=vi.fn().mockReturnValue({select});const rpc=vi.fn().mockResolvedValue({data:'org-ficticia',error:null});
 const clear=vi.fn();const admin=vi.fn().mockReturnValue({from,rpc});
 return {auth,clear,rpc,admin,gateway:createGateway({auth} as never,admin,clear)};
};
describe('adapter do fluxo com SDK simulado',()=>{
 it.each([
  ['production','https://www.digitap.com.br/auth/confirm'],
  ['development','http://127.0.0.1:3215/auth/confirm'],
 ] as const)('recuperação usa redirectTo no ambiente %s',async(mode,redirectTo)=>{
  vi.stubEnv('NODE_ENV',mode);
  vi.stubEnv('APP_ORIGIN','http://127.0.0.1:3215');
  const s=setup();
  expect(await s.gateway.recover('a@example.invalid')).toEqual({error:null});
  expect(s.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@example.invalid',{redirectTo});
 });
 it('cadastro não envia nome/role como metadata e não instancia serviço',async()=>{const s=setup();await s.gateway.signUp('a@example.invalid','senha-ficticia');expect(s.auth.signUp).toHaveBeenCalledWith({email:'a@example.invalid',password:'senha-ficticia'});expect(s.admin).not.toHaveBeenCalled();});
 it('verifica OTP com tipo explícito',async()=>{const s=setup();await s.gateway.verify('hash','recovery');expect(s.auth.verifyOtp).toHaveBeenCalledWith({token_hash:'hash',type:'recovery'});});
 it('RPC COMPAT recebe somente identidade derivada e nome',async()=>{const s=setup();expect(await s.gateway.registerOrganization('user-ficticio','Organização Fictícia')).toEqual({organizacao_id:'org-ficticia'});expect(s.rpc).toHaveBeenCalledWith('criar_organizacao_com_sujeito',{p_auth_user_id:'user-ficticio',p_nome_publico:'Organização Fictícia',p_canal_publico:null});});
 it('logout local limpa cookies mesmo quando provider falha',async()=>{const s=setup();s.auth.signOut.mockRejectedValue(new Error('privado'));await expect(s.gateway.logout()).rejects.toThrow();expect(s.clear).toHaveBeenCalledOnce();});
 it('logout usa escopo local',async()=>{const s=setup();await s.gateway.logout();expect(s.auth.signOut).toHaveBeenCalledWith({scope:'local'});expect(s.clear).toHaveBeenCalledOnce();});
 it('erro de RPC não se transforma em sucesso',async()=>{const s=setup();s.rpc.mockResolvedValue({data:null,error:{code:'42501'}} as never);await expect(s.gateway.registerOrganization('u','Fictícia')).rejects.toMatchObject({status:403});});
});
