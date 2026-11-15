import { it, expect, vi } from 'vitest';
import { executeAuth, type AuthAction, type AuthGateway } from '../../src/lib/auth/flow.server';
import { createGateway } from '../../src/lib/auth/gateway.server';
import { authorize } from '../../src/lib/auth/permissions.server';
vi.mock('server-only',()=>({}));
const id='11111111-1111-4111-8111-111111111111';
const user={id,email_confirmed_at:'2026-11-06',user_metadata:{tipo:'pessoa_fisica',nome_publico:'Pessoa Fictícia'}};
const input={email:'pf@example.invalid',password:'SenhaFicticia123!',nome_publico:'Pessoa Fictícia'};
function fixture(){return {
 signUp:vi.fn().mockResolvedValue({}),signUpPF:vi.fn().mockResolvedValue({}),
 signIn:vi.fn().mockResolvedValue({user,session:true}),verify:vi.fn().mockResolvedValue({user,session:true}),
 currentUser:vi.fn().mockResolvedValue(user),account:vi.fn().mockResolvedValue(null),
 recover:vi.fn().mockResolvedValue({}),changePassword:vi.fn().mockResolvedValue({}),logout:vi.fn().mockResolvedValue({}),
 registerOrganization:vi.fn().mockResolvedValue({organizacao_id:id}),registerPerson:vi.fn().mockResolvedValue({sujeito_id:id}),
} satisfies AuthGateway;}
it('PF signup adia criação de conta/sujeito até e-mail confirmado',async()=>{
 const g=fixture();expect(await executeAuth('signup_pf' as AuthAction,input,g)).toMatchObject({message:expect.stringContaining('e-mail')});
 expect(g.signUpPF).toHaveBeenCalledWith(input.email,input.password,input.nome_publico);
 expect(g.registerPerson).not.toHaveBeenCalled();expect(g.signUp).not.toHaveBeenCalled();
});
it.each(['','<script>nome</script>'])('PF signup recusa nome inválido %j antes de Auth',async nome_publico=>{
 const g=fixture();await expect(executeAuth('signup_pf' as AuthAction,{...input,nome_publico},g)).rejects.toMatchObject({status:422});expect(g.signUpPF).not.toHaveBeenCalled();
});
it('PF-09 confirmação valida OTP sem antecipar perfil',async()=>{
 const g=fixture();expect(await executeAuth('confirm',{token_hash:'a'.repeat(64)},g)).toMatchObject({next:'/login'});
 expect(g.registerPerson).not.toHaveBeenCalled();expect(g.registerOrganization).not.toHaveBeenCalled();
});
it('confirmação sem e-mail confirmado não cria PF',async()=>{
 const g=fixture();g.verify.mockResolvedValue({user:{...user,email_confirmed_at:''},session:true});
 await expect(executeAuth('confirm',{token_hash:'a'.repeat(64)},g)).rejects.toMatchObject({status:422});expect(g.registerPerson).not.toHaveBeenCalled();expect(g.logout).toHaveBeenCalledOnce();
});
it('falha na RPC de conclusão pode ser repetida sem recriar identidade Auth',async()=>{
 const g=fixture();g.registerPerson.mockRejectedValueOnce(new Error('Falha fictícia RPC'));
 await expect(executeAuth('complete_pf',{nome_publico:input.nome_publico},g)).rejects.toMatchObject({status:503});
 expect(await executeAuth('complete_pf',{nome_publico:input.nome_publico},g)).toMatchObject({next:'/dashboard/pessoa-fisica'});
 expect(g.registerPerson).toHaveBeenCalledTimes(2);expect(g.signUpPF).not.toHaveBeenCalled();
});
it('PF login com conta própria volta à Praça, sem acesso editorial',async()=>{
 const g=fixture();g.account.mockResolvedValue({auth_user_id:id,papel:'publicador',situacao:'ativa',organizacao_id:null} as never);
 expect(await executeAuth('signin',{email:input.email,password:input.password},g)).toMatchObject({next:'/'});
});
it('metadata PF não muda papel editorial existente no banco',async()=>{
 const g=fixture();g.account.mockResolvedValue({auth_user_id:id,papel:'editor',situacao:'ativa',organizacao_id:null} as never);
 expect(await executeAuth('signin',{email:input.email,password:input.password},g)).toMatchObject({next:'/'});expect(g.registerPerson).not.toHaveBeenCalled();
});
it('PF-11 papel publicador não ganha autorização editorial',async()=>{
 await expect(authorize({verifyUser:async()=>user,findAccount:async()=>({auth_user_id:id,papel:'publicador',situacao:'ativa',organizacao_id:null} as never)},{action:'editorial'})).rejects.toMatchObject({status:403});
});
it('gateway PF usa metadata somente como intenção e RPC service-only',async()=>{
 const signUp=vi.fn().mockResolvedValue({data:{},error:null}),rpc=vi.fn().mockResolvedValue({data:id,error:null});
 const gateway=createGateway({auth:{signUp}} as never,()=>({rpc}) as never,()=>{});
 expect(gateway.signUpPF).toBeTypeOf('function');await gateway.signUpPF!(input.email,input.password,input.nome_publico);
 expect(signUp).toHaveBeenCalledWith({email:input.email,password:input.password,options:{emailRedirectTo:'http://127.0.0.1:3215/auth/confirm',data:{tipo:'pessoa_fisica',nome_publico:input.nome_publico}}});
 await gateway.registerPerson!(id,input.nome_publico);
 expect(rpc).toHaveBeenCalledWith('criar_pf_com_sujeito',{p_auth_user_id:id,p_nome_publico:input.nome_publico});
});

it('MVP: cadastro PF novo pede somente e-mail/senha e nunca cria perfil',async()=>{
 const g=fixture();await executeAuth('signup_pf',{email:input.email,password:input.password},g);
 expect(g.signUpPF).toHaveBeenCalledWith(input.email,input.password);
 expect(g.registerPerson).not.toHaveBeenCalled();
});
it('MVP: confirmação encerra sessão transitória e exige login sem criar PF',async()=>{
 const g=fixture();expect(await executeAuth('confirm',{token_hash:'a'.repeat(64)},g)).toMatchObject({next:'/login'});
 expect(g.logout).toHaveBeenCalledOnce();expect(g.registerPerson).not.toHaveBeenCalled();
});
it.each([undefined,{tipo:'pessoa_fisica'},{tipo:'organizacao'},{papel:'administrador'}])('conta sem perfil volta à Praça independentemente de metadata %j',async metadata=>{
 const g=fixture();g.signIn.mockResolvedValue({user:{id,email_confirmed_at:user.email_confirmed_at,user_metadata:metadata} as unknown as typeof user,session:true});
 expect(await executeAuth('signin',{email:input.email,password:input.password},g)).toMatchObject({next:'/'});
 expect(g.registerPerson).not.toHaveBeenCalled();expect(g.registerOrganization).not.toHaveBeenCalled();expect(g.logout).not.toHaveBeenCalled();
});
it('MVP: perfil só é criado por conclusão explícita após identidade confirmada',async()=>{
 const g=fixture();expect(await executeAuth('complete_pf',{nome_publico:input.nome_publico},g)).toMatchObject({next:'/dashboard/pessoa-fisica'});
 expect(g.registerPerson).toHaveBeenCalledWith(id,input.nome_publico);
});
