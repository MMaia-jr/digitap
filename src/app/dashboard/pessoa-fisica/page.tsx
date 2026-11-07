import {redirect} from 'next/navigation';
import {AuthForm} from '../../../components/AuthForm';
import {personState} from '../../../lib/auth/person-access.server';
import Link from 'next/link';
import {SubmitActivityForm} from '../../../components/SubmitActivityForm';
import {activities} from '../../../lib/activities/service.server';
export const dynamic='force-dynamic';
export default async function PersonDashboard(){
 const state=await personState();if(state.kind==='login')redirect('/login');
 if(state.kind!=='ready')return <section className="card"><h1>{state.kind==='unavailable'?'Serviço indisponível':'Acesso indisponível'}</h1><p>Não foi possível verificar seu cadastro de pessoa física agora.</p><AuthForm mode="signout"/></section>;
 let drafts;try{drafts=await activities.list();}catch{/* Keep service failure distinct from an empty collection. */}
 const labels={rascunho:'Rascunho privado',enviada:'Enviada para revisão',em_revisao:'Em revisão',aprovada:'Aprovada',devolvida:'Devolvida',rejeitada:'Rejeitada',publicada:'Publicada',retirada:'Retirada'};
 return <section className="card"><p className="eyebrow">Minha Praça</p><h1>Suas atividades</h1><p>{state.person.nome_publico}</p><p role="status">{state.person.estado==='pendente'?'Seu espaço já está pronto. Prepare sua atividade e envie para revisão.':'Cadastro de pessoa física ativo'}</p><p>Você já pode preparar rascunhos. A publicação depende de curadoria e não é automática.</p><Link className="button" href="/dashboard/pessoa-fisica/nova">Criar Atividade</Link><h2>Atividades que você criou</h2>{drafts===undefined?<p>Não foi possível carregar suas atividades. Tente novamente em instantes.</p>:drafts.length===0?<p>Sua primeira atividade começa aqui. Use “Criar Atividade” para preparar um rascunho.</p>:<ul className="activity-list">{drafts.map(a=><li key={a.id}><article><h3>{a.titulo}</h3><p>{labels[a.estado_editorial]}</p><p>{a.descricao}</p><p><time dateTime={a.inicio_previsto}>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'long',timeStyle:'short'}).format(new Date(a.inicio_previsto))}</time></p>{a.motivo_editorial&&<p>Motivo da decisão: {a.motivo_editorial}</p>}{a.estado_editorial==='rascunho'&&<SubmitActivityForm id={a.id} version={a.versao_submetida} title={a.titulo}/>} {a.numero_versao_publicada&&<Link href={'/atividade/'+a.id}>Ver versão pública</Link>}</article></li>)}</ul>}<h2>Contato para contestação</h2><p>Fale com o editor provisório: <a href="mailto:muralitaperuna@gmail.com">muralitaperuna@gmail.com</a>.</p></section>;
}
