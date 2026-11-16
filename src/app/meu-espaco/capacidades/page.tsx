import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '../../../components/Viewer.server';
import { CapabilitiesWorkspace } from '../../../components/E4Workspaces';
import { e4Service } from '../../../lib/capabilities/service.server';

export const dynamic = 'force-dynamic';

export default async function CapabilitiesPage() {
  const viewer = await getViewer();

  if (viewer.kind === 'visitor') redirect('/login');
  if (viewer.kind === 'unavailable') {
    return (
      <section className="card">
        <h1>Serviço indisponível</h1>
        <p>Não foi possível verificar sua autorização agora.</p>
      </section>
    );
  }
  if (viewer.dashboard === '/meu-espaco' && viewer.name === 'Minha conta') {
    return (
      <section className="card">
        <h1>Complete seu perfil primeiro</h1>
        <Link href="/cadastro/pessoa-fisica/completar">Concluir perfil pessoal</Link>
      </section>
    );
  }

  let subjects: Awaited<ReturnType<typeof e4Service.subjects>> = [];
  let initialCapabilities: Awaited<ReturnType<typeof e4Service.listCapabilities>> = [];
  let unavailable = false;

  try {
    subjects = await e4Service.subjects();
    initialCapabilities = subjects.length
      ? await e4Service.listCapabilities(subjects[0].id)
      : [];
  } catch {
    unavailable = true;
  }

  if (unavailable) {
    return (
      <section className="card">
        <h1>Não foi possível abrir Minhas capacidades</h1>
        <p>Entre novamente ou tente em instantes.</p>
      </section>
    );
  }

  return <CapabilitiesWorkspace subjects={subjects} initialCapabilities={initialCapabilities} />;
}
