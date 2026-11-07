import Link from 'next/link';
import { publicActivities } from '../lib/queries/public.server';
import { publicPublisher, type PublicActivity } from '../lib/activities/publication';
import { getViewer } from '../components/Viewer.server';
export const dynamic = 'force-dynamic';
const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' });
export default async function Home() {
  const [viewer, result] = await Promise.all([
    getViewer(),
    publicActivities.list().then(activities => ({ activities, unavailable: false })).catch(() => ({ activities: [] as PublicActivity[], unavailable: true })),
  ]);
  return <>
    <section className="card">
      <p className="eyebrow">Itaperuna e região</p>
      <h1>Encontre sua próxima atividade na Praça.</h1>
      <p>Encontros, oficinas e ações para fazer parte da vida da nossa região. Aqui você encontra as atividades publicadas após revisão.</p>
      <Link className="button" href={viewer.kind === 'ready' ? viewer.dashboard : '/login'}>Quero publicar uma atividade</Link>
    </section>
    <section aria-labelledby="atividades-publicas" className="public-agenda">
      <h2 id="atividades-publicas">Atividades na Praça</h2>
      {result.unavailable ? <p role="status">Não foi possível carregar as atividades. Tente novamente em instantes.</p> : result.activities.length === 0 ?
        <div className="card"><h3>Nenhuma atividade publicada ainda. A Praça está sendo construída.</h3><p>Ainda não há atividades públicas por aqui. Você pode começar preparando uma atividade para revisão.</p></div> :
        <ul className="activity-list">{result.activities.map(activity => <li key={activity.id}><article className="card">
          <p className="eyebrow">{publicPublisher(activity).nome_publico}</p>
          <h3><Link href={'/atividade/' + activity.id}>{activity.titulo}</Link></h3>
          <p><time dateTime={activity.inicio_previsto}>{date.format(new Date(activity.inicio_previsto))}</time></p>
          <p>{activity.descricao}</p><p>{activity.orientacao_acesso}</p>
          {activity.estado_programacao !== 'programada' && <p>Programação: {activity.estado_programacao}</p>}
        </article></li>)}</ul>}
    </section>
  </>;
}
