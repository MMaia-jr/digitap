import Link from 'next/link';
import {redirect} from 'next/navigation';
import {activities} from '../../../lib/activities/service.server';
import {ActivityError} from '../../../lib/activities/domain';
import {AuthForm} from '../../../components/AuthForm';
export const dynamic='force-dynamic';
export default async function EditorialQueue(){
 let queue;try{queue=await activities.reviewQueue();}catch(error){
  if(error instanceof ActivityError&&error.status===401)redirect('/login');
  return <section className="card"><h1>Acesso editorial indisponível</h1><p>Esta área exige uma conta editorial ativa e autorizada.</p><AuthForm mode="signout"/></section>;
 }
 return <section className="card"><h1>Revisão editorial</h1><p>Atividades submetidas. Revisar e aprovar não publicam o conteúdo.</p>{queue.length?<ul>{queue.map(a=><li key={a.id}><Link href={'/dashboard/atividade/'+a.id}>{a.titulo}</Link> — {a.estado_editorial==='em_revisao'?'Em revisão':'Enviada'}</li>)}</ul>:<p>Nenhuma atividade aguardando revisão.</p>}<AuthForm mode="signout"/></section>;
}
