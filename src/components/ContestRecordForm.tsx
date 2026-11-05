'use client';
import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent} from 'react';
const subscribe=()=>()=>{};
export function ContestRecordForm({id,digest}:{id:string;digest:string}){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false),[pending,setPending]=useState(false),[feedback,setFeedback]=useState<{message:string;fields?:Record<string,string>}|null>(null);
 const lock=useRef(false),retry=useRef<{signature:string;key:string}|null>(null),alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(feedback)alert.current?.focus();},[feedback]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current)return;const data=new FormData(event.currentTarget),content={divergencia:String(data.get('divergencia')??''),referencia_publica:String(data.get('referencia_publica')??''),conteudo_esperado:digest},signature=JSON.stringify(content);
  if(retry.current?.signature!==signature)retry.current={signature,key:crypto.randomUUID()};lock.current=true;setPending(true);setFeedback(null);
  try{const r=await fetch('/api/atividades/'+id+'/registro/contestar',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...content,pedido_id:retry.current.key})}),result=await r.json();if(r.ok&&result.next==='/dashboard/atividade/'+id)window.location.assign(result.next);else setFeedback({message:result.message??'Não foi possível registrar.',fields:result.fields});}catch{setFeedback({message:'Não foi possível conectar. Você pode repetir o pedido.'});}finally{lock.current=false;setPending(false);}
 }
 const fields=[['divergencia','Divergência registrada','textarea'],['referencia_publica','Referência da divergência (opcional)','textarea']];
 return <form onSubmit={submit} aria-label="Contestação do registro" aria-busy={pending} noValidate><h2>Registrar divergência</h2><p>A divergência será preservada na área restrita. O relato original permanece; a apuração ficará contestada, sem conclusão consensual.</p>{feedback&&<div ref={alert} role="alert" tabIndex={-1}>{feedback.message}</div>}{fields.map(([name,label,type])=><div className="field" key={name}><label htmlFor={'registro-'+name}>{label}</label>{type==='date'?<input id={'registro-'+name} name={name} type="date" required aria-invalid={!!feedback?.fields?.[name]} aria-describedby={feedback?.fields?.[name]?'erro-'+name:undefined}/>:<textarea id={'registro-'+name} name={name} required={name==='divergencia'} maxLength={name==='referencia_publica'?2048:1500} aria-invalid={!!feedback?.fields?.[name]} aria-describedby={feedback?.fields?.[name]?'erro-'+name:undefined}/>} {feedback?.fields?.[name]&&<p className="error" id={'erro-'+name}>{feedback.fields[name]}</p>}</div>)}<button type="submit" disabled={!ready||pending}>{pending?'Aguarde…':'Registrar contestação'}</button></form>;
}
