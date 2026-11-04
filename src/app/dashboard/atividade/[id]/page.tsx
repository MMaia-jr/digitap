import { notFound,redirect } from 'next/navigation';
import Link from 'next/link';
import { activities } from '../../../../lib/activities/service.server';
import { ActivityError } from '../../../../lib/activities/domain';
import { ActivityForm } from '../../../../components/ActivityForm';
import {ReviewForm} from '../../../../components/ReviewForm';
import {WithdrawForm} from '../../../../components/WithdrawForm';
import {PublishForm} from '../../../../components/PublishForm';
export const dynamic='force-dynamic';
export default async function ActivityDetail({params}:{params:Promise<{id:string}>}){
 let activity;
 try{activity=await activities.get((await params).id);}catch(error){
  if(error instanceof ActivityError&&error.status===401)redirect('/login');
  if(error instanceof ActivityError&&error.status===404)notFound();
  return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível carregar esta atividade.</p></section>;
 }
 const labels={rascunho:'Rascunho privado',enviada:'Enviada — continua privada',em_revisao:'Em revisão — continua privada',aprovada:'Aprovada — continua privada',devolvida:'Devolvida — continua privada',rejeitada:'Rejeitada — continua privada',publicada:'Publicada',retirada:'Retirada — não está pública'};
 return <section className="card"><Link href={activity.acesso_editorial?'/admin/atividades':'/dashboard'}>Voltar à área restrita</Link><h1>{activity.titulo}</h1><p>{labels[activity.estado_editorial]}</p>
  {activity.pode_editar?<ActivityForm activity={activity}/>:<><p>{activity.descricao}</p><dl><dt>Data e horário (America/Sao_Paulo)</dt><dd>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(activity.inicio_previsto))}</dd><dt>Orientação de acesso</dt><dd>{activity.orientacao_acesso}</dd></dl>{activity.referencia_oficial&&<p><a href={activity.referencia_oficial} rel="noreferrer noopener">Link oficial</a></p>}</>}
  {activity.motivo_editorial&&<section aria-label="Motivo editorial"><h2>Motivo editorial</h2><p>{activity.motivo_editorial}</p></section>}
  {activity.motivo_retirada&&<section aria-label="Motivo da retirada"><h2>Motivo da retirada</h2><p>{activity.motivo_retirada}</p></section>}
  {activity.tem_publicacao&&activity.estado_editorial!=='retirada'&&activity.estado_editorial!=='publicada'&&<p>A versão {activity.numero_versao_publicada} continua pública enquanto esta versão está pendente.</p>}
  {activity.pode_retirar&&<WithdrawForm id={activity.id} version={activity.versao_submetida}/>}
  {activity.pode_revisar&&<ReviewForm activity={activity}/>}
  {activity.pode_publicar&&<PublishForm id={activity.id} version={activity.versao_submetida}/>}
  {activity.estado_editorial==='publicada'&&<p><Link href={'/atividade/'+activity.id}>Ver snapshot publicado</Link></p>}
 </section>;
}
