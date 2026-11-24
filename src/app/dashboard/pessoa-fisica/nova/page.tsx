import {managedProfile} from '../../../../lib/queries/projects.server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ActivityForm } from '../../../../components/ActivityForm';
import { personState } from '../../../../lib/auth/person-access.server';
import { userClient } from '../../../../lib/supabase/server';
import { createIdeasService, ideaView } from '../../../../lib/ideas/service.server';
import { actionTemplates } from '../../../../lib/actions/catalog';
export const dynamic = 'force-dynamic';
export default async function NewPersonActivity({searchParams}:{searchParams:Promise<{ideia?:string;modelo?:string}>}) {
  const state = await personState();
  if (state.kind === 'login') redirect('/login');
  if (state.kind !== 'ready') return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível habilitar seu rascunho agora.</p></section>;
  let sourceIdea;
  const query=await searchParams;
  if(query.ideia&&query.modelo)return <section className="card"><h1>Escolha uma única origem</h1><p>Abra uma ideia ou um modelo de ação, não os dois ao mesmo tempo.</p><Link href="/biblioteca-acoes">Voltar à Biblioteca de Ações</Link></section>;
  const actionTemplate=query.modelo?actionTemplates.find(item=>item.id===query.modelo):undefined;
  if(query.modelo&&!actionTemplate)notFound();
  const ideaId=query.ideia;
  if(ideaId){
    const {data,error}=await (await userClient()).auth.getUser();
    if(error||!data.user?.id||!data.user.email_confirmed_at)redirect('/login');
    try{sourceIdea=ideaView(await createIdeasService().get(data.user.id,ideaId));}
    catch{return <section className="card"><h1>Ideia privada indisponível</h1><p>Este rascunho não pode ser usado neste perfil. Volte a Minhas ideias para escolher um rascunho próprio.</p><Link href="/meu-espaco/ideia">Voltar a Minhas ideias</Link></section>;}
  }
  const {availableProjects:projects}=await managedProfile(state.person.sujeito_id);
  const currentSuggestions = sourceIdea?.revised_text !== null && sourceIdea?.revised_interpretation === null
    ? undefined : (sourceIdea?.revised_interpretation ?? sourceIdea?.original_interpretation)?.dados.atividades;
  return <section className="card">
    <Link href="/dashboard/pessoa-fisica">Voltar às minhas atividades</Link>
    <h1>{sourceIdea?'Usar ideia para criar atividade':actionTemplate?'Adaptar modelo para criar atividade':'Criar atividade'}</h1>
    <p>Conte o que vai acontecer, quando e como participar. O horário é de Itaperuna, America/Sao_Paulo. Se já começou, marque “A atividade está acontecendo agora”.</p>
    {sourceIdea&&<section aria-labelledby="ideia-origem"><h2 id="ideia-origem">Conteúdo da ideia selecionada</h2><p>Rascunho privado e não verificado; sugestões não comprovam fatos.</p><h3>Texto original</h3><blockquote>{sourceIdea.original_text}</blockquote>{sourceIdea.revised_text&&<><h3>Texto revisado</h3><blockquote>{sourceIdea.revised_text}</blockquote></>}<h3>Possíveis atividades sugeridas</h3>{currentSuggestions?.length?<ul>{currentSuggestions.map((item,index)=><li key={index}><p>{item.descricao}</p><blockquote>Trecho de origem: {item.trecho}</blockquote></li>)}</ul>:sourceIdea.revised_text !== null && sourceIdea.revised_interpretation === null?<p>O texto revisado ainda não possui sugestões atualizadas; descreva manualmente a atividade.</p>:<p>Nenhuma atividade foi sugerida; descreva manualmente o que pretende realizar.</p>}</section>}
    {actionTemplate&&<section aria-labelledby="modelo-selecionado"><h2 id="modelo-selecionado">Modelo de ação sugerido</h2><p>{actionTemplate.objective}</p><h3>Etapas possíveis</h3><ol>{actionTemplate.stages.map((stage,index)=><li key={index}>{stage}</li>)}</ol><p><strong>Resultado esperado (hipótese):</strong> {actionTemplate.expectedOutcome}</p><h3>Cuidados necessários</h3><ul>{actionTemplate.care.map((care,index)=><li key={index}>{care}</li>)}</ul><p>Este modelo é apenas uma referência. Ele não representa atividade real, autorização, responsável ou resultado ocorrido.</p></section>}
    <ActivityForm projects={projects} sourceIdea={sourceIdea} actionTemplate={actionTemplate} returnTo="/dashboard/pessoa-fisica" />
  </section>;
}
