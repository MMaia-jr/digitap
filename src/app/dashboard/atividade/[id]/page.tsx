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
export const dynamic='force-dynamic';
export default async function ActivityDetail({params}:{params:Promise<{id:string}>}){
 let activity;
 try{activity=await activities.get((await params).id);}catch(error){
  if(error instanceof ActivityError&&error.status===401)redirect('/login');
  if(error instanceof ActivityError&&error.status===404)notFound();
  return <section className="card"><h1>Acesso indisponível</h1><p>Não foi possível carregar esta atividade.</p></section>;
 }
 let record;let recordUnavailable=false;
 try{record=await activities.getRecord(activity.id);}catch(error){if(!(error instanceof ActivityError&&error.status===404))recordUnavailable=true;}
 const labels={rascunho:'Rascunho privado',enviada:'Enviada — continua privada',em_revisao:'Em revisão — continua privada',aprovada:'Aprovada — continua privada',devolvida:'Devolvida — continua privada',rejeitada:'Rejeitada — continua privada',publicada:'Publicada',retirada:'Retirada — não está pública'};
 return <section className="card"><Link href={activity.acesso_editorial?'/admin/atividades':'/dashboard'}>Voltar à área restrita</Link><h1>{activity.titulo}</h1><p>{labels[activity.estado_editorial]}</p>
  {activity.pode_editar?<ActivityForm activity={activity}/>:<><p>{activity.descricao}</p><dl><dt>Data e horário (America/Sao_Paulo)</dt><dd>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(activity.inicio_previsto))}</dd><dt>Orientação de acesso</dt><dd>{activity.orientacao_acesso}</dd></dl>{activity.referencia_oficial&&<p><a href={activity.referencia_oficial} rel="noreferrer noopener">Link oficial</a></p>}</>}
  {activity.motivo_editorial&&<section aria-label="Motivo editorial"><h2>Motivo editorial</h2><p>{activity.motivo_editorial}</p></section>}
  {activity.motivo_retirada&&<section aria-label="Motivo da retirada"><h2>Motivo da retirada</h2><p>{activity.motivo_retirada}</p></section>}
  {activity.tem_publicacao&&activity.estado_editorial!=='retirada'&&activity.estado_editorial!=='publicada'&&<p>A versão {activity.numero_versao_publicada} continua pública enquanto esta versão está pendente.</p>}
  {record?<section aria-label="Registro privado"><h2>Registro privado</h2><p>Data efetiva: {String(record.data_realizacao)}</p><p>Apuração — {String(record.estado_apuracao)}. Registro não é evidência nem reputação.</p><p>{String(record.descricao_factual)}</p><p>Origem: {String(record.origem_informacao)}</p><h3>Referências privadas</h3><p>Uma referência sustenta somente a afirmação indicada. Não valida automaticamente o relato completo.</p><ul>{record.evidencias.map((e:{id:string;tipo_fonte:string;afirmacao_sustentada:string})=><li key={e.id}>{e.tipo_fonte}: {e.afirmacao_sustentada}</li>)}</ul>{!activity.acesso_editorial&&record.estado_editorial==='rascunho'&&<EvidenceForm id={activity.id}/>}{record.contestacoes.length>0&&<section aria-label="Divergências restritas"><h3>Divergências registradas — sem conclusão consensual</h3>{record.contestacoes.map((c:{divergencia:string;registrada_em:Date},i:number)=><p key={i}>{c.divergencia} — {new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(c.registrada_em))}</p>)}</section>}<ContestRecordForm id={activity.id} digest={record.conteudo_sha256}/><RecordWorkflowForm apuracao={record.estado_apuracao} id={activity.id} state={record.estado_editorial} digest={record.conteudo_sha256} editorial={activity.acesso_editorial} evidence={record.evidencias}/></section>:recordUnavailable?<p>Registro indisponível. Tente novamente.</p>:!activity.acesso_editorial&&<RecordForm id={activity.id} version={activity.versao_submetida}/>}
  {activity.acesso_editorial&&<RevokeAuthorizationForm id={activity.id}/>}
  {activity.pode_alterar_programacao&&<ScheduleForm id={activity.id} version={activity.versao_submetida} state={activity.estado_programacao!}/>}
  {activity.pode_retirar&&<WithdrawForm id={activity.id} version={activity.versao_submetida}/>}
  {activity.pode_revisar&&<ReviewForm activity={activity}/>}
  {activity.pode_publicar&&<PublishForm id={activity.id} version={activity.versao_submetida}/>}
  {activity.estado_editorial==='publicada'&&<p><Link href={'/atividade/'+activity.id}>Ver snapshot publicado</Link></p>}
 </section>;
}
