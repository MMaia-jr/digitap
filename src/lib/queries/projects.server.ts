import 'server-only';
import {withTransaction} from '../database.server';
import {ownedProfile,profileUser} from './profiles.server';
export interface Project {id:string;sujeito_id:string;titulo:string;descricao:string;ano:number}
/** Only a verified titular with edit scope may load the private project list. */
export async function managedProfile(id?:string){
 const user=await profileUser();if(!user?.email_confirmed_at)throw new Error('Acesso indisponível.');
 return withTransaction(async sql=>{
  const subjectId=id?(await sql.query<{id:string}>('select id from public.sujeitos_publicadores where id=$1 or organizacao_legada_id=$1 order by (id=$1) desc limit 1',[id])).rows[0]?.id:(await sql.query<{id:string}>(`select s.id from public.sujeitos_publicadores s join public.vinculos_publicadores v on v.sujeito_id=s.id join public.contas_acesso c on c.id=v.conta_id where c.auth_user_id=$1 and v.atual and v.situacao='ativo' and v.papel_vinculo='titular' and 'editar'=any(v.escopos) order by s.criada_em limit 1`,[user.id])).rows[0]?.id;
  if(!subjectId)throw new Error('Acesso indisponível.');
  const subject=await ownedProfile(sql,user.id,subjectId);if(!subject)throw new Error('Acesso indisponível.');
  const projects=(await sql.query<Project>('select id,sujeito_id,titulo,descricao,ano from public.projetos where sujeito_id=$1 order by ano desc,criado_em desc',[subject.id])).rows;
  return {subject,projects};
 });
}
