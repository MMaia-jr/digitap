import Link from 'next/link';
import {notFound} from 'next/navigation';
import {publicProfile} from '../../../lib/queries/profiles.server';
import {ActivityError} from '../../../lib/activities/domain';
import {ActivityCard} from '../../../components/ActivityCard';
import {CommunityIcon} from '../../../components/CommunityIcons';
import {updateProfileName} from './actions';
export const dynamic='force-dynamic';
const types={pessoa_fisica:'Pessoa Física',coletivo_informal:'Coletivo informal',organizacao:'Organização'};
export default async function Profile({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{status?:string}>}){
 let profile;try{profile=await publicProfile((await params).id);}catch(error){if(error instanceof ActivityError&&error.status===404)notFound();return <section className="card"><h1>Perfil indisponível</h1><p>Não foi possível carregar este perfil agora. Tente novamente em instantes.</p></section>;}
 const {subject,activities,canEdit}=profile;const {status}=await searchParams;
 return <div className="profile-page"><nav className="breadcrumbs" aria-label="Você está aqui"><Link href="/">Início</Link><span>/</span><span>Gente da Praça</span></nav>
  <section className="profile-hero"><div className="profile-cover" aria-hidden="true"><div className="profile-cover-sun"/><div className="profile-cover-ring"/><CommunityIcon name="leaf"/><span>Juntos, a gente faz acontecer.</span></div><div className="profile-identity"><div className="profile-avatar" aria-hidden="true">{Array.from(subject.nome_publico)[0]}</div><div className="profile-heading"><span className="pill">{types[subject.tipo]}</span><h1>{subject.nome_publico}</h1><p>Fazendo parte da vida da nossa região, um encontro de cada vez.</p><div className="profile-meta"><span><CommunityIcon name="leaf"/>Na comunidade da Praça</span><span><strong>{activities.length}</strong> {activities.length===1?'atividade publicada':'atividades publicadas'}</span></div></div></div>
   {canEdit&&<details className="profile-editor"><summary className="button button-outline"><CommunityIcon name="edit"/>Editar Perfil</summary>{subject.tipo==='coletivo_informal'?<p>Para alterar o nome do coletivo, solicite revisão pelo <a href="mailto:muralitaperuna@gmail.com">canal de contato da Praça</a>.</p>:<form action={updateProfileName}><input type="hidden" name="sujeito_id" value={subject.id}/><div className="field"><label htmlFor="perfil-nome">Seu nome público</label><input id="perfil-nome" name="nome_publico" defaultValue={subject.nome_publico} minLength={2} maxLength={160} required/><p className="hint">Este nome fica visível no seu perfil. Não informe CPF, endereço ou documentos.</p></div><button type="submit">Salvar nome público</button></form>}</details>}
  </section>
  {status==='atualizado'&&<p role="status" className="feedback">Seu nome público foi atualizado.</p>}{status==='nome-invalido'&&<p role="alert" className="feedback error">Use de 2 a 160 caracteres de texto para o nome público, sem HTML.</p>}{status==='indisponivel'&&<p role="alert" className="feedback error">Não foi possível salvar o perfil. Verifique seu acesso e tente novamente.</p>}
  <section className="profile-activities" aria-labelledby="perfil-atividades"><div className="section-heading"><div><p className="eyebrow">A marca de quem participa</p><h2 id="perfil-atividades">Atividades publicadas</h2></div><span className="feed-label"><CommunityIcon name="calendar"/>Encontros na comunidade</span></div>{activities.length?<ul className="activity-grid">{activities.map(activity=><li key={activity.id}><ActivityCard activity={activity}/></li>)}</ul>:<div className="empty-state"><div className="empty-illustration"><CommunityIcon name="leaf"/></div><h3>Os próximos encontros começam aqui.</h3><p>Quando uma atividade deste perfil for publicada, ela também aparecerá nesta vitrine.</p></div>}</section>
 </div>;
}
