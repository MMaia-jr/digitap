import { describe, it, expect, vi } from 'vitest';
import { executeAuth, FlowError, type AuthGateway } from '../../src/lib/auth/flow.server';
vi.mock('server-only', () => ({}));
const user = { id: '11111111-1111-4111-8111-111111111111', email_confirmed_at: '2026-11-03' };
const account = { auth_user_id: user.id, organizacao_id: 'org-a', papel: 'organizacao', situacao: 'ativa' };
const input = { email: 'ficticio@example.invalid', password: 'SenhaFicticia123!' };
function setup() {
  return {
    signUp: vi.fn().mockResolvedValue({}), signIn: vi.fn().mockResolvedValue({ user, session: true }),
    currentUser: vi.fn().mockResolvedValue(user), account: vi.fn().mockResolvedValue(null),
    recover: vi.fn().mockResolvedValue({}), verify: vi.fn().mockResolvedValue({ user, session: true }),
    changePassword: vi.fn().mockResolvedValue({}), logout: vi.fn().mockResolvedValue({}),
    registerOrganization: vi.fn().mockResolvedValue({ organizacao_id: 'org-a' }),
  } satisfies AuthGateway;
}
const run = (action: Parameters<typeof executeAuth>[0], value: unknown, gateway = setup()) => executeAuth(action, value, gateway);

