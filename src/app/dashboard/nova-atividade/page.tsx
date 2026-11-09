import {managedProfile} from '../../../lib/queries/projects.server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { institutionalState } from '../../../lib/auth/dashboard.server';
import { ActivityForm } from '../../../components/ActivityForm';
export const dynamic='force-dynamic';
export default async function NewActivity(){
 const state=await institutionalState();if(state.kind==='login')redirect('/login');if(state.kind==='onboarding')redirect('/dashboard/organizacao');
 if(state.kind!=='ready')return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível habilitar o rascunho para esta conta.</p></section>;
 const {projects}=await managedProfile(state.organization.id);
 return <section className="card"><Link href="/dashboard">Voltar à organização</Link><h1>Nova atividade</h1><p>Complete os campos mínimos para salvar. O horário é de America/Sao_Paulo.</p><ActivityForm projects={projects}/></section>;
}
