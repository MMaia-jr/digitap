import { redirect } from 'next/navigation';
import { getViewer } from '../../components/Viewer.server';
import { ParticipationTaps } from '../../components/ParticipationTaps';

export const dynamic = 'force-dynamic';

export default async function WorkspaceEntry() {
  const viewer = await getViewer();

  if (viewer.kind === 'visitor') redirect('/login');
  if (viewer.kind === 'unavailable') {
    return (
      <section className="card">
        <h1>Serviço indisponível</h1>
        <p>Não foi possível verificar seu acesso. Tente novamente mais tarde.</p>
      </section>
    );
  }
  if (viewer.dashboard !== '/meu-espaco') redirect(viewer.dashboard);

  return <ParticipationTaps variant="unlinked" />;
}
