import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '../../../components/Viewer.server';
import { IdeasWorkspace } from '../../../components/IdeasWorkspace';
import { userClient } from '../../../lib/supabase/server';
import { createIdeasService, ideaView } from '../../../lib/ideas/service.server';
import { canUseBetaInterpretation } from '../../../lib/proposals/beta-access.server';
export const dynamic = 'force-dynamic';
export default async function IdeaPage() {
  const viewer = await getViewer();
  if (viewer.kind === 'visitor') redirect('/login');
  if (viewer.kind !== 'ready') return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível verificar sua conta. Tente novamente mais tarde.</p></section>;
  const { data, error } = await (await userClient()).auth.getUser();
  if (error || !data.user?.id || !data.user.email_confirmed_at) redirect('/login');
  let ideas;
  try { ideas = (await createIdeasService().list(data.user.id)).map(ideaView); }
  catch { return <section className="card"><h1>Minhas ideias indisponíveis</h1><p>Não foi possível carregar seus rascunhos privados. Tente novamente mais tarde.</p></section>; }
  const manualActivityHref = viewer.dashboard === '/dashboard/pessoa-fisica' ? '/dashboard/pessoa-fisica/nova'
    : viewer.dashboard === '/dashboard' ? '/dashboard/nova-atividade' : undefined;
  return <section className="card"><h1>Descreva sua ideia</h1><IdeasWorkspace initialIdeas={ideas}
    canInterpret={canUseBetaInterpretation(data.user.id)} manualActivityHref={manualActivityHref} />
    <p><Link href="/meu-espaco">Voltar ao Meu espaço</Link></p></section>;
}
