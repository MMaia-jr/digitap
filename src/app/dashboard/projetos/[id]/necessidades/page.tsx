import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { E4Error, e4Service } from '../../../../../lib/capabilities/service.server';
import { ProjectNeedsWorkspace } from '../../../../../components/E4Workspaces';
import { inviteCollaborator } from '../../../collaboration-actions';

export const dynamic = 'force-dynamic';

export default async function NeedsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  type ProjectNeeds = Awaited<ReturnType<typeof e4Service.listProjectNeeds>>;

  let result: ProjectNeeds | null = null;
  let interests: Awaited<ReturnType<typeof e4Service.projectInterests>> = [];
  let loadError: unknown;

  try {
    result = await e4Service.listProjectNeeds(id);
    interests = await e4Service.projectInterests(id);
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    if (loadError instanceof E4Error && loadError.status === 401) redirect('/login');
    if (loadError instanceof E4Error && [403, 404].includes(loadError.status)) notFound();
    return (
      <section className="card">
        <h1>Necessidades indisponíveis</h1>
        <p>Não foi possível verificar a coordenação deste projeto.</p>
      </section>
    );
  }

  if (!result) notFound();

  return (
    <>
      <Link href={`/dashboard/projetos/${id}/colaboradores`}>← Gerenciar colaboradores</Link>
      <ProjectNeedsWorkspace project={result.project} needs={result.needs} interests={interests} />
      {interests
        .filter((item: Record<string, unknown>) => item.tipo === 'pessoa_fisica')
        .map((item: Record<string, unknown>) => (
          <form key={String(item.id)} action={inviteCollaborator}>
            <input type="hidden" name="projeto_id" value={id} />
            <input type="hidden" name="pessoa_id" value={String(item.sujeito_id)} />
            <input type="hidden" name="papel" value="colaborador" />
            <button type="submit">Convidar {String(item.nome_publico)} pelo fluxo existente</button>
          </form>
        ))}
    </>
  );
}
