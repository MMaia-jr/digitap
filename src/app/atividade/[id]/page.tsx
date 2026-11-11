import {realizationDetails} from '../../../lib/activities/realization';
import {RealizationPhoto} from '../../../components/RealizationPhoto';
import {publicPublisher} from '../../../lib/activities/publication';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {publicActivities} from '../../../lib/queries/public.server';
import {publicRecords} from '../../../lib/queries/records.server';
import {ActivityError} from '../../../lib/activities/domain';
import {ActivityArtwork} from '../../../components/ActivityArtwork';
import {CommunityIcon} from '../../../components/CommunityIcons';
import {ActivityParticipation} from '../../../components/ActivityParticipation';
export const dynamic='force-dynamic';
const types={pessoa_fisica:'Pessoa Física',coletivo_informal:'Coletivo informal',organizacao:'Organização'};
export default async function PublicActivity({params}:{params:Promise<{id:string}>}){
 let activity;try{activity=await publicActivities.get((await params).id);}catch(error){if(error instanceof ActivityError&&error.status===404)notFound();return <section className="card"><h1>Atividade indisponível</h1><p>Não foi possível consultar a atividade agora.</p></section>;}
 let record;let recordUnavailable=false;try{record=await publicRecords.get(activity.id);}catch(error){if(!(error instanceof ActivityError&&error.status===404))recordUnavailable=true;}
 const publisher=publicPublisher(activity);
 const realization=record?realizationDetails(record.origem_informacao):null;
 const date=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'long'}).format(new Date(activity.inicio_previsto));
 const time=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',timeStyle:'short'}).format(new Date(activity.inicio_previsto));
 return <article className="activity-detail">
  <nav className="breadcrumbs" aria-label="Você está aqui"><Link href="/">Início</Link><span>/</span><Link href="/#atividades-publicas">Atividades publicadas</Link><span>/</span><span>Um encontro na Praça</span></nav>
  <ActivityArtwork title={activity.titulo} large/>
  <div className="detail-layout"><div className="detail-main"><span className="pill"><span className="tiny-dot"/>Atividade publicada</span><h1>{activity.titulo}</h1><p className="detail-byline">Um encontro proposto por <Link href={'/perfil/'+publisher.id}>{publisher.nome_publico}</Link></p>
   <section className="detail-about"><h2>Sobre este encontro</h2><p className="preserve-lines">{activity.descricao}</p></section>
   <section className="access-note"><div className="note-icon"><CommunityIcon name="pin"/></div><div><h2>Como participar</h2><p className="preserve-lines">{activity.orientacao_acesso}</p>{activity.referencia_oficial&&<a className="text-link" href={activity.referencia_oficial} rel="noreferrer noopener">Mais informações no link oficial<CommunityIcon name="arrow"/></a>}</div></section>
   <section className="organizer-section"><h2>Quem está organizando</h2><Link className="organizer-panel" href={'/perfil/'+publisher.id} aria-label={'Ver perfil de '+publisher.nome_publico}><span className="profile-avatar organizer-avatar" aria-hidden="true">{Array.from(publisher.nome_publico)[0]}</span><span><strong>{publisher.nome_publico}</strong><small>{types[publisher.tipo]}</small></span><CommunityIcon name="arrow"/></Link></section>
   {record&&realization?<section className="realization-public" aria-labelledby="realizacao-titulo"><span className="realization-label">Memória compartilhada</span><h2 id="realizacao-titulo">Esta atividade já aconteceu</h2><p className="realization-attribution">Segundo o relato do responsável pela atividade</p><p className="realization-story preserve-lines">{Array.from(record.descricao_factual).length>200?Array.from(record.descricao_factual).slice(0,200).join('')+'…':record.descricao_factual}</p><div className="realization-facts"><span><strong>{realization.participantes}</strong> participantes declarados</span><span>Registrado em <time dateTime={realization.registrado_em}>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'long'}).format(new Date(realization.registrado_em))}</time></span></div>{record.estado_apuracao==='contestado'&&<p role="status">Este relato foi contestado; há uma divergência em análise.</p>}{record.evidencias.map(e=><RealizationPhoto key={e.id} url={e.url_publica}/>)}<p className="realization-disclosure">Relato autorizado e revisado para divulgação. Não representa verificação independente nem pontuação de reputação.</p></section>:(record||recordUnavailable)&&<section className="record-section" aria-label="Registro da realização">{record?<><h2>Registro da realização</h2><p>Data efetiva: {record.data_realizacao}</p><p>Apuração: {record.estado_apuracao}. Registro não é evidência nem reputação.</p>{record.estado_apuracao==='contestado'&&<p>Há divergência registrada; não há conclusão consensual.</p>}<p>{record.descricao_factual}</p><p>Origem: {record.origem_informacao}</p><ul>{record.evidencias.map(e=><li key={e.id}><a href={e.url_publica} rel="noreferrer noopener">{e.tipo_fonte}</a><p>Afirmação sustentada: {e.afirmacao_sustentada}</p></li>)}</ul></>:<p>Registro indisponível. Tente novamente.</p>}</section>}
  </div><aside className="detail-sidebar"><div className="event-plan"><p className="eyebrow">Guarde esse encontro</p><div className="plan-row"><span className="plan-icon"><CommunityIcon name="calendar"/></span><div><strong>{date}</strong><time dateTime={activity.inicio_previsto}>{time} · horário de Itaperuna</time></div></div><div className="plan-row"><span className="plan-icon"><CommunityIcon name="people"/></span><div><strong>Programação</strong><span className="programming-label">{activity.estado_programacao}</span></div></div><div className="plan-divider"/><ActivityParticipation activityId={activity.id}/></div><p className="detail-footnote">Uma boa experiência começa com informações claras. Confira as orientações antes de participar.</p></aside></div>
 </article>;
}
