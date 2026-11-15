import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '../../../components/Viewer.server';
import { ProposalForm } from '../../../components/ProposalForm';
export const dynamic = 'force-dynamic';
export default async function IdeaPage() {
  const viewer = await getViewer();
  if (viewer.kind === 'visitor') redirect('/login');
  if (viewer.kind !== 'ready') return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível verificar sua conta. Tente novamente mais tarde.</p></section>;
  return <section className="card"><h1>Descreva sua ideia</h1><ProposalForm /><p><Link href="/meu-espaco">Voltar ao Meu espaço</Link></p></section>;
}
