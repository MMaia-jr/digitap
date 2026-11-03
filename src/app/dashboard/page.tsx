import { redirect } from 'next/navigation';
import { organizationState } from '../../lib/auth/dashboard.server';
import { AuthForm } from '../../components/AuthForm';
export const dynamic='force-dynamic';
export default async function Dashboard(){
 const state=await organizationState();
 if(state.kind==='login')redirect('/login');if(state.kind==='onboarding')redirect('/dashboard/organizacao');
 if(state.kind!=='ready')return <section className="card"><h1>{state.kind==='forbidden'?'Acesso indisponível':'Serviço indisponível'}</h1><p>{state.kind==='forbidden'?'Esta conta não pode acessar a área da organização.':'Não foi possível verificar seu acesso agora. Tente novamente mais tarde.'}</p><AuthForm mode="signout"/></section>;
 return <section className="card"><p className="eyebrow">Área da organização</p><h1>{state.organization.nome_publico}</h1><dl><dt>Validação institucional</dt><dd>{state.organization.estado_validacao==='validada'?'Validada':'Pendente de revisão'}</dd></dl><p>O cadastro não confirma representação institucional nem parceria. Esta área está em preparação.</p><AuthForm mode="signout"/></section>;
}
