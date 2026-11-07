import 'server-only';
import type { AccessAccount, VerifiedUser } from './permissions.server';

export class FlowError extends Error {
  constructor(public readonly status: number, message: string, public readonly fields?: Record<string, string>) {
    super(message); this.name = 'FlowError';
  }
}
export type AuthAction = 'complete_pf' | 'signup' | 'signup_pf' | 'signin' | 'signout' | 'recover' | 'confirm' | 'reset' | 'organization';
interface ProviderResult { user?: VerifiedUser | null; session?: boolean; error?: { status?: number; code?: string } | null }
export interface AuthGateway {
  signUp(email: string, password: string): Promise<ProviderResult>;
  signUpPF?(email: string, password: string, name: string): Promise<ProviderResult>;
  signIn(email: string, password: string): Promise<ProviderResult>;
  recover(email: string): Promise<ProviderResult>;
  verify(token: string, type: 'signup' | 'recovery'): Promise<ProviderResult>;
  changePassword(password: string): Promise<ProviderResult>;
  logout(): Promise<ProviderResult>;
  currentUser(): Promise<VerifiedUser | null>;
  account(userId: string): Promise<AccessAccount | null>;
  registerOrganization(userId: string, name: string, channel?: string): Promise<{ organizacao_id: string }>;
  registerPerson?(userId: string, name: string): Promise<{ sujeito_id: string }>;
}
export interface FlowResult { message: string; next?: string }
const unavailable = () => new FlowError(503, 'Serviço indisponível. Tente novamente.');
const loginMessage = 'Não foi possível entrar. Confira seus dados e a confirmação de e-mail.';
function provider(result: ProviderResult) {
  if (result.error?.status === 429) throw new FlowError(429, 'Muitas tentativas. Aguarde antes de tentar novamente.');
  if ((result.error?.status ?? 0) >= 500) throw unavailable();
}
function payload(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) throw new FlowError(400, 'Pedido inválido.');
  return value as Record<string, unknown>;
}
function text(value: unknown) { return typeof value === 'string' ? value : ''; }
function email(value: unknown) {
  const result = text(value).trim().toLowerCase();
  if (result.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new FlowError(422, 'Confira os campos indicados.', { email: 'Informe um e-mail válido.' });
  return result;
}
function password(value: unknown) {
  const result = text(value);
  if (result.length < 12 || result.length > 128) throw new FlowError(422, 'Confira os campos indicados.', { password: 'Use de 12 a 128 caracteres.' });
  return result;
}
function token(value: unknown) {
  const result=text(value);
  if (!/^[a-zA-Z0-9_-]{20,512}$/.test(result)) throw new FlowError(422, 'Link inválido ou expirado. Solicite um novo link.');
  return result;
}
function personName(value:unknown):string {
 const name=text(value).trim().normalize('NFC');
 if(Array.from(name).length<2||Array.from(name).length>160||/[<>\u0000-\u001f\u007f]/.test(name))throw new FlowError(422,'Confira os campos indicados.',{nome_publico:'Use de 2 a 160 caracteres de texto, sem HTML.'});
 return name;
}
function personIntent(user:VerifiedUser){return user.user_metadata?.tipo==='pessoa_fisica';}
async function completePerson(gateway:AuthGateway,user:VerifiedUser){
 if(!user.email_confirmed_at)throw new FlowError(403,'Confirme seu e-mail antes de continuar.');
 if(!gateway.registerPerson)throw unavailable();
 // Metadata é apenas intenção de cadastro e nome. A RPC não altera papéis existentes.
 await gateway.registerPerson(user.id,personName(user.user_metadata?.nome_publico));
}
function channel(value: unknown):string|undefined {
  if(value===undefined||value===null||value==='')return undefined;
  try{
    const raw=text(value).trim();const url=new URL(raw);
    if(raw.length>2048||!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error();
    return url.href;
  }catch{throw new FlowError(422,'Confira os campos indicados.',{canal_publico:'Informe uma URL http/https sem credenciais, ou deixe em branco.'});}
}
function activeAccount(account: AccessAccount | null, user: VerifiedUser) {
  if (account && (account.auth_user_id !== user.id || account.situacao !== 'ativa' || account.papel !== 'organizacao' || !account.organizacao_id)) throw new FlowError(403, 'Acesso indisponível para esta conta.');
}
function activeLoginAccount(account:AccessAccount|null,user:VerifiedUser){
 if(account&&(account.auth_user_id!==user.id||account.situacao!=='ativa'||!['organizacao','editor','administrador','publicador'].includes(account.papel)||(account.papel==='organizacao'&&!account.organizacao_id)||(account.papel==='publicador'&&account.organizacao_id!==null)))throw new FlowError(403,'Acesso indisponível para esta conta.');
}

function hasConfirmedIdentity(user: VerifiedUser | null | undefined): user is VerifiedUser {
  return Boolean(user?.id && user.email_confirmed_at);
}

async function clearOnFailure(gateway: AuthGateway, operation: () => Promise<FlowResult>): Promise<FlowResult> {
  try {
    return await operation();
  } catch (error) {
    // The gateway clears only this application's cookies, also on provider failure.
    await gateway.logout();
    throw error;
  }
}

/** Validate before initializing any provider; reused at the HTTP boundary. */
export function validateAuthInput(action:AuthAction,input:unknown):void {
 const keys:Record<AuthAction,string[]>={complete_pf:['nome_publico'],signup:['email','password'],signup_pf:['email','password','nome_publico'],signin:['email','password'],recover:['email'],confirm:['token_hash'],reset:['token_hash','password'],signout:[],organization:['nome_publico','canal_publico']};
 if(!Object.hasOwn(keys,action))throw new FlowError(404,'Página não encontrada.');
 const body=payload(input,keys[action]);
 if(['signup','signup_pf','signin','recover'].includes(action))email(body.email);
 if(['signup','signup_pf','signin','reset'].includes(action))password(body.password);
 if(action==='signup_pf'||action==='complete_pf')personName(body.nome_publico);
 if(['confirm','reset'].includes(action))token(body.token_hash);
 if(action==='organization'){
   channel(body.canal_publico);
   const name=text(body.nome_publico).trim().normalize('NFC');
   if(name.length<2||name.length>160)throw new FlowError(422,'Confira os campos indicados.',{nome_publico:'Use de 2 a 160 caracteres.'});
 }
}

export async function executeAuth(action: AuthAction, input: unknown, gateway: AuthGateway): Promise<FlowResult> {
  try {
    validateAuthInput(action,input);
    if(action==='complete_pf'){
      const body=payload(input,['nome_publico']);
      const name=personName(body.nome_publico);
      const user=await gateway.currentUser();
      if(!user?.id)throw new FlowError(401,'Autenticação necessária.');
      if(!user.email_confirmed_at)throw new FlowError(403,'Confirme seu e-mail antes de continuar.');
      const account=await gateway.account(user.id);activeLoginAccount(account,user);
      if(account&&account.papel!=='publicador')throw new FlowError(403,'Acesso indisponível para esta conta.');
      if(!gateway.registerPerson)throw unavailable();
      await gateway.registerPerson(user.id,name);
      return {message:'Cadastro pendente de curadoria.',next:'/dashboard/pessoa-fisica'};
    }
    if(action==='signup_pf'){
      const body=payload(input,['email','password','nome_publico']);
      if(!gateway.signUpPF)throw unavailable();
      const result=await gateway.signUpPF(email(body.email),password(body.password),personName(body.nome_publico));provider(result);
      if(result.session){const ended=await gateway.logout();provider(ended);if(ended.error)throw unavailable();}
      if(result.error&&!['user_already_exists','email_exists'].includes(result.error.code??''))throw unavailable();
      return {message:'Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Se já tem conta, entre ou recupere o acesso.'};
    }
    if (action === 'signup') {
      const body=payload(input,['email','password']);
      const result=await gateway.signUp(email(body.email), password(body.password)); provider(result);
      if(result.session){const ended=await gateway.logout();provider(ended);if(ended.error)throw unavailable();}
      if (result.error && !['user_already_exists','email_exists'].includes(result.error.code ?? '')) throw unavailable();
      return { message: 'Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Se já tem conta, entre ou recupere o acesso.' };
    }
    if (action === 'signin') {
      const body=payload(input,['email','password']);
      return await clearOnFailure(gateway, async () => {
        const result=await gateway.signIn(email(body.email), password(body.password)); provider(result);
        if (result.error || !result.session || !hasConfirmedIdentity(result.user)) {
          throw new FlowError(401,loginMessage);
        }
        const account=await gateway.account(result.user.id); activeLoginAccount(account,result.user);
        if(account?.papel==='publicador')return {message:'Acesso confirmado.',next:'/dashboard/pessoa-fisica'};
        if(!account&&personIntent(result.user)){
          await completePerson(gateway,result.user);
          return {message:'Acesso confirmado.',next:'/dashboard/pessoa-fisica'};
        }
        return {message:'Acesso confirmado.',next:account?account.papel==='organizacao'?'/dashboard':'/admin/atividades':'/dashboard/organizacao'};
      });
    }
    if (action === 'recover') {
      const body=payload(input,['email']); const result=await gateway.recover(email(body.email)); provider(result);
      if (result.error && !['user_not_found'].includes(result.error.code ?? '')) throw unavailable();
      return {message:'Se houver uma conta elegível, você receberá um e-mail para recuperar o acesso.'};
    }
    if (action === 'confirm') {
      const body=payload(input,['token_hash']);
      return await clearOnFailure(gateway, async () => {
        const result=await gateway.verify(token(body.token_hash),'signup'); provider(result);
        if (result.error || !hasConfirmedIdentity(result.user) || !result.session) throw new FlowError(422,'Link inválido ou expirado. Solicite um novo cadastro ou entre na sua conta.');
        if(personIntent(result.user)){
          await completePerson(gateway,result.user);
          return {message:'E-mail confirmado. Cadastro pendente de curadoria.',next:'/dashboard/pessoa-fisica'};
        }
        return {message:'E-mail confirmado.',next:'/dashboard/organizacao'};
      });
    }
    if (action === 'reset') {
      const body=payload(input,['token_hash','password']); const pass=password(body.password); const hash=token(body.token_hash);
      try {
        const verified=await gateway.verify(hash,'recovery'); provider(verified);
        if (verified.error || !verified.session || !hasConfirmedIdentity(verified.user)) throw new FlowError(422,'Link inválido ou expirado. Solicite um novo link.');
        const changed=await gateway.changePassword(pass); provider(changed);
        if (changed.error) throw new FlowError(422,'Não foi possível alterar a senha. Solicite um novo link.');
      } finally { const ended=await gateway.logout(); provider(ended); if(ended.error) throw unavailable(); }
      return {message:'Senha atualizada. Entre novamente.',next:'/login?status=senha-atualizada'};
    }
    if (action === 'signout') {
      payload(input,[]); const result=await gateway.logout(); provider(result); if(result.error) throw unavailable();
      return {message:'Sessão encerrada neste navegador.',next:'/login'};
    }
    if (action === 'organization') {
      const body=payload(input,['nome_publico','canal_publico']); const name=text(body.nome_publico).trim().normalize('NFC');
      if (name.length < 2 || name.length > 160) throw new FlowError(422,'Confira os campos indicados.',{nome_publico:'Use de 2 a 160 caracteres.'});
      const user=await gateway.currentUser();
      if (!user?.id) throw new FlowError(401,'Autenticação necessária.');
      if (!user.email_confirmed_at) throw new FlowError(403,'Confirme seu e-mail antes de continuar.');
      const account=await gateway.account(user.id); activeAccount(account,user);
      const completed = {message:'Organização vinculada. Validação institucional pendente.',next:'/dashboard'};
      // A lost response after commit is recovered through the existing account.
      // Validate identity, role and status above before bypassing a redundant write.
      if (account) return completed;
      const publicChannel=channel(body.canal_publico);
      if(publicChannel)await gateway.registerOrganization(user.id,name,publicChannel);
      else await gateway.registerOrganization(user.id,name);
      return completed;
    }
    throw new FlowError(404,'Página não encontrada.');
  } catch (error) {
    if(error instanceof FlowError) throw error;
    throw unavailable();
  }
}
