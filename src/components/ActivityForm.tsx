'use client';
import { useEffect,useRef,useState,useSyncExternalStore,type FormEvent } from 'react';
import { ActivityError,localStartToInstant,instantToLocalStart,type PrivateActivity } from '../lib/activities/domain';
const subscribeHydration=()=>()=>{};
export function ActivityForm({activity,returnTo,onNavigate,projects=[]}:{projects?:{id:string;titulo:string}[];activity?:PrivateActivity;returnTo?:'/dashboard/pessoa-fisica';onNavigate?:(path:string)=>void}){
 const ready=useSyncExternalStore(subscribeHydration,()=>true,()=>false);const [pending,setPending]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [ongoing,setOngoing]=useState(false);const dateInput=useRef<HTMLInputElement>(null),previousDate=useRef('');
 const [feedback,setFeedback]=useState<{message:string;fields?:Record<string,string>}|null>(null);
 const inFlight=useRef(false),summary=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(feedback)summary.current?.focus();},[feedback]);
 async function request(body:Record<string,unknown>,send=false){
  if(inFlight.current)return;inFlight.current=true;setPending(true);setFeedback(null);
  try{
   const path=activity?'/api/atividades/'+activity.id+(send?'/enviar':''):'/api/atividades';
   const response=await fetch(path,{method:activity&&!send?'PATCH':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(response.ok&&typeof result.next==='string'&&/^\/dashboard\/atividade\/[0-9a-f-]{36}$/.test(result.next)){const destination=returnTo??result.next;if(onNavigate)onNavigate(destination);else window.location.assign(destination);}
   else setFeedback({message:result.message??'Não foi possível concluir.',fields:result.fields});
  }catch{setFeedback({message:'Não foi possível conectar. Tente novamente.'});}
  finally{inFlight.current=false;setPending(false);}
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget);
  try{
   const inicio_previsto=ongoing?new Date().toISOString():localStartToInstant(String(data.get('inicio_previsto')??''));
   await request({... (ongoing?{acontecendo_agora:true}:{}),...(projects.length?{projeto_id:data.get('projeto_id')||null}:{}),titulo:data.get('titulo'),descricao:data.get('descricao'),inicio_previsto,orientacao_acesso:data.get('orientacao_acesso'),referencia_oficial:data.get('referencia_oficial'),...(activity?{versao_esperada:activity.versao_submetida}:{})});
  }catch(error){setFeedback(error instanceof ActivityError?{message:error.message,fields:error.fields}:{message:'Confira os campos indicados.'});}
 }
 const field=(name:'titulo'|'descricao'|'inicio_previsto'|'orientacao_acesso'|'referencia_oficial',label:string,max:number,type='text')=>{
  const initial=activity?.[name]??'';const value=name==='inicio_previsto'&&initial?instantToLocalStart(initial):initial;
  const props={id:name,name,defaultValue:value,maxLength:max,required:name!=='referencia_oficial','aria-invalid':feedback?.fields?.[name]?'true' as const:undefined,'aria-describedby':feedback?.fields?.[name]?name+'-error':undefined};
  return <div className="field" key={name}><label htmlFor={name}>{label}</label>{name==='descricao'||name==='orientacao_acesso'?<textarea {...props} rows={name==='descricao'?6:3}/>:<input {...props} ref={name==='inicio_previsto'?dateInput:undefined} readOnly={name==='inicio_previsto'&&ongoing} type={type}/>}{feedback?.fields?.[name]&&<p className="error" id={name+'-error'}>{feedback.fields[name]}</p>}</div>;
 };
 return <form onSubmit={save} onChange={()=>setDirty(true)} noValidate aria-label={activity?(activity.estado_editorial==='publicada'?'Editar atividade publicada':'Editar rascunho'):'Nova atividade'} aria-busy={pending}>
  {feedback&&<div className="feedback error" role="alert" ref={summary} tabIndex={-1}>{feedback.message}</div>}
  <div className="field checkbox-field"><label><input type="checkbox" disabled={!ready||pending} checked={ongoing} onChange={event=>{const checked=event.target.checked;setOngoing(checked);if(dateInput.current){if(checked){previousDate.current=dateInput.current.value;dateInput.current.value=instantToLocalStart(new Date().toISOString());}else dateInput.current.value=previousDate.current;}}}/> A atividade está acontecendo agora</label></div>
  {projects.length>0&&<div className="field"><label htmlFor="projeto_id">Projeto (opcional)</label><select id="projeto_id" name="projeto_id" defaultValue={activity?.projeto_id??''} aria-invalid={Boolean(feedback?.fields?.projeto_id)} aria-describedby={feedback?.fields?.projeto_id?'projeto-error':undefined}><option value="">Sem projeto</option>{projects.map(project=><option key={project.id} value={project.id}>{project.titulo}</option>)}</select>{feedback?.fields?.projeto_id&&<p className="error" id="projeto-error">{feedback.fields.projeto_id}</p>}</div>}{field('titulo','Título',180)}{field('descricao','Descrição',5000)}{field('inicio_previsto','Data e horário (America/Sao_Paulo)',32,'datetime-local')}{field('orientacao_acesso','Orientação de acesso',600)}{!returnTo&&field('referencia_oficial','Link oficial (opcional)',2048,'url')}
  <p>{activity?.estado_editorial==='publicada'?'Salvar cria uma versão pendente; a versão pública atual continua visível até a aprovação editorial.':'O rascunho e o envio permanecem privados. Enviar não significa publicar.'}</p>
  <button type="submit" disabled={!ready||pending}>{pending?'Aguarde…':activity?'Salvar alterações':'Salvar rascunho'}</button>
  {!returnTo&&activity?.estado_editorial==='rascunho'&&<><p>Salve as alterações antes de enviar a versão {activity.versao_submetida}.</p><button type="button" disabled={!ready||pending||dirty} onClick={()=>request({versao_esperada:activity.versao_submetida},true)}>Enviar atividade</button></>}
 </form>;
}
