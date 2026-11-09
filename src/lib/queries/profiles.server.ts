import 'server-only';
import {withTransaction,type Sql} from '../database.server';
import {userClient} from '../supabase/server';
import {adminClient} from '../supabase/admin.server';
import {createGateway} from '../auth/gateway.server';
import {ActivityError} from '../activities/domain';
import {uuid,type PublicPublisher} from '../activities/publication';
import {publicActivities} from './public.server';
type Subject=PublicPublisher&{organizacao_legada_id:string|null};
type Owner=Subject&{conta_id:string};
export async function profileUser(){
 return createGateway(await userClient(),adminClient,()=>{}).currentUser();
}
export async function ownedProfile(sql:Sql,userId:string,subjectId:string,write=false){
 return (await sql.query<Owner>(`select s.id,s.nome_publico,s.tipo,s.organizacao_legada_id,c.id as conta_id
  from public.sujeitos_publicadores s join public.vinculos_publicadores v on v.sujeito_id=s.id
  join public.contas_acesso c on c.id=v.conta_id
  where s.id=$2 and c.auth_user_id=$1 and c.situacao='ativa'
   and c.papel in ('publicador','organizacao','editor','administrador')
   and s.estado in ('pendente','ativo') and v.atual and v.situacao='ativo'
   and v.papel_vinculo='titular' and 'editar'=any(v.escopos)
   and (s.tipo<>'pessoa_fisica' or exists(select 1 from public.pessoas_fisicas p where p.sujeito_id=s.id and p.conta_id=c.id))
  limit 1 ${write?'for update of s,c,v':''}`,[userId,subjectId])).rows[0]??null;
}
export async function publicProfile(id:string){
 if(!uuid(id))throw new ActivityError(404,'Perfil não encontrado.');
 const subject=await withTransaction(async sql=>(await sql.query<Subject>('select id,nome_publico,tipo,organizacao_legada_id from public.sujeitos_publicadores where id=$1 or organizacao_legada_id=$1 order by (id=$1) desc limit 1',[id])).rows[0]);
 if(!subject)throw new ActivityError(404,'Perfil não encontrado.');
 const activities=await publicActivities.byPublisher(subject.id);
 let owner:Owner|null=null;
 try{const user=await profileUser();if(user?.email_confirmed_at)owner=await withTransaction(sql=>ownedProfile(sql,user.id,subject.id));}catch{/* Public content remains readable when the private identity service is unavailable. */}
 if(!activities.length&&!owner)throw new ActivityError(404,'Perfil não encontrado.');
 return {subject,activities,canEdit:Boolean(owner)};
}
