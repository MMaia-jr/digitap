import {redirect} from 'next/navigation';
import {AuthForm} from '../../../components/AuthForm';
import {personState} from '../../../lib/auth/person-access.server';
export const dynamic='force-dynamic';
export default async function PersonDashboard(){
 const state=await personState();if(state.kind==='login')redirect('/login');
 if(state.kind!=='ready')return <section className="card"><h1>{state.kind==='unavailable'?'Serviço indisponível':'Acesso indisponível'}</h1><p>Não foi possível verificar seu cadastro de pessoa física agora.</p><AuthForm mode="signout"/></section>;
 return <section className="card"><p className="eyebrow">Pessoa física</p><h1>Seu cadastro</h1><p>{state.person.nome_publico}</p><p role="status">{state.person.estado==='pendente'?'Seu cadastro está pendente de curadoria':'Cadastro de pessoa física ativo'}</p><p>A publicação depende de curadoria. Esta área permite acompanhar o cadastro e não habilita publicação automática.</p><h2>Contato para contestação</h2><p>Fale com o editor provisório: <a href="mailto:muralitaperuna@gmail.com">muralitaperuna@gmail.com</a>.</p><AuthForm mode="signout"/></section>;
}
