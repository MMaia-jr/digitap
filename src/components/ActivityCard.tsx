import Link from 'next/link';
import {publicPublisher,type PublicActivity} from '../lib/activities/publication';
import {ActivityArtwork} from './ActivityArtwork';
import {CommunityIcon} from './CommunityIcons';
const date=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'numeric',month:'short',year:'numeric'});
const time=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
export function ActivityCard({activity}:{activity:PublicActivity}){
 const publisher=publicPublisher(activity);
 return <article className="activity-card">
  <Link href={'/atividade/'+activity.id} className="activity-card-cover" aria-label={'Ver atividade: '+activity.titulo}><ActivityArtwork title={activity.titulo}/></Link>
  <div className="activity-card-body">
   <div className="card-kicker"><span className="tiny-dot"/>Da nossa comunidade{activity.estado_programacao!=='programada'&&<span className="status-tag">{activity.estado_programacao}</span>}</div>
   <h3><Link href={'/atividade/'+activity.id}>{activity.titulo}</Link></h3>
   <p className="card-date"><CommunityIcon name="calendar"/><time dateTime={activity.inicio_previsto}>{date.format(new Date(activity.inicio_previsto))}<span> · {time.format(new Date(activity.inicio_previsto))}</span></time></p>
   <p className="card-description">{activity.descricao}</p>
   <div className="card-bottom"><Link href={'/perfil/'+publisher.id} className="card-organizer"><span className="small-avatar" aria-hidden="true">{Array.from(publisher.nome_publico)[0]}</span><span>{publisher.nome_publico}</span></Link><Link className="card-details" href={'/atividade/'+activity.id}>Ver Detalhes<CommunityIcon name="arrow"/></Link></div>
  </div>
 </article>;
}
