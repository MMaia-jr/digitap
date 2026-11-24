'use client';
import { useEffect,useRef,useState,useSyncExternalStore,type FormEvent } from 'react';
import { ActivityError,localStartToInstant,instantToLocalStart,type PrivateActivity } from '../lib/activities/domain';
import type { IdeaView } from '../lib/ideas/service.server';
import type { ActionTemplate } from '../lib/actions/catalog';
const subscribeHydration=()=>()=>{};
function suggestedDescription(idea:IdeaView){
 // A manual text revision without a new interpretation invalidates old AI suggestions.
 if(idea.revised_text!==null&&idea.revised_interpretation===null)return '';
 const interpretation=idea.revised_interpretation??idea.original_interpretation;
 return interpretation.dados.atividades.map(item=>item.descricao).join('\n');
}
export function ActivityForm({activity,sourceIdea,actionTemplate,returnTo,onNavigate,allowRetrospective=false,organizationConsent,sendOnly=false,projects=[]}:{projects?:{id:string;titulo:string}[];activity?:PrivateActivity;sourceIdea?:IdeaView;actionTemplate?:ActionTemplate;returnTo?:'/dashboard/pessoa-fisica';onNavigate?:(path:string)=>void;allowRetrospective?:boolean;organizationConsent?:'required'|'unavailable';sendOnly?:boolean}){
 const ready=useSyncExternalStore(subscribeHydration,()=>true,()=>false);const [pending,setPending]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [consentedVersion,setConsentedVersion]=useState<string|null>(null);
 const versionKey=activity?`${activity.id}:${activity.versao_submetida}`:null;
 const authorized=versionKey!==null&&consentedVersion===versionKey;
 const [retrospective,setRetrospective]=useState(allowRetrospective&&activity?.retrospectiva===true);
 const [ongoing,setOngoing]=useState(false);const dateInput=useRef<HTMLInputElement>(null),previousDate=useRef('');
 const [feedback,setFeedback]=useState<{message:string;fields?:Record<string,string>}|null>(null);
 const inFlight=useRef(false),summary=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(feedback)summary.current?.focus();},[feedback]);
 async function request(body:Record<string,unknown>,send=false){
  if(inFlight.current)return;inFlight.current=true;setPending(true);setFeedback(null);
  try{
   const path=sourceIdea?'/api/ideias/'+sourceIdea.id+'/atividade':activity?'/api/atividades/'+activity.id+(send?'/enviar':''):'/api/atividades';
   const response=await fetch(path,{method:activity&&!send?'PATCH':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(response.ok&&typeof result.next==='string'&&/^\/dashboard\/atividade\/[0-9a-f-]{36}$/.test(result.next)){const destination=returnTo??result.next;if(onNavigate)onNavigate(destination);else window.location.assign(destination);}
   else setFeedback({message:result.message??'Não foi possível concluir.',fields:result.fields});
  }catch{setFeedback({message:'Não foi possível conectar. Tente novamente.'});}
  finally{inFlight.current=false;setPending(false);}
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(sendOnly)return;const data=new FormData(event.currentTarget);
  try{
   const inicio_previsto=ongoing?new Date().toISOString():localStartToInstant(String(data.get('inicio_previsto')??''),new Date(),retrospective);
   await request({... (ongoing?{acontecendo_agora:true}:{}),...(retrospective?{retrospectiva:true}:{}),...(projects.length?{projeto_id:data.get('projeto_id')||null}:{}),titulo:data.get('titulo'),descricao:data.get('descricao'),inicio_previsto,orientacao_acesso:data.get('orientacao_acesso'),referencia_oficial:data.get('referencia_oficial'),...(activity?{versao_esperada:activity.versao_submetida}:{}),...(sourceIdea?{versao_esperada:sourceIdea.version,pedido_id:globalThis.crypto.randomUUID()}:{})});
  }catch(error){setFeedback(error instanceof ActivityError?{message:error.message,fields:error.fields}:{message:'Confira os campos indicados.'});}
 }
 const field=(name:'titulo'|'descricao'|'inicio_previsto'|'orientacao_acesso'|'referencia_oficial',label:string,max:number,type='text')=>{
  const templateDescription=actionTemplate?`Objetivo sugerido: ${actionTemplate.objective}\n\nEtapas sugeridas:\n${actionTemplate.stages.map(stage=>`- ${stage}`).join('\n')}`:'';
  const initial=activity?.[name]??(sourceIdea?(name==='titulo'?sourceIdea.title:name==='descricao'?suggestedDescription(sourceIdea):''):actionTemplate?(name==='titulo'?actionTemplate.title:name==='descricao'?templateDescription:''):'');const value=name==='inicio_previsto'&&initial?instantToLocalStart(initial):initial;
  const props={id:name,name,defaultValue:value,maxLength:max,required:name!=='referencia_oficial','aria-invalid':feedback?.fields?.[name]?'true' as const:undefined,'aria-describedby':feedback?.fields?.[name]?name+'-error':undefined};
  return <div className="field" key={name}><label htmlFor={name}>{label}</label>{name==='descricao'||name==='orientacao_acesso'?<textarea {...props} rows={name==='descricao'?6:3}/>:<input {...props} ref={name==='inicio_previsto'?dateInput:undefined} readOnly={name==='inicio_previsto'&&ongoing} type={type}/>}{feedback?.fields?.[name]&&<p className="error" id={name+'-error'}>{feedback.fields[name]}</p>}</div>;
 };
 return <form onSubmit={save} onChange={()=>setDirty(true)} noValidate aria-label={sendOnly?'Enviar rascunho':activity?(activity.estado_editorial==='publicada'?'Editar atividade publicada':'Editar rascunho'):'Nova atividade'} aria-busy={pending}>
  {feedback&&<div className="feedback error" role="alert" ref={summary} tabIndex={-1}>{feedback.message}</div>}
  {!sendOnly&&<>
  <div className="field checkbox-field"><label><input type="checkbox" disabled={!ready||pending||retrospective} checked={ongoing} onChange={event=>{const checked=event.target.checked;setOngoing(checked);if(dateInput.current){if(checked){previousDate.current=dateInput.current.value;dateInput.current.value=instantToLocalStart(new Date().toISOString());}else dateInput.current.value=previousDate.current;}}}/> A atividade está acontecendo agora</label></div>
  {allowRetrospective&&<div className="field checkbox-field"><label><input type="checkbox" disabled={!ready||pending||ongoing} checked={retrospective} onChange={event=>setRetrospective(event.target.checked)}/> Esta atividade já aconteceu</label>{retrospective&&<p>Informe o horário da atividade declarada. O relato da realização é registrado separadamente.</p>}</div>}
  {projects.length>0&&<div className="field"><label htmlFor="projeto_id">Projeto (opcional)</label><select id="projeto_id" name="projeto_id" defaultValue={activity?.projeto_id??''} aria-invalid={Boolean(feedback?.fields?.projeto_id)} aria-describedby={feedback?.fields?.projeto_id?'projeto-error':undefined}><option value="">Sem projeto</option>{projects.map(project=><option key={project.id} value={project.id}>{project.titulo}</option>)}</select>{feedback?.fields?.projeto_id&&<p className="error" id="projeto-error">{feedback.fields.projeto_id}</p>}</div>}{field('titulo','Título',180)}{field('descricao','Descrição',5000)}{field('inicio_previsto',retrospective?'Início informado (America/Sao_Paulo)':'Data e horário (America/Sao_Paulo)',32,'datetime-local')}{field('orientacao_acesso','Orientação de acesso',600)}{!returnTo&&field('referencia_oficial','Link oficial (opcional)',2048,'url')}
  <p>{activity?.estado_editorial==='publicada'?'Salvar cria uma versão pendente; a versão pública atual continua visível até a aprovação editorial.':'O rascunho e o envio permanecem privados. Enviar não significa publicar.'}</p>
  {actionTemplate&&<p>Modelo sugerido; ainda não é uma atividade real. Adapte o título e a descrição, informe os dados verdadeiros e confirme para criar um rascunho privado. O modelo não fornece data, local, autorização ou resultado realizado.</p>}
  {sourceIdea&&<p>Usar a ideia não a altera. {sourceIdea.revised_text!==null&&sourceIdea.revised_interpretation===null?'O texto revisado não possui interpretação atualizada. Descreva manualmente a atividade; sugestões anteriores não serão usadas.':'Confira as sugestões.'} Complete os campos e confirme a criação; a atividade ficará privada como rascunho.</p>}
  <button type="submit" disabled={!ready||pending}>{pending?'Aguarde…':sourceIdea?'Criar rascunho privado a partir desta ideia':activity?'Salvar alterações':'Salvar rascunho'}</button>
  </>}
  {!returnTo&&activity?.estado_editorial==='rascunho'&&<>
   <p>{sendOnly?'Versão pronta para envio: ':'Salve as alterações antes de enviar a versão '}{activity.versao_submetida}.</p>
   {organizationConsent==='required'&&<div className="field checkbox-field"><label>
    <input type="checkbox" checked={authorized} disabled={!ready||pending} onChange={event=>{
     event.stopPropagation();setConsentedVersion(event.target.checked?versionKey:null);
    }}/> Autorizo a divulgação desta versão após revisão editorial.
   </label></div>}
   {organizationConsent==='unavailable'&&<p>O envio exige um vínculo organizacional com permissão de envio e divulgação.</p>}
   <button type="button" disabled={!ready||pending||dirty||organizationConsent==='unavailable'||(organizationConsent==='required'&&!authorized)}
    onClick={()=>request({versao_esperada:activity.versao_submetida,...(organizationConsent==='required'?{autoriza_publicacao:authorized}:{})},true)}>Enviar atividade</button>
  </>}
 </form>;
}