describe('A01–A09: fluxo com provider simulado, não integração real', () => {
  it('A01: cadastro usa Auth e adia vínculo até confirmação', async () => {
    const g = setup(); const result = await run('signup', input, g);
    expect(g.signUp).toHaveBeenCalledWith(input.email, input.password);
    expect(result.message).toContain('e-mail'); expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it.each(['invalido', 'a@', 'a b@example.invalid'])('A02: email %s inválido não chama Auth', async email => {
    const g = setup(); await expect(run('signup', { ...input, email }, g)).rejects.toMatchObject({ status: 422, fields: { email: expect.any(String) } });
    expect(g.signUp).not.toHaveBeenCalled();
  });
  it.each(['user_already_exists', 'email_exists'])('A02: %s tem a mesma resposta do cadastro novo', async code => {
    const g = setup(); g.signUp.mockResolvedValue({ error: { code, status: 400 } } as never);
    expect(await run('signup', input, g)).toEqual(await run('signup', input));
  });
  it('senha curta é recusada sem chamar provider', async () => {
    const g=setup(); await expect(run('signup', {...input,password:'curta'}, g)).rejects.toMatchObject({ status:422 }); expect(g.signUp).not.toHaveBeenCalled();
  });
  it('A03: erro de login é genérico e não expõe senha/provider', async () => {
    const g=setup(); g.signIn.mockResolvedValue({error:{code:'invalid_credentials',status:400,message:input.password}} as never);
    await expect(run('signin',input,g)).rejects.toMatchObject({status:401,message:'Não foi possível entrar. Confira seus dados e a confirmação de e-mail.'});
  });
  it('A01: sessão confirmada sem vínculo conduz ao cadastro de organização', async () => {
    expect(await run('signin', input)).toMatchObject({ next:'/dashboard/organizacao' });
  });
  it('login com conta própria ativa conduz à área restrita', async () => {
    const g=setup();g.account.mockResolvedValue(account as never);
    expect(await run('signin',input,g)).toMatchObject({next:'/dashboard'});
  });
  it('A07: login sem email confirmado é negado e limpa sessão', async () => {
    const g=setup();g.signIn.mockResolvedValue({user:{...user,email_confirmed_at:null},session:true} as never);
    await expect(run('signin',input,g)).rejects.toMatchObject({status:401});expect(g.logout).toHaveBeenCalled();
  });
  it.each(['bloqueada','desativada'])('A08: conta %s não permanece logada', async situacao => {
    const g=setup();g.account.mockResolvedValue({...account,situacao} as never);
    await expect(run('signin',input,g)).rejects.toMatchObject({status:403});expect(g.logout).toHaveBeenCalled();
  });
  it('A04: recuperação não enumera email existente', async () => {
    const g=setup();g.recover.mockResolvedValue({error:{code:'user_not_found',status:400}} as never);
    expect(await run('recover',{email:input.email},g)).toEqual(await run('recover',{email:input.email}));
  });
  it('A04: token de confirmação inválido/expirado não cria vínculo', async () => {
    const g=setup();g.verify.mockResolvedValue({error:{code:'otp_expired',status:403}} as never);
    await expect(run('confirm',{token_hash:'a'.repeat(64)},g)).rejects.toMatchObject({status:422});expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it('A04: confirmação aceita somente OTP de signup', async () => {
    const g=setup();expect(await run('confirm',{token_hash:'a'.repeat(64)},g)).toMatchObject({next:'/dashboard/organizacao'});
    expect(g.verify).toHaveBeenCalledWith('a'.repeat(64),'signup');
  });
  it('A04: redefine senha somente após OTP de recovery, e encerra sessão', async () => {
    const g=setup();expect(await run('reset',{token_hash:'a'.repeat(64),password:input.password},g)).toMatchObject({next:'/login?status=senha-atualizada'});
    expect(g.verify).toHaveBeenCalledWith('a'.repeat(64),'recovery');expect(g.changePassword).toHaveBeenCalledWith(input.password);expect(g.logout).toHaveBeenCalledOnce();
  });
  it('A04: OTP usado/expirado impede updateUser', async () => {
    const g=setup();g.verify.mockResolvedValue({error:{code:'otp_expired',status:403}} as never);
    await expect(run('reset',{token_hash:'a'.repeat(64),password:input.password},g)).rejects.toMatchObject({status:422});expect(g.changePassword).not.toHaveBeenCalled();
  });
  it('falha ao redefinir também encerra a sessão temporária', async () => {
    const g=setup();g.changePassword.mockResolvedValue({error:{status:500}} as never);
    await expect(run('reset',{token_hash:'a'.repeat(64),password:input.password},g)).rejects.toMatchObject({status:503});expect(g.logout).toHaveBeenCalled();
  });
  it('A08: logout chama provider sem receber token do payload', async () => {
    const g=setup();expect(await run('signout',{},g)).toMatchObject({next:'/login'});expect(g.logout).toHaveBeenCalledOnce();
  });
  it('A01: organização criada somente após getUser confirmado', async () => {
    const g=setup();await run('organization',{nome_publico:'Organização Fictícia'},g);
    expect(g.registerOrganization).toHaveBeenCalledWith(user.id,'Organização Fictícia');
  });
  it('A07: identidade não confirmada não pode criar organização', async () => {
    const g=setup();g.currentUser.mockResolvedValue({...user,email_confirmed_at:null} as never);
    await expect(run('organization',{nome_publico:'Organização Fictícia'},g)).rejects.toMatchObject({status:403});expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it('A09: visitante não cria organização', async () => {
    const g=setup();g.currentUser.mockResolvedValue(null);
    await expect(run('organization',{nome_publico:'Organização Fictícia'},g)).rejects.toMatchObject({status:401});expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it('A06: payload com papel/id/tenant é rejeitado', async () => {
    const g=setup();await expect(run('organization',{nome_publico:'Fictícia',papel:'administrador',auth_user_id:'outro'},g)).rejects.toMatchObject({status:400});expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it('A06: cadastro de Auth também rejeita campos de privilégio', async () => {
    await expect(run('signup',{...input,papel:'editor'})).rejects.toMatchObject({status:400});
  });
  it('falha parcial no banco não recria nem exclui identidade Auth', async () => {
    const g=setup();g.registerOrganization.mockRejectedValueOnce(new Error('detalhe privado'));
    await expect(run('organization',{nome_publico:'Fictícia'},g)).rejects.toMatchObject({status:503});
    expect(await run('organization',{nome_publico:'Fictícia'},g)).toMatchObject({next:'/dashboard'});
    expect(g.signUp).not.toHaveBeenCalled();
  });
  it('nome inválido não chama banco', async () => {
    const g=setup();await expect(run('organization',{nome_publico:' '},g)).rejects.toMatchObject({status:422,fields:{nome_publico:expect.any(String)}});expect(g.registerOrganization).not.toHaveBeenCalled();
  });
  it.each(['signup','signin','recover'] as const)('limitação do provider preservada em %s', async action => {
    const g=setup();const fn= action==='signup'?g.signUp:action==='signin'?g.signIn:g.recover;fn.mockResolvedValue({error:{status:429}} as never);
    await expect(run(action,action==='recover'?{email:input.email}:input,g)).rejects.toMatchObject({status:429});
  });
  it('falhas inesperadas não expõem detalhes', async () => {
    const g=setup();g.signUp.mockRejectedValue(new Error('senha/segredo'));
    await expect(run('signup',input,g)).rejects.toMatchObject({status:503,message:'Serviço indisponível. Tente novamente.'});
  });
  it('FlowError não inclui payload de credenciais', () => {
    expect(new FlowError(403,'Acesso negado.')).toMatchObject({status:403,message:'Acesso negado.'});
  });
});

describe('regressão de confirmação obrigatória',()=>{
 it('signup nunca mantém sessão imediata mesmo com provider mal configurado',async()=>{
   const g=setup();g.signUp.mockResolvedValue({user,session:true} as never);
   await run('signup',input,g);expect(g.logout).toHaveBeenCalledOnce();
 });
});

describe('canal público opcional do cadastro',()=>{
 it('valida e encaminha somente URL pública sem credenciais',async()=>{
   const g=setup();await run('organization',{nome_publico:'Fictícia',canal_publico:'https://exemplo.invalid/contato'},g);
   expect(g.registerOrganization).toHaveBeenCalledWith(user.id,'Fictícia','https://exemplo.invalid/contato');
 });
 it.each(['javascript:alert(1)','https://usuario:senha@exemplo.invalid','não é uma URL'])('recusa canal %s',async canal_publico=>{
   const g=setup();await expect(run('organization',{nome_publico:'Fictícia',canal_publico},g)).rejects.toMatchObject({status:422,fields:{canal_publico:expect.any(String)}});expect(g.registerOrganization).not.toHaveBeenCalled();
 });
});
