import {managedProfile} from '../../../../lib/queries/projects.server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ActivityForm } from '../../../../components/ActivityForm';
import { personState } from '../../../../lib/auth/person-access.server';
export const dynamic = 'force-dynamic';
export default async function NewPersonActivity() {
  const state = await personState();
  if (state.kind === 'login') redirect('/login');
  if (state.kind !== 'ready') return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível habilitar seu rascunho agora.</p></section>;
  const {availableProjects:projects}=await managedProfile(state.person.sujeito_id);
  return <section className="card">
    <Link href="/dashboard/pessoa-fisica">Voltar às minhas atividades</Link>
    <h1>Criar atividade</h1>
    <p>Conte o que vai acontecer, quando e como participar. O horário é de Itaperuna, America/Sao_Paulo. Se já começou, marque “A atividade está acontecendo agora”.</p>
    <ActivityForm projects={projects} returnTo="/dashboard/pessoa-fisica" />
  </section>;
}
