import Link from 'next/link';
import {redirect} from 'next/navigation';
import {activities} from '../../../lib/activities/service.server';
import {ActivityError} from '../../../lib/activities/domain';
import {AuthForm} from '../../../components/AuthForm';
import {EditorialDecisionForm} from '../../../components/EditorialDecisionForm';
export const dynamic='force-dynamic';
export default async function EditorialQueue(){
 let queue;try{queue=await activities.reviewQueue();}catch(error){
  if(error instanceof ActivityError&&error.status===401)redirect('/login');
  return <section className="card"><h1>Acesso editorial indisponível</h1><p>Esta área exige uma conta editorial ativa e autorizada.</p><AuthForm mode="signout"/></section>;
 }
 return <section className="card"><h1>Revisão editorial</h1><p>Confira o conteúdo, quem propõe e como participar. Aprove a publicação ou explique por que a atividade precisa ser rejeitada.</p>{queue.length?<ul className="activity-list">{queue.map(a=><li key={a.id}><article aria-labelledby={'atividade-'+a.id}><h2 id={'atividade-'+a.id}><Link href={'/dashboard/atividade/'+a.id}>{a.titulo}</Link></h2><p>{a.nome_publicador??'Publicador'}</p><p><time dateTime={a.inicio_previsto}>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'long',timeStyle:'short'}).format(new Date(a.inicio_previsto))}</time></p><p>{a.descricao}</p><p>{a.orientacao_acesso}</p><p>{a.estado_editorial==='em_revisao'?'Em revisão':a.estado_editorial==='aprovada'?'Aprovada — aguardando publicação':'Enviada para revisão'}</p><Link href={'/dashboard/atividade/'+a.id}>Ver detalhes da atividade</Link><EditorialDecisionForm activity={a}/></article></li>)}</ul>:<p>Nenhuma atividade aguardando revisão ou publicação.</p>}</section>;
}
