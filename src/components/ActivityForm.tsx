'use client';
import { useEffect,useRef,useState,useSyncExternalStore,type FormEvent } from 'react';
import { ActivityError,localStartToInstant,instantToLocalStart,type PrivateActivity } from '../lib/activities/domain';
const subscribeHydration=()=>()=>{};
export function ActivityForm({activity}:{activity?:PrivateActivity}){
 const ready=useSyncExternalStore(subscribeHydration,()=>true,()=>false);const [pending,setPending]=useState(false);
 const [dirty,setDirty]=useState(false);
 const [feedback,setFeedback]=useState<{message:string;fields?:Record<string,string>}|null>(null);
 const inFlight=useRef(false),summary=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(feedback)summary.current?.focus();},[feedback]);
 async function request(body:Record<string,unknown>,send=false){
  if(inFlight.current)return;inFlight.current=true;setPending(true);setFeedback(null);
  try{
   const path=activity?'/api/atividades/'+activity.id+(send?'/enviar':''):'/api/atividades';
   const response=await fetch(path,{method:activity&&!send?'PATCH':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(response.ok&&typeof result.next==='string'&&/^\/dashboard\/atividade\/[0-9a-f-]{36}$/.test(result.next))window.location.assign(result.next);
   else setFeedback({message:result.message??'Não foi possível concluir.',fields:result.fields});
  }catch{setFeedback({message:'Não foi possível conectar. Tente novamente.'});}
  finally{inFlight.current=false;setPending(false);}
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget);
  try{
   const inicio_previsto=localStartToInstant(String(data.get('inicio_previsto')??''));
   await request({titulo:data.get('titulo'),descricao:data.get('descricao'),inicio_previsto,orientacao_acesso:data.get('orientacao_acesso'),referencia_oficial:data.get('referencia_oficial'),...(activity?{versao_esperada:activity.versao_submetida}:{})});
  }catch(error){setFeedback(error instanceof ActivityError?{message:error.message,fields:error.fields}:{message:'Confira os campos indicados.'});}
 }
 const field=(name:'titulo'|'descricao'|'inicio_previsto'|'orientacao_acesso'|'referencia_oficial',label:string,max:number,type='text')=>{
  const initial=activity?.[name]??'';const value=name==='inicio_previsto'&&initial?instantToLocalStart(initial):initial;
  const props={id:name,name,defaultValue:value,maxLength:max,required:name!=='referencia_oficial','aria-invalid':feedback?.fields?.[name]?'true' as const:undefined,'aria-describedby':feedback?.fields?.[name]?name+'-error':undefined};
  return <div className="field" key={name}><label htmlFor={name}>{label}</label>{name==='descricao'||name==='orientacao_acesso'?<textarea {...props} rows={name==='descricao'?6:3}/>:<input {...props} type={type}/>}{feedback?.fields?.[name]&&<p className="error" id={name+'-error'}>{feedback.fields[name]}</p>}</div>;
 };
 return <form onSubmit={save} onChange={()=>setDirty(true)} noValidate aria-label={activity?'Editar rascunho':'Nova atividade'} aria-busy={pending}>
  {feedback&&<div className="feedback error" role="alert" ref={summary} tabIndex={-1}>{feedback.message}</div>}
  {field('titulo','Título',180)}{field('descricao','Descrição',5000)}{field('inicio_previsto','Data e horário (America/Sao_Paulo)',32,'datetime-local')}{field('orientacao_acesso','Orientação de acesso',600)}{field('referencia_oficial','Link oficial (opcional)',2048,'url')}
  <p>O rascunho e o envio permanecem privados. Enviar não significa publicar.</p>
  <button type="submit" disabled={!ready||pending}>{pending?'Aguarde…':activity?'Salvar alterações':'Salvar rascunho'}</button>
  {activity&&<><p>Salve as alterações antes de enviar a versão {activity.versao_submetida}.</p><button type="button" disabled={!ready||pending||dirty} onClick={()=>request({versao_esperada:activity.versao_submetida},true)}>Enviar atividade</button></>}
 </form>;
}
