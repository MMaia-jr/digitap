import {SubmitActivityForm} from '../../../../components/SubmitActivityForm';
import {managedProfile} from '../../../../lib/queries/projects.server';
import { notFound,redirect } from 'next/navigation';
import Link from 'next/link';
import { activities } from '../../../../lib/activities/service.server';
import { ActivityError } from '../../../../lib/activities/domain';
import { ActivityForm } from '../../../../components/ActivityForm';
import {ReviewForm} from '../../../../components/ReviewForm';
import {EvidenceForm} from '../../../../components/EvidenceForm';
import {ContestRecordForm} from '../../../../components/ContestRecordForm';
import {RevokeAuthorizationForm} from '../../../../components/RevokeAuthorizationForm';
import {RecordWorkflowForm} from '../../../../components/RecordWorkflowForm';
import {RecordForm} from '../../../../components/RecordForm';
import {ScheduleForm} from '../../../../components/ScheduleForm';
import {WithdrawForm} from '../../../../components/WithdrawForm';
import {PublishForm} from '../../../../components/PublishForm';
import {ExecutionPlanWorkspace,type ExecutionPlan} from '../../../../components/ExecutionPlanWorkspace';
import {PrivateEvidenceAttachments} from '../../../../components/PrivateEvidenceAttachments';
export const dynamic='force-dynamic';
export default async function ActivityDetail({params}:{params:Promise<{id:string}>}){
 let activity;
 try{activity=await activities.get((await params).id);}catch(error){
  if(error instanceof ActivityError&&error.status===401)redirect('/login');
  if(error instanceof ActivityError&&error.status===404)notFound();
  return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível carregar esta atividade.</p></section>;
 }
 const organizationAuthority=activity.autorizacao_organizacional;
 if(organizationAuthority==='representante')return <section className="card">
  <Link href="/dashboard">Voltar à área restrita</Link>
  <h1>{activity.titulo}</h1>
  <p>{activity.descricao}</p>
  <p>Início: <time dateTime={activity.inicio_previsto}>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(activity.inicio_previsto))}</time></p>
  <p>{activity.orientacao_acesso}</p>
  {activity.referencia_oficial&&<p><a href={activity.referencia_oficial} rel="noreferrer noopener">Link oficial</a></p>}
  <ActivityForm activity={activity} organizationConsent="required" sendOnly/>
 </section>;
 const presentation=activity.pode_editar?await managedProfile().catch(error=>{
  if(organizationAuthority==='indisponivel')return null;
  throw error;
 }):null;
 if(organizationAuthority==='indisponivel'&&!presentation&&!activity.pode_ler_privado)return <section className="card">
  <h1>Acesso indisponível</h1><p>O envio exige um vínculo organizacional com permissão de envio e divulgação.</p>
 </section>;
 const organizationConsent=organizationAuthority==='indisponivel'?'unavailable':organizationAuthority?'required':undefined;
 const personal=presentation?.subject.tipo==='pessoa_fisica';
 const projects=presentation?.availableProjects??[];
 const coordinatedProject=personal?undefined:presentation?.projects.find(project=>project.id===activity.projeto_id);
 let executionPlan:ExecutionPlan|null=null;let planUnavailable=false;
 if(activity.pode_editar&&activity.criado_por_sujeito_id){
  try{const plan=await activities.getExecutionPlan(activity.id);if(plan)executionPlan={version:plan.version,total_previsto_centavos:plan.total_previsto_centavos,recursos:plan.recursos};}catch(error){if(!(error instanceof ActivityError&&error.status===404))planUnavailable=true;}
 }
 let record;let recordUnavailable=false;
 try{record=await activities.getRecord(activity.id);}catch(error){if(!(error instanceof ActivityError&&error.status===404))recordUnavailable=true;}
 const labels={rascunho:'Rascunho privado',enviada:'Enviada — continua privada',em_revisao:'Em revisão — continua privada',aprovada:'Aprovada — continua privada',devolvida:'Devolvida — continua privada',rejeitada:'Rejeitada — continua privada',publicada:'Publicada',retirada:'Retirada — não está pública'};
 return <section className="card"><Link href={activity.acesso_editorial?'/admin/atividades':'/dashboard'}>Voltar à área restrita</Link><h1>{activity.titulo}</h1>{activity.projeto_aprovacao&&<p className="feedback">{activity.projeto_aprovacao==='pendente'?'Aguardando envio ou aprovação da coordenação do projeto.':activity.projeto_aprovacao==='aprovada'?'Atividade aprovada pela coordenação. A publicação depende da revisão editorial.':'Atividade rejeitada pela coordenação. Edite e envie uma nova versão.'} {activity.projeto_parecer}</p>}<p>{labels[activity.estado_editorial]}</p>
  {activity.pode_editar?<><ActivityForm projects={projects} organizationConsent={organizationConsent} allowRetrospective={presentation?.subject.tipo==='organizacao'} returnTo={personal?'/dashboard/pessoa-fisica':undefined} activity={activity}/>{personal&&activity.estado_editorial==='rascunho'&&<SubmitActivityForm id={activity.id} version={activity.versao_submetida} title={activity.titulo}/>}</>:<><p>{activity.descricao}</p><dl><dt>{activity.retrospectiva?'Início informado (America/Sao_Paulo)':'Data e horário (America/Sao_Paulo)'}</dt><dd>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(activity.inicio_previsto))}</dd><dt>Orientação de acesso</dt><dd>{activity.orientacao_acesso}</dd></dl>{activity.referencia_oficial&&<p><a href={activity.referencia_oficial} rel="noreferrer noopener">Link oficial</a></p>}</>}
  {activity.pode_editar&&activity.criado_por_sujeito_id&&(planUnavailable?<p role="alert">Planejamento privado indisponível. Tente novamente.</p>:<ExecutionPlanWorkspace activityId={activity.id} initialPlan={executionPlan}/>)}
  {activity.motivo_editorial&&<section aria-label="Motivo editorial"><h2>Motivo editorial</h2><p>{activity.motivo_editorial}</p></section>}
  {activity.motivo_retirada&&<section aria-label="Motivo da retirada"><h2>Motivo da retirada</h2><p>{activity.motivo_retirada}</p></section>}
  {activity.tem_publicacao&&activity.estado_editorial!=='retirada'&&activity.estado_editorial!=='publicada'&&<p>A versão {activity.numero_versao_publicada} continua pública enquanto esta versão está pendente.</p>}
  {record?<section aria-label="Registro privado"><h2>Registro privado</h2><p>Data efetiva: {String(record.data_realizacao)}</p><p>Apuração — {String(record.estado_apuracao)}. Registro não é evidência nem reputação.</p><p>{String(record.descricao_factual)}</p><p>Origem: {String(record.origem_informacao)}</p><h3>Referências privadas</h3><p>Uma referência sustenta somente a afirmação indicada. Não valida automaticamente o relato completo.</p><ul>{record.evidencias.map((e:{id:string;tipo_fonte:string;afirmacao_sustentada:string})=><li key={e.id}>{e.tipo_fonte}: {e.afirmacao_sustentada}</li>)}</ul><PrivateEvidenceAttachments key={record.id} registroId={record.id} canUpload={activity.pode_editar}/>{!activity.acesso_editorial&&record.estado_editorial==='rascunho'&&<EvidenceForm id={activity.id}/>}{record.contestacoes.length>0&&<section aria-label="Divergências restritas"><h3>Divergências registradas — sem conclusão consensual</h3>{record.contestacoes.map((c:{divergencia:string;registrada_em:Date},i:number)=><p key={i}>{c.divergencia} — {new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(c.registrada_em))}</p>)}</section>}<ContestRecordForm id={activity.id} digest={record.conteudo_sha256}/><RecordWorkflowForm apuracao={record.estado_apuracao} id={activity.id} state={record.estado_editorial} digest={record.conteudo_sha256} editorial={activity.acesso_editorial} evidence={record.evidencias}/></section>:recordUnavailable?<p>Registro indisponível. Tente novamente.</p>:!activity.acesso_editorial&&<RecordForm id={activity.id} version={activity.versao_submetida}/>}
  {coordinatedProject&&<p><Link href={`/dashboard/projetos/${coordinatedProject.id}/necessidades`}>Gerenciar necessidades do projeto</Link></p>}
  {activity.acesso_editorial&&<RevokeAuthorizationForm id={activity.id}/>}
  {activity.pode_alterar_programacao&&<ScheduleForm id={activity.id} version={activity.versao_submetida} state={activity.estado_programacao!}/>}
  {activity.pode_retirar&&<WithdrawForm id={activity.id} version={activity.versao_submetida}/>}
  {activity.pode_revisar&&<ReviewForm activity={activity}/>}
  {activity.pode_publicar&&<PublishForm id={activity.id} version={activity.versao_submetida}/>}
  {activity.estado_editorial==='publicada'&&<p><Link href={'/atividade/'+activity.id}>Ver snapshot publicado</Link></p>}
 </section>;
}
