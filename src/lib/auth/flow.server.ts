import 'server-only';
import type { AccessAccount, VerifiedUser } from './permissions.server';

export class FlowError extends Error {
  constructor(public readonly status: number, message: string, public readonly fields?: Record<string, string>) {
    super(message); this.name = 'FlowError';
  }
}
export type AuthAction = 'signup' | 'signin' | 'signout' | 'recover' | 'confirm' | 'reset' | 'organization';
interface ProviderResult { user?: VerifiedUser | null; session?: boolean; error?: { status?: number; code?: string } | null }
export interface AuthGateway {
  signUp(email: string, password: string): Promise<ProviderResult>;
  signIn(email: string, password: string): Promise<ProviderResult>;
  recover(email: string): Promise<ProviderResult>;
  verify(token: string, type: 'signup' | 'recovery'): Promise<ProviderResult>;
  changePassword(password: string): Promise<ProviderResult>;
  logout(): Promise<ProviderResult>;
  currentUser(): Promise<VerifiedUser | null>;
  account(userId: string): Promise<AccessAccount | null>;
  registerOrganization(userId: string, name: string, channel?: string): Promise<{ organizacao_id: string }>;
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

/** Validate before initializing any provider; reused at the HTTP boundary. */
export function validateAuthInput(action:AuthAction,input:unknown):void {
 const keys:Record<AuthAction,string[]>={signup:['email','password'],signin:['email','password'],recover:['email'],confirm:['token_hash'],reset:['token_hash','password'],signout:[],organization:['nome_publico','canal_publico']};
 if(!Object.hasOwn(keys,action))throw new FlowError(404,'Página não encontrada.');
 const body=payload(input,keys[action]);
 if(['signup','signin','recover'].includes(action))email(body.email);
 if(['signup','signin','reset'].includes(action))password(body.password);
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
    if (action === 'signup') {
      const body=payload(input,['email','password']);
      const result=await gateway.signUp(email(body.email), password(body.password)); provider(result);
      if(result.session){const ended=await gateway.logout();provider(ended);if(ended.error)throw unavailable();}
      if (result.error && !['user_already_exists','email_exists'].includes(result.error.code ?? '')) throw unavailable();
      return { message: 'Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Se já tem conta, entre ou recupere o acesso.' };
    }
    if (action === 'signin') {
      const body=payload(input,['email','password']);
      const result=await gateway.signIn(email(body.email), password(body.password)); provider(result);
      if (result.error || !result.session || !result.user?.email_confirmed_at) {
        await gateway.logout(); throw new FlowError(401,loginMessage);
      }
      try {
        const account=await gateway.account(result.user.id); activeAccount(account,result.user);
        return {message:'Acesso confirmado.',next:account?'/dashboard':'/dashboard/organizacao'};
      } catch (error) { await gateway.logout(); throw error; }
    }
    if (action === 'recover') {
      const body=payload(input,['email']); const result=await gateway.recover(email(body.email)); provider(result);
      if (result.error && !['user_not_found'].includes(result.error.code ?? '')) throw unavailable();
      return {message:'Se houver uma conta elegível, você receberá um e-mail para recuperar o acesso.'};
    }
    if (action === 'confirm') {
      const body=payload(input,['token_hash']); const result=await gateway.verify(token(body.token_hash),'signup'); provider(result);
      if (result.error || !result.user?.email_confirmed_at || !result.session) throw new FlowError(422,'Link inválido ou expirado. Solicite um novo cadastro ou entre na sua conta.');
      return {message:'E-mail confirmado.',next:'/dashboard/organizacao'};
    }
    if (action === 'reset') {
      const body=payload(input,['token_hash','password']); const pass=password(body.password); const hash=token(body.token_hash);
      try {
        const verified=await gateway.verify(hash,'recovery'); provider(verified);
        if (verified.error || !verified.session || !verified.user?.email_confirmed_at) throw new FlowError(422,'Link inválido ou expirado. Solicite um novo link.');
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
      if (!user) throw new FlowError(401,'Autenticação necessária.');
      if (!user.email_confirmed_at) throw new FlowError(403,'Confirme seu e-mail antes de continuar.');
      const account=await gateway.account(user.id); activeAccount(account,user);
      const publicChannel=channel(body.canal_publico);
      if(publicChannel)await gateway.registerOrganization(user.id,name,publicChannel);
      else await gateway.registerOrganization(user.id,name);
      return {message:'Organização vinculada. Validação institucional pendente.',next:'/dashboard'};
    }
    throw new FlowError(404,'Página não encontrada.');
  } catch (error) {
    if(error instanceof FlowError) throw error;
    throw unavailable();
  }
}
