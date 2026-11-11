import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAccessDependencies } from './supabase-access.server';
import { FlowError, type AuthGateway } from './flow.server';
import { appOrigin } from '../supabase/config.server';

export function createGateway(user: SupabaseClient, admin: () => SupabaseClient, clearCookies: () => void): AuthGateway {
  const result=(response: {data: {user?: unknown;session?: unknown};error: unknown}) => ({
    user: response.data?.user as Awaited<ReturnType<AuthGateway['currentUser']>>,
    session: Boolean(response.data?.session), error: response.error as {status?:number;code?:string}|null,
  });
  return {
    async signUp(email,password){return result(await user.auth.signUp({email,password}));},
    async signUpPF(email,password,name){return result(await user.auth.signUp({email,password,options:{data:{tipo:'pessoa_fisica',nome_publico:name}}}));},
    async signIn(email,password){return result(await user.auth.signInWithPassword({email,password}));},
    async recover(email){
      const origin=process.env.NODE_ENV==='production'?'https://www.digitap.com.br':appOrigin();
      return {error:(await user.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/auth/confirm`})).error};
    },
    async verify(token_hash,type){return result(await user.auth.verifyOtp({token_hash,type}));},
    async changePassword(password){return result(await user.auth.updateUser({password}));},
    async logout(){try{return {error:(await user.auth.signOut({scope:'local'})).error};}finally{clearCookies();}},
    async currentUser(){
      const {data,error}=await user.auth.getUser();
      if(error){if([400,401,403].includes(error.status??0))return null;throw new FlowError(503,'Serviço indisponível. Tente novamente.');}
      return data.user;
    },
    async account(userId){return createAccessDependencies(user,admin()).findAccount(userId);},
    async registerOrganization(userId,name,channel){
      const {data,error}=await admin().rpc('criar_organizacao_com_sujeito',{p_auth_user_id:userId,p_nome_publico:name,p_canal_publico:channel??null});
      if(error)throw new FlowError(error.code==='42501'?403:503,error.code==='42501'?'Acesso indisponível para esta conta.':'Serviço indisponível. Tente novamente.');
      if(typeof data!=='string')throw new FlowError(503,'Serviço indisponível. Tente novamente.');
      return {organizacao_id:data};
    },
    async registerPerson(userId,name){
      const {data,error}=await admin().rpc('criar_pf_com_sujeito',{p_auth_user_id:userId,p_nome_publico:name});
      if(error)throw new FlowError(error.code==='42501'?403:503,error.code==='42501'?'Acesso indisponível para esta conta.':'Serviço indisponível. Tente novamente.');
      if(typeof data!=='string')throw new FlowError(503,'Serviço indisponível. Tente novamente.');
      return {sujeito_id:data};
    },
  };
}
