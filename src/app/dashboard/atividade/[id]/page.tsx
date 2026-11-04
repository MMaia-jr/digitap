import { notFound,redirect } from 'next/navigation';
import Link from 'next/link';
import { activities } from '../../../../lib/activities/service.server';
import { ActivityError } from '../../../../lib/activities/domain';
import { ActivityForm } from '../../../../components/ActivityForm';
export const dynamic='force-dynamic';
export default async function ActivityDetail({params}:{params:Promise<{id:string}>}){
 let activity;
 try{activity=await activities.get((await params).id);}catch(error){
  if(error instanceof ActivityError&&error.status===401)redirect('/login');
  if(error instanceof ActivityError&&error.status===404)notFound();
  return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível carregar esta atividade.</p></section>;
 }
 return <section className="card"><Link href="/dashboard">Voltar à organização</Link><h1>{activity.titulo}</h1><p>{activity.estado_editorial==='enviada'?'Enviada — continua privada':'Rascunho privado'}</p>
  {activity.pode_editar?<ActivityForm activity={activity}/>:<><p>{activity.descricao}</p><dl><dt>Data e horário (America/Sao_Paulo)</dt><dd>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(activity.inicio_previsto))}</dd><dt>Orientação de acesso</dt><dd>{activity.orientacao_acesso}</dd></dl>{activity.referencia_oficial&&<p><a href={activity.referencia_oficial} rel="noreferrer noopener">Link oficial</a></p>}</>}
 </section>;
}
