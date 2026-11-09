'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {withTransaction} from '../../lib/database.server';
import {ownedProfile,profileUser} from '../../lib/queries/profiles.server';
import {uuid} from '../../lib/activities/publication';
function clean(value:FormDataEntryValue|null,min:number,max:number){
 if(typeof value!=='string')throw new Error('Preencha os campos.');
 const text=value.trim().normalize('NFC');
 if(Array.from(text).length<min||Array.from(text).length>max||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))throw new Error('Confira o tamanho dos campos e use apenas texto, sem HTML.');
 return text;
}
async function mutate(form:FormData,project:boolean){
 const id=form.get('sujeito_id');let path='/dashboard',message='Não foi possível salvar. Verifique seu acesso e tente novamente.';
 if(!uuid(id))redirect(path+'?erro='+encodeURIComponent(message));
 try{
  const user=await profileUser();if(!user?.email_confirmed_at)throw new Error(message);
  await withTransaction(async sql=>{
   const subject=await ownedProfile(sql,user.id,String(id),true);if(!subject)throw new Error(message);
   path=subject.tipo==='pessoa_fisica'?'/dashboard/pessoa-fisica':'/dashboard';
   if(project){
    if(subject.tipo==='pessoa_fisica')throw new Error('Projetos institucionais exigem um coletivo ou organização.');
    const titulo=clean(form.get('titulo'),3,180),descricao=clean(form.get('descricao'),0,5000),ano=Number(form.get('ano'));
    if(!Number.isInteger(ano)||ano<1900||ano>2200)throw new Error('Informe um ano entre 1900 e 2200.');
    await sql.query('insert into public.projetos(sujeito_id,titulo,descricao,ano) values($1,$2,$3,$4)',[id,titulo,descricao,ano]);
   }else{const bio=clean(form.get('bio'),0,5000);await sql.query('update public.sujeitos_publicadores set bio=$2,atualizada_em=clock_timestamp() where id=$1',[id,bio||null]);}
  });
 }catch(error){if(error instanceof Error&&/^(Confira|Preencha|Informe|Projetos)/.test(error.message))message=error.message;redirect(path+'?erro='+encodeURIComponent(message));}
 revalidatePath(path);revalidatePath('/perfil/'+id);redirect(path+'?salvo='+(project?'projeto':'bio'));
}
export async function saveBio(form:FormData){return mutate(form,false);}
export async function createProject(form:FormData){return mutate(form,true);}
