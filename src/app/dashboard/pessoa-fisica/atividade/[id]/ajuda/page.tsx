import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { personState } from '../../../../../../lib/auth/person-access.server';
import { activities } from '../../../../../../lib/activities/service.server';
import { e4Service, E4Error } from '../../../../../../lib/capabilities/service.server';
import { publicActivities } from '../../../../../../lib/queries/public.server';
import { publicPublisher } from '../../../../../../lib/activities/publication';
import { ActivityHelpWorkspace } from '../../../../../../components/ActivityHelpWorkspace';

export const dynamic = 'force-dynamic';

export default async function ActivityHelpPage({ params }: { params: Promise<{ id: string }> }) {
  const state = await personState();
  if (state.kind === 'login') redirect('/login');
  if (state.kind !== 'ready') return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível verificar sua autorização para esta atividade.</p></section>;
  const { id } = await params;
  let activity;
  try { activity = await activities.get(id); }
  catch { notFound(); }
  if (activity.criado_por_sujeito_id !== state.person.sujeito_id) notFound();
  let activityPublicEligible = false;
  try {
    const snapshot = await publicActivities.get(id);
    const publisher = publicPublisher(snapshot);
    activityPublicEligible = publisher.id === state.person.sujeito_id && publisher.tipo === 'pessoa_fisica';
  } catch { /* Ações privadas continuam disponíveis quando a atividade não está publicamente elegível. */ }
  const result = await Promise.all([
    e4Service.listActivityNeeds(id),
    e4Service.activityNeedInterests(id),
  ]).then(([owned, interests]) => ({ ok: true as const, owned, interests }))
    .catch((error: unknown) => ({ ok: false as const, error }));
  if (!result.ok) {
    if (result.error instanceof E4Error && result.error.status === 404) notFound();
    return <section className="card"><h1>Ajuda indisponível</h1><p>Não foi possível consultar as solicitações desta atividade agora.</p></section>;
  }
  return <><p><Link href="/dashboard/pessoa-fisica">← Minha Praça</Link></p><ActivityHelpWorkspace activity={{ id: activity.id, title: activity.titulo }} activityPublicEligible={activityPublicEligible} initialNeeds={result.owned.needs} initialInterests={result.interests as never[]}/></>;
}
