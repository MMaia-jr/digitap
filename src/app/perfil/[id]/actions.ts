'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {ownedProfile,profileUser} from '../../../lib/queries/profiles.server';
import {withTransaction} from '../../../lib/database.server';
import {uuid} from '../../../lib/activities/publication';

export async function updateProfileName(form:FormData){
 const id=form.get('sujeito_id');if(!uuid(id))redirect('/');
 const path='/perfil/'+id;
 const name=typeof form.get('nome_publico')==='string'?String(form.get('nome_publico')).trim().normalize('NFC'):'';
 if(Array.from(name).length<2||Array.from(name).length>160||/[<>\u0000-\u001f\u007f]/.test(name))redirect(path+'?status=nome-invalido');
 let done=false;
 try{
  const user=await profileUser();
  if(user?.email_confirmed_at){done=await withTransaction(async sql=>{
   const owner=await ownedProfile(sql,user.id,String(id),true);
   if(!owner||owner.tipo==='coletivo_informal')return false;
   await sql.query('update public.sujeitos_publicadores set nome_publico=$2,atualizada_em=clock_timestamp() where id=$1',[owner.id,name]);
   if(owner.organizacao_legada_id)await sql.query('update public.organizacoes set nome_publico=$2 where id=$1',[owner.organizacao_legada_id,name]);
   await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,justificativa_restrita) values('sujeito',$1,'perfil_nome_atualizado',$2,$3)",[owner.id,owner.conta_id,JSON.stringify({tipo:'perfil-nome.v1',nome_anterior:owner.nome_publico,nome_novo:name})]);
   return true;
  });}
 }catch{/* Show a safe retry message without leaking account or database details. */}
 if(!done)redirect(path+'?status=indisponivel');
 revalidatePath(path);revalidatePath('/');redirect(path+'?status=atualizado');
}
