import 'server-only';
import {withTransaction} from '../database.server';
import {userClient} from '../supabase/server';
import {adminClient} from '../supabase/admin.server';
import {createGateway} from './gateway.server';
export async function personState(){
 try{
  const user=await createGateway(await userClient(),adminClient,()=>{}).currentUser();
  if(!user?.id)return {kind:'login' as const};
  if(!user.email_confirmed_at)return {kind:'forbidden' as const};
  return await withTransaction(async sql=>{
   const person=(await sql.query<{nome_publico:string;estado:string}>(`select s.nome_publico,s.estado
    from public.contas_acesso c join public.pessoas_fisicas p on p.conta_id=c.id
    join public.sujeitos_publicadores s on s.id=p.sujeito_id
    join public.vinculos_publicadores v on v.conta_id=c.id and v.sujeito_id=s.id
    where c.auth_user_id=$1 and c.papel='publicador' and c.situacao='ativa' and c.organizacao_id is null
      and s.tipo='pessoa_fisica' and s.estado in ('pendente','ativo') and s.criado_por_conta_id=c.id
      and v.atual and v.situacao='ativo' and v.papel_vinculo='titular' and 'ler_privado'=any(v.escopos)`,[user.id])).rows[0];
   return person?{kind:'ready' as const,person}:{kind:'forbidden' as const};
  });
 }catch{return {kind:'unavailable' as const};}
}
