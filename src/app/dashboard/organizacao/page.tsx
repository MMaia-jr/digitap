import { redirect } from 'next/navigation';
import { organizationState } from '../../../lib/auth/dashboard.server';
import { AuthForm } from '../../../components/AuthForm';
export const dynamic='force-dynamic';
export default async function Organization(){
 const state=await organizationState();
 if(state.kind==='login')redirect('/login');if(state.kind==='ready')redirect('/dashboard');
 if(state.kind!=='onboarding')return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível habilitar este cadastro agora. Confirme seu e-mail e tente novamente mais tarde.</p><AuthForm mode="signout"/></section>;
 return <section className="card"><p className="eyebrow">Segundo passo</p><h1>Cadastre a organização</h1><p>Informe o nome público. A representação institucional permanecerá pendente de revisão.</p><p>Se uma tentativa anterior falhou, você pode repetir este passo. Um vínculo já criado será preservado.</p><AuthForm mode="organization"/><AuthForm mode="signout"/></section>;
}
