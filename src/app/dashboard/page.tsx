import { redirect } from 'next/navigation';
import { organizationState } from '../../lib/auth/dashboard.server';
import { AuthForm } from '../../components/AuthForm';
import Link from 'next/link';
import { activities } from '../../lib/activities/service.server';
export const dynamic='force-dynamic';
export default async function Dashboard(){
 const state=await organizationState();
 if(state.kind==='login')redirect('/login');if(state.kind==='onboarding')redirect('/dashboard/organizacao');
 if(state.kind!=='ready')return <section className="card"><h1>{state.kind==='forbidden'?'Acesso indisponível':'Serviço indisponível'}</h1><p>{state.kind==='forbidden'?'Esta conta não pode acessar a área da organização.':'Não foi possível verificar seu acesso agora. Tente novamente mais tarde.'}</p><AuthForm mode="signout"/></section>;
 let drafts;try{drafts=await activities.list();}catch{/* Failure is shown as unavailability, never as an empty result. */}
 const labels={rascunho:'Rascunho privado',enviada:'Enviada — continua privada',em_revisao:'Em revisão — continua privada',aprovada:'Aprovada — continua privada',devolvida:'Devolvida — continua privada',rejeitada:'Rejeitada — continua privada'};
 return <section className="card"><p className="eyebrow">Área da organização</p><h1>{state.organization.nome_publico}</h1><dl><dt>Validação institucional</dt><dd>{state.organization.estado_validacao==='validada'?'Validada':'Pendente de revisão'}</dd></dl><p>O cadastro não confirma representação institucional nem parceria.</p><Link href="/dashboard/nova-atividade">Nova atividade</Link><h2>Atividades privadas</h2>{drafts===undefined?<p>Não foi possível carregar suas atividades.</p>:drafts.length===0?<p>Nenhuma atividade cadastrada.</p>:<ul>{drafts.map(a=><li key={a.id}><Link href={'/dashboard/atividade/'+a.id}>{a.titulo}</Link> — {labels[a.estado_editorial]}</li>)}</ul>}<AuthForm mode="signout"/></section>;
}
