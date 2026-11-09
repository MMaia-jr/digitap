import Link from 'next/link';
import {redirect} from 'next/navigation';
import {activities} from '../../../lib/activities/service.server';
import {ActivityError} from '../../../lib/activities/domain';
import {AuthForm} from '../../../components/AuthForm';
import {RealizationReviewForm} from '../../../components/RealizationReviewForm';
import {realizationDetails} from '../../../lib/activities/realization';
import {EditorialDecisionForm} from '../../../components/EditorialDecisionForm';
export const dynamic='force-dynamic';
export default async function EditorialQueue(){
 let queue,records;try{queue=await activities.reviewQueue();records=await activities.realizationQueue();}catch(error){
  if(error instanceof ActivityError&&error.status===401)redirect('/login');
  return <section className="card"><h1>Acesso editorial indisponível</h1><p>Esta área exige uma conta editorial ativa e autorizada.</p><AuthForm mode="signout"/></section>;
 }
 return <section className="card"><h1>Revisão editorial</h1><p>Confira o conteúdo, quem propõe e como participar. Aprove a publicação ou explique por que a atividade precisa ser rejeitada.</p>{queue.length?<ul className="activity-list">{queue.map(a=><li key={a.id}><article aria-labelledby={'atividade-'+a.id}><h2 id={'atividade-'+a.id}><Link href={'/dashboard/atividade/'+a.id}>{a.titulo}</Link></h2><p>{a.nome_publicador??'Publicador'}</p><p><time dateTime={a.inicio_previsto}>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'long',timeStyle:'short'}).format(new Date(a.inicio_previsto))}</time></p><p>{a.descricao}</p><p>{a.orientacao_acesso}</p><p>{a.estado_editorial==='em_revisao'?'Em revisão':a.estado_editorial==='aprovada'?'Aprovada — aguardando publicação':'Enviada para revisão'}</p><Link href={'/dashboard/atividade/'+a.id}>Ver detalhes da atividade</Link><EditorialDecisionForm activity={a}/></article></li>)}</ul>:<p>Nenhuma atividade aguardando revisão ou publicação.</p>}<h2>Relatos de realização</h2><p>Confira o que aconteceu e examine as referências antes de autorizar a divulgação.</p>{records.length?<ul className="activity-list">{records.map(r=><li key={r.id}><article><p className="eyebrow">Memória da atividade</p><h3>{r.titulo}</h3><p>{r.nome_publicador}</p><p className="preserve-lines">{r.descricao_factual}</p><p>{realizationDetails(r.origem_informacao)?.participantes??'Não informado'} participantes declarados</p><RealizationReviewForm activityId={r.atividade_id} hash={r.conteudo_sha256} evidence={r.evidencias}/></article></li>)}</ul>:<p>Nenhum relato aguardando revisão.</p>}</section>;
}
