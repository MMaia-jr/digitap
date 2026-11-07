import 'server-only';
import {createHash} from 'node:crypto';
import type {Sql} from '../database.server';
import {ActivityError,type PrivateActivity} from './domain';
import type {PublicPublisher} from './publication';
import {approvedContentHash} from './publication.server';

export async function recordOngoing(sql:Sql,row:PrivateActivity,actor:string,input:unknown){
 if((input as {acontecendo_agora?:unknown}).acontecendo_agora!==true)return;
 await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_novo,justificativa_restrita) values('atividade',$1,'atividade_horario_atual',$2,'rascunho',$3)",[row.id,actor,JSON.stringify({tipo:'horario-atual.v1',versao:row.versao_submetida,inicio_previsto:row.inicio_previsto})]);
}

/** Only a server-recorded declaration for this exact version permits a past start. */
export async function draftValidationClock(sql:Sql,row:PrivateActivity,clock:Date){
 if(new Date(row.inicio_previsto).getTime()>clock.getTime())return clock;
 const events=(await sql.query<{justificativa_restrita:string}>("select justificativa_restrita from public.eventos_editoriais where objeto_tipo='atividade' and objeto_id=$1 and acao='atividade_horario_atual'",[row.id])).rows;
 const declared=events.some(event=>{try{const m=JSON.parse(event.justificativa_restrita);return m.tipo==='horario-atual.v1'&&m.versao===row.versao_submetida&&m.inicio_previsto===row.inicio_previsto;}catch{return false;}});
 return declared?new Date(0):clock;
}

export async function recordPersonConsent(sql:Sql,row:PrivateActivity,account:string,subject:string){
 const proof=JSON.stringify({tipo:'consentimento-pf.v1',conta_id:account,sujeito_id:subject,atividade_id:row.id,versao:row.versao_submetida,conteudo_sha256:approvedContentHash(row),declaracao:'Titular autenticado autorizou a divulgação do nome público e desta versão da atividade após revisão editorial.'});
 await sql.query("insert into public.autorizacoes_publicacao(objeto_tipo,objeto_id,escopo_autorizado,papel_autorizante,comprovante_restrito,autorizada_em) values('atividade',$1,$2,'Titular PF autenticado',$3,clock_timestamp())",[row.id,['divulgacao','atividade:versao:'+row.versao_submetida],proof]);
 await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('atividade',$1,'atividade_divulgacao_autorizada',$2,'rascunho','rascunho',$3)",[row.id,account,proof]);
}

export async function versionAuthorization(sql:Sql,row:PrivateActivity){
 const auth=(await sql.query<{id:string}>("select id from public.autorizacoes_publicacao where objeto_tipo='atividade' and objeto_id=$1 and situacao='vigente' and revogada_em is null and autorizada_em<=clock_timestamp() and (validade_ate is null or validade_ate>clock_timestamp()) and 'divulgacao'=any(escopo_autorizado) and $2=any(escopo_autorizado) and char_length(trim(papel_autorizante))>0 and char_length(trim(comprovante_restrito))>0 order by autorizada_em desc,id limit 1 for share",[row.id,'atividade:versao:'+row.versao_submetida])).rows[0];
 if(!auth)throw new ActivityError(422,'O titular ainda não autorizou a divulgação desta versão ou a autorização foi revogada.');
 return auth.id;
}

async function personPublisher(sql:Sql,id:string){
 const subject=(await sql.query<PublicPublisher&{estado:string}>(`select s.id,s.tipo,s.nome_publico,s.estado
  from public.sujeitos_publicadores s join public.pessoas_fisicas p on p.sujeito_id=s.id
  join public.contas_acesso c on c.id=p.conta_id
  join public.vinculos_publicadores v on v.sujeito_id=s.id and v.conta_id=c.id
  where s.id=$1 and s.tipo='pessoa_fisica' and s.criado_por_conta_id=c.id
    and s.estado in ('pendente','ativo') and s.risco<>'alto' and c.situacao='ativa'
    and c.organizacao_id is null and c.papel in ('publicador','editor','administrador')
    and v.atual and v.situacao='ativo' and v.papel_vinculo='titular' and 'enviar'=any(v.escopos)
  for share of s,p,c,v`,[id])).rows[0];
 if(!subject)throw new ActivityError(422,'Pessoa física ou vínculo indisponível para publicação.');
 return subject;
}

export async function activePersonPublisher(sql:Sql,id:string){
 const subject=await personPublisher(sql,id);
 if(subject.estado!=='ativo')throw new ActivityError(422,'A pessoa física ainda precisa de curadoria inicial.');
 return {id:subject.id,tipo:subject.tipo,nome_publico:subject.nome_publico};
}

/** Runs inside the same transaction as approval + snapshot publication. */
export async function initialPersonCuration(sql:Sql,subjectId:string,activityId:string,editor:string,requestId:string){
 await sql.query('select id from public.sujeitos_publicadores where id=$1 for update',[subjectId]);
 const subject=await personPublisher(sql,subjectId);
 if(subject.estado==='ativo')return;
 const hash=createHash('sha256').update(JSON.stringify({subjectId,activityId,editor,requestId})).digest('hex');
 const first=(await sql.query<{id:string}>(`insert into public.casos_moderacao(sujeito_id,tipo,alvo,atividade_id,aberto_por_conta_id,motivo_restrito,pedido_id,payload_sha256)
  values($1,'curadoria_inicial','atividade',$2,$3,'Revisão inicial da pessoa física e da primeira atividade para divulgação.',$4,$5) returning id`,[subjectId,activityId,editor,requestId,hash])).rows[0];
 await sql.query('update public.casos_moderacao set atual=false where id=$1 and versao=1',[first.id]);
 await sql.query(`insert into public.casos_moderacao(id,versao,sujeito_id,tipo,alvo,atividade_id,aberto_por_conta_id,aberto_em,motivo_restrito,pedido_id,payload_sha256,estado,analisado_por_conta_id)
  select id,2,sujeito_id,tipo,alvo,atividade_id,aberto_por_conta_id,aberto_em,motivo_restrito,pedido_id,payload_sha256,'em_analise',$2 from public.casos_moderacao where id=$1 and versao=1`,[first.id,editor]);
 await sql.query('update public.casos_moderacao set atual=false where id=$1 and versao=2',[first.id]);
 await sql.query(`insert into public.casos_moderacao(id,versao,sujeito_id,tipo,alvo,atividade_id,aberto_por_conta_id,aberto_em,motivo_restrito,pedido_id,payload_sha256,estado,analisado_por_conta_id,decidido_por_conta_id,resultado,justificativa_restrita,efeito,decidida_em,prazo_contestacao_ate)
  select id,3,sujeito_id,tipo,alvo,atividade_id,aberto_por_conta_id,aberto_em,motivo_restrito,pedido_id,payload_sha256,'encerrado',$2,$2,'sem_julgamento','Curadoria inicial concluída pelo editor ao aprovar esta publicação. Sem sanção e sem liberação de autopublicação.','curadoria_previa',statement_timestamp(),statement_timestamp()+interval '30 days' from public.casos_moderacao where id=$1 and versao=2`,[first.id,editor]);
 await sql.query("update public.sujeitos_publicadores set estado='ativo',atualizada_em=clock_timestamp() where id=$1 and estado='pendente'",[subjectId]);
 await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,estado_anterior,estado_novo,justificativa_restrita) values('sujeito',$1,'curadoria_inicial_concluida',$2,'pendente','ativo',$3)",[subjectId,editor,JSON.stringify({tipo:'curadoria-inicial.v1',caso_id:first.id,versao:3,atividade_id:activityId})]);
}
