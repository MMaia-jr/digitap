'use client';
import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent} from 'react';
const subscribe=()=>()=>{};
export function RecordForm({id,version}:{id:string;version:number}){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false),[pending,setPending]=useState(false),[feedback,setFeedback]=useState<{message:string;fields?:Record<string,string>}|null>(null);
 const lock=useRef(false),retry=useRef<{signature:string;key:string}|null>(null),alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(feedback)alert.current?.focus();},[feedback]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current)return;const data=new FormData(event.currentTarget),content={data_realizacao:String(data.get('data_realizacao')??''),descricao_factual:String(data.get('descricao_factual')??''),origem_informacao:String(data.get('origem_informacao')??''),versao_esperada:version},signature=JSON.stringify(content);
  if(retry.current?.signature!==signature)retry.current={signature,key:crypto.randomUUID()};lock.current=true;setPending(true);setFeedback(null);
  try{const r=await fetch('/api/atividades/'+id+'/registro',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...content,pedido_id:retry.current.key})}),result=await r.json();if(r.ok&&result.next==='/dashboard/atividade/'+id)window.location.assign(result.next);else setFeedback({message:result.message??'Não foi possível registrar.',fields:result.fields});}catch{setFeedback({message:'Não foi possível conectar. Você pode repetir o pedido.'});}finally{lock.current=false;setPending(false);}
 }
 const fields=[['data_realizacao','Data efetiva','date'],['descricao_factual','Descrição factual','textarea'],['origem_informacao','Origem da informação','textarea']];
 return <form onSubmit={submit} aria-label="Registro de realização" aria-busy={pending} noValidate><h2>Registrar realização</h2><p>Registre somente algo que já ocorreu. O relato é uma declaração privada, sem corroboração ou publicação automática.</p>{feedback&&<div ref={alert} role="alert" tabIndex={-1}>{feedback.message}</div>}{fields.map(([name,label,type])=><div className="field" key={name}><label htmlFor={'registro-'+name}>{label}</label>{type==='date'?<input id={'registro-'+name} name={name} type="date" required aria-invalid={!!feedback?.fields?.[name]} aria-describedby={feedback?.fields?.[name]?'erro-'+name:undefined}/>:<textarea id={'registro-'+name} name={name} required maxLength={name==='descricao_factual'?5000:600} aria-invalid={!!feedback?.fields?.[name]} aria-describedby={feedback?.fields?.[name]?'erro-'+name:undefined}/>} {feedback?.fields?.[name]&&<p className="error" id={'erro-'+name}>{feedback.fields[name]}</p>}</div>)}<button type="submit" disabled={!ready||pending}>{pending?'Aguarde…':'Salvar declaração privada'}</button></form>;
}
