import Link from 'next/link';
import {redirect,notFound} from 'next/navigation';
import {activities} from '../../../../../../lib/activities/service.server';
import {ActivityError} from '../../../../../../lib/activities/domain';
import {RealizationForm} from '../../../../../../components/RealizationForm';
import {CommunityIcon} from '../../../../../../components/CommunityIcons';
export const dynamic='force-dynamic';
export default async function EvidencePage({params}:{params:Promise<{id:string}>}){
 let activity;try{activity=await activities.realizationActivity((await params).id);}catch(error){
  if(error instanceof ActivityError){if(error.status===401)redirect('/login');if(error.status===404)notFound();}
  return <section className="card"><h1>Registro indisponível</h1><p>Confira se esta atividade é sua e já está publicada.</p><Link href="/dashboard/pessoa-fisica">Voltar para minhas atividades</Link></section>;
 }
 return <section className="realization-shell"><Link className="text-link" href="/dashboard/pessoa-fisica">← Minhas atividades</Link><div className="realization-heading"><span className="realization-icon" aria-hidden="true"><CommunityIcon name="leaf"/></span><p className="eyebrow">Memória do que fizemos juntos</p><h1>Registrar que aconteceu</h1><p className="realization-title">{activity.titulo}</p><p>Um encontro deixa histórias. Conte a sua e ajude a Praça a guardar essa memória.</p></div><div className="realization-glass">{activity.registro_estado?<><h2>✓ Evidência registrada</h2><p>Já existe um relato para esta atividade. A divulgação depende da revisão editorial.</p><Link href="/dashboard/pessoa-fisica">Voltar para minhas atividades</Link></>:Date.parse(activity.inicio_previsto)>Date.now()?<><h2>O encontro ainda está por vir</h2><p>Volte depois do início da atividade para contar o que aconteceu.</p></>:<><div className="realization-notice"><strong>Primeiro o relato, depois a revisão.</strong><p>Seu envio fica privado até aprovação editorial. Um relato não é uma verificação independente nem gera pontuação de reputação.</p></div><RealizationForm id={activity.id} version={activity.versao_submetida}/></>}</div></section>;
}
