'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {collaborationCommand} from '../../lib/queries/collaboration.server';
import {ActivityError} from '../../lib/activities/domain';
import {uuid} from '../../lib/activities/publication';
async function command(kind:'invite'|'remove'|'respond'|'decide',form:FormData){
 const projectId=form.get('projeto_id');
 const path=kind==='respond'?'/dashboard/pessoa-fisica':uuid(projectId)?'/dashboard/projetos/'+projectId+'/colaboradores':'/dashboard';
 let error:string|undefined;
 try{await collaborationCommand(kind,form);}catch(cause){error=cause instanceof ActivityError?cause.message:'Não foi possível concluir agora. Tente novamente.';}
 if(error)redirect(path+'?erro='+encodeURIComponent(error));
 revalidatePath('/dashboard');revalidatePath('/dashboard/pessoa-fisica');revalidatePath(path);
 redirect(path+'?colaboracao='+kind);
}
export async function inviteCollaborator(form:FormData){return command('invite',form);}
export async function removeCollaborator(form:FormData){return command('remove',form);}
export async function respondInvitation(form:FormData){return command('respond',form);}
export async function decideProjectActivity(form:FormData){return command('decide',form);}
