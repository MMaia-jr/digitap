import Link from 'next/link';
import {publicActivities} from '../lib/queries/public.server';
import type {PublicActivity} from '../lib/activities/publication';
import {getViewer} from '../components/Viewer.server';
import {ActivityCard} from '../components/ActivityCard';
import {CommunityIcon} from '../components/CommunityIcons';
export const dynamic='force-dynamic';
export default async function Home(){
 const [viewer,result]=await Promise.all([getViewer(),publicActivities.list().then(activities=>({activities,unavailable:false})).catch(()=>({activities:[] as PublicActivity[],unavailable:true}))]);
 const publish=viewer.kind==='ready'?viewer.dashboard:'/login';
 return <div className="home-feed">
  <section className="community-hero">
   <div className="hero-copy"><p className="hero-location"><span className="live-dot"/>Feito de gente. Feito aqui.</p><h1>A vida acontece<br/>quando a gente<br/><em>se encontra.</em></h1><p className="hero-description">Uma oficina, uma conversa, uma ideia em comum. Descubra o que está nascendo em Itaperuna e região — e faça parte.</p><div className="hero-actions"><a className="button button-lime" href="#atividades-publicas">Explorar atividades<CommunityIcon name="arrow"/></a><Link className="hero-publish" href={publish}>Quero publicar uma atividade</Link></div></div>
   <div className="hero-garden" aria-hidden="true"><div className="garden-sun"/><div className="garden-orbit"/><div className="garden-ground"/><svg className="garden-tree" viewBox="0 0 300 330" fill="none"><path d="M150 315V105m0 110-61-58m61 15 57-59" stroke="#d8e9af" strokeWidth="9" strokeLinecap="round"/><ellipse cx="103" cy="101" rx="67" ry="87" transform="rotate(-28 103 101)" fill="#87aa77"/><ellipse cx="199" cy="81" rx="61" ry="75" transform="rotate(27 199 81)" fill="#c8dda0"/><ellipse cx="67" cy="178" rx="46" ry="61" transform="rotate(-43 67 178)" fill="#d7ab75"/><ellipse cx="220" cy="172" rx="54" ry="65" transform="rotate(41 220 172)" fill="#5f8b6b"/></svg><div className="garden-note"><CommunityIcon name="people"/><span>Boas ideias crescem<br/><strong>quando encontram gente.</strong></span></div><span className="garden-coordinate">ITAPERUNA · RJ</span></div>
  </section>
  <section className="discovery" aria-labelledby="atividades-publicas"><div className="section-heading"><div><p className="eyebrow">Perto de você</p><h2 id="atividades-publicas">Encontre seu próximo encontro.</h2></div><span className="feed-label"><CommunityIcon name="leaf"/>Atividades na Praça</span></div>
   {result.unavailable?<div className="empty-state"><CommunityIcon name="calendar"/><h3>Uma pausa por aqui.</h3><p>Não foi possível carregar as atividades. Tente novamente em instantes.</p></div>:result.activities.length===0?<div className="empty-state"><div className="empty-illustration" aria-hidden="true"><span className="empty-halo"/><CommunityIcon name="leaf"/><span className="empty-spark spark-one"/><span className="empty-spark spark-two"/></div><p className="eyebrow">Toda praça começa com um encontro</p><h3>A Praça está esperando a primeira atividade</h3><p>Pode ser uma roda de conversa, uma oficina ou uma ação no bairro. Que tal começar algo bom?</p><Link className="button button-outline" href={publish}>Quero criar uma atividade<CommunityIcon name="arrow"/></Link></div>:<ul className="activity-grid">{result.activities.map(activity=><li key={activity.id}><ActivityCard activity={activity}/></li>)}</ul>}
  </section>
  <aside className="community-invitation"><div className="invitation-icon"><CommunityIcon name="people"/></div><div><h2>Tem uma ideia que merece companhia?</h2><p>A Praça também é sua. Compartilhe uma atividade e aproxime quem pode fazer parte.</p></div><Link className="button" href={publish}>Vamos criar um encontro<CommunityIcon name="arrow"/></Link></aside>
 </div>;
}
