import { notFound,redirect } from 'next/navigation';
import Link from 'next/link';
import { activities } from '../../../../lib/activities/service.server';
import { ActivityError } from '../../../../lib/activities/domain';
import { ActivityForm } from '../../../../components/ActivityForm';
import {ReviewForm} from '../../../../components/ReviewForm';
export const dynamic='force-dynamic';
export default async function ActivityDetail({params}:{params:Promise<{id:string}>}){
 let activity;
 try{activity=await activities.get((await params).id);}catch(error){
  if(error instanceof ActivityError&&error.status===401)redirect('/login');
  if(error instanceof ActivityError&&error.status===404)notFound();
  return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível carregar esta atividade.</p></section>;
 }
 const labels={rascunho:'Rascunho privado',enviada:'Enviada — continua privada',em_revisao:'Em revisão — continua privada',aprovada:'Aprovada — continua privada',devolvida:'Devolvida — continua privada',rejeitada:'Rejeitada — continua privada'};
 return <section className="card"><Link href={activity.acesso_editorial?'/admin/atividades':'/dashboard'}>Voltar à área restrita</Link><h1>{activity.titulo}</h1><p>{labels[activity.estado_editorial]}</p>
  {activity.pode_editar?<ActivityForm activity={activity}/>:<><p>{activity.descricao}</p><dl><dt>Data e horário (America/Sao_Paulo)</dt><dd>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(activity.inicio_previsto))}</dd><dt>Orientação de acesso</dt><dd>{activity.orientacao_acesso}</dd></dl>{activity.referencia_oficial&&<p><a href={activity.referencia_oficial} rel="noreferrer noopener">Link oficial</a></p>}</>}
  {activity.motivo_editorial&&<section aria-label="Motivo editorial"><h2>Motivo editorial</h2><p>{activity.motivo_editorial}</p></section>}
  {activity.pode_revisar&&<ReviewForm activity={activity}/>}
 </section>;
}
