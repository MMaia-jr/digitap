import 'server-only';
import { authorize,type AccessAccount,type VerifiedUser } from './permissions.server';
interface Organization {id:string;nome_publico:string;estado_validacao:string}
interface AccessPorts {currentUser():Promise<VerifiedUser|null>;account(userId:string):Promise<AccessAccount|null>;organization(id:string):Promise<Organization|null>}
type State={kind:'login'|'onboarding'|'forbidden'|'unavailable'}|{kind:'ready';organization:Organization};
export async function loadOrganizationAccess(ports:AccessPorts):Promise<State>{
 try{
   const user=await ports.currentUser();if(!user?.id)return {kind:'login'};
   if(!user.email_confirmed_at)return {kind:'forbidden'};
   const account=await ports.account(user.id);if(!account)return {kind:'onboarding'};
   try{await authorize({verifyUser:async()=>user,findAccount:async()=>account},{action:'organizacao',organizationId:account.organizacao_id??''});}catch{return {kind:'forbidden'};}
   const organization=await ports.organization(account.organizacao_id!);
   if(!organization||organization.id!==account.organizacao_id||organization.estado_validacao==='suspensa')return {kind:'forbidden'};
   return {kind:'ready',organization};
 }catch{return {kind:'unavailable'};}
}
