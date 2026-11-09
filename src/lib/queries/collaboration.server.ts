import 'server-only';
import {withTransaction,type Sql} from '../database.server';
import {ownedProfile,profileUser} from './profiles.server';
import {ActivityError} from '../activities/domain';
import {uuid} from '../activities/publication';
export const collaborationRoles={coordenador:'Coordenador',colaborador:'Colaborador',apoiador:'Apoiador'};
export async function collaborationUser(){const user=await profileUser();if(!user?.email_confirmed_at)throw new ActivityError(401,'Entre na sua conta para continuar.');return user;}
export async function ownedProject(sql:Sql,userId:string,id:string){
 if(!uuid(id))throw new ActivityError(404,'Projeto não encontrado.');
 const project=(await sql.query<{id:string;sujeito_id:string;titulo:string;descricao:string;ano:number}>('select id,sujeito_id,titulo,descricao,ano from public.projetos where id=$1 for share',[id])).rows[0];
 if(!project)throw new ActivityError(404,'Projeto não encontrado.');
 const owner=await ownedProfile(sql,userId,project.sujeito_id);
 if(!owner||owner.tipo==='pessoa_fisica')throw new ActivityError(403,'Apenas a coordenação deste projeto pode gerenciar colaboradores.');
 return {project,owner};
}
export async function projectCollaboration(id:string,search=''){
 const user=await collaborationUser();
 return withTransaction(async sql=>{
  const {project,owner}=await ownedProject(sql,user.id,id);
  const members=(await sql.query<{id:string;sujeito_id:string;nome_publico:string;papel:keyof typeof collaborationRoles;status:string}>(`select v.id,v.sujeito_id,s.nome_publico,v.papel,v.status from public.vinculos_colaboracao v join public.sujeitos_publicadores s on s.id=v.sujeito_id where v.projeto_id=$1 order by v.criado_em`,[id])).rows;
  const query=search.trim().normalize('NFC').slice(0,160);
  const people=query.length<2?[]:(await sql.query<{id:string;nome_publico:string}>(`select s.id,s.nome_publico from public.sujeitos_publicadores s where s.tipo='pessoa_fisica' and s.estado in ('pendente','ativo') and position(lower($1) in lower(s.nome_publico))>0 and exists(select 1 from public.pessoas_fisicas pf join public.contas_acesso c on c.id=pf.conta_id join public.vinculos_publicadores vp on vp.sujeito_id=s.id and vp.conta_id=c.id where pf.sujeito_id=s.id and c.situacao='ativa' and vp.atual and vp.situacao='ativo' and vp.papel_vinculo='titular' and 'editar'=any(vp.escopos)) order by s.nome_publico,s.id limit 20`,[query])).rows;
  const submissions=(await sql.query<{id:string;titulo:string;descricao:string;nome_publico:string;versao_submetida:number;inicio_previsto:string;orientacao_acesso:string;referencia_oficial:string|null;projeto_aprovacao:string;projeto_parecer:string|null}>(`select a.id,a.titulo,a.descricao,a.inicio_previsto::text,a.orientacao_acesso,a.referencia_oficial,s.nome_publico,a.versao_submetida,a.projeto_aprovacao,a.projeto_parecer from public.atividades a join public.sujeitos_publicadores s on s.id=a.criado_por_sujeito_id where a.projeto_id=$1 and a.sujeito_id<>$2 and a.estado_editorial<>'rascunho' and a.projeto_aprovacao is not null order by a.criada_em desc`,[id,owner.id])).rows;
  return {project,owner,members,people,submissions,query};
 });
}
export async function personalInvitations(subjectId:string){
 const user=await collaborationUser();
 return withTransaction(async sql=>{
  const owner=await ownedProfile(sql,user.id,subjectId);if(owner?.tipo!=='pessoa_fisica')throw new ActivityError(403,'Acesso indisponível.');
  return (await sql.query<{id:string;projeto_id:string;titulo:string;nome_publico:string;papel:keyof typeof collaborationRoles;status:string}>(`select v.id,v.projeto_id,p.titulo,s.nome_publico,v.papel,v.status from public.vinculos_colaboracao v join public.projetos p on p.id=v.projeto_id join public.sujeitos_publicadores s on s.id=p.sujeito_id where v.sujeito_id=$1 and v.origem='convite' order by v.criado_em desc`,[subjectId])).rows;
 });
}
export async function collaborationCommand(kind:'invite'|'remove'|'respond'|'decide',form:FormData){
 const user=await collaborationUser();
 return withTransaction(async sql=>{
  if(kind==='respond'){
   const id=form.get('vinculo_id'),subjectId=form.get('sujeito_id'),response=form.get('resposta');
   if(!uuid(id)||!uuid(subjectId)||!['ativo','recusado'].includes(String(response)))throw new ActivityError(422,'Resposta inválida.');
   const owner=await ownedProfile(sql,user.id,String(subjectId),true);if(owner?.tipo!=='pessoa_fisica')throw new ActivityError(403,'Convite indisponível para esta conta.');
   const changed=await sql.query("update public.vinculos_colaboracao set status=$3 where id=$1 and sujeito_id=$2 and origem='convite' and status='pendente' returning id",[id,subjectId,response]);
   if(!changed.rowCount)throw new ActivityError(409,'O convite mudou. Atualize a página.');
   return {subjectId:owner.id,projectId:null};
  }
  const projectId=String(form.get('projeto_id')??'');
  const {project,owner}=await ownedProject(sql,user.id,projectId);
  if(kind==='invite'){
   const subjectId=form.get('pessoa_id'),role=form.get('papel');
   if(!uuid(subjectId)||!Object.hasOwn(collaborationRoles,String(role)))throw new ActivityError(422,'Selecione uma pessoa e um papel válido.');
   const person=(await sql.query(`select s.id from public.sujeitos_publicadores s join public.pessoas_fisicas pf on pf.sujeito_id=s.id join public.contas_acesso c on c.id=pf.conta_id where s.id=$1 and s.tipo='pessoa_fisica' and s.estado in ('pendente','ativo') and c.situacao='ativa' for share of s,c`,[subjectId])).rows[0];
   if(!person)throw new ActivityError(422,'Pessoa física indisponível.');
   const changed=await sql.query(`insert into public.vinculos_colaboracao(sujeito_id,projeto_id,papel,origem) values($1,$2,$3,'convite') on conflict(sujeito_id,projeto_id) do update set papel=excluded.papel,status='pendente',origem='convite',criado_em=clock_timestamp() where vinculos_colaboracao.status='recusado' returning id`,[subjectId,projectId,role]);
   if(!changed.rowCount)throw new ActivityError(409,'Essa pessoa já tem um convite ou uma colaboração neste projeto.');
  }else if(kind==='remove'){
   const id=form.get('vinculo_id');if(!uuid(id))throw new ActivityError(422,'Vínculo inválido.');
   const result=await sql.query("update public.vinculos_colaboracao set status='recusado' where id=$1 and projeto_id=$2 and status in ('pendente','ativo') returning id",[id,projectId]);
   if(!result.rowCount)throw new ActivityError(409,'O vínculo mudou. Atualize a página.');
  }else{
   const id=form.get('atividade_id'),decision=form.get('decisao'),version=Number(form.get('versao'));
   const reason=String(form.get('parecer')??'').trim();
   if(!uuid(id)||!['aprovada','rejeitada'].includes(String(decision))||!Number.isInteger(version)||version<1||reason.length>1500||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(reason)||(decision==='rejeitada'&&reason.length<10))throw new ActivityError(422,'Informe uma decisão válida. Para rejeitar, explique o motivo com pelo menos 10 caracteres.');
   const activity=(await sql.query<{id:string;sujeito_id:string}>(`select id,sujeito_id from public.atividades where id=$1 and projeto_id=$2 and sujeito_id<>$3 and estado_editorial='enviada' and projeto_aprovacao='pendente' and versao_submetida=$4 for update`,[id,projectId,project.sujeito_id,version])).rows[0];
   if(!activity)throw new ActivityError(409,'A atividade mudou ou já foi decidida. Atualize a página.');
   const active=(await sql.query("select id from public.vinculos_colaboracao where sujeito_id=$1 and projeto_id=$2 and status='ativo' for share",[activity.sujeito_id,projectId])).rows[0];
   if(!active&&decision==='aprovada')throw new ActivityError(409,'A colaboração precisa estar ativa para aprovar a atividade.');
   await sql.query('update public.atividades set projeto_aprovacao=$2,projeto_versao_aprovada=$3,projeto_parecer=$4 where id=$1',[id,decision,decision==='aprovada'?version:null,reason||null]);
   await sql.query("insert into public.eventos_editoriais(objeto_tipo,objeto_id,acao,executada_por_conta_id,justificativa_restrita) values('atividade',$1,$2,$3,$4)",[id,'projeto_atividade_'+decision,owner.conta_id,JSON.stringify({tipo:'decisao-projeto.v1',projeto_id:projectId,versao:version,parecer:reason||null})]);
  }
  return {subjectId:project.sujeito_id,projectId};
 });
}
