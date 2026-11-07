'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
const subscribe=()=>()=>{};
export function SubmitActivityForm({id,version,title}:{id:string;version:number;title:string}){
 const router=useRouter(),ready=useSyncExternalStore(subscribe,()=>true,()=>false);
 const [consent,setConsent]=useState(false),[pending,setPending]=useState(false),[message,setMessage]=useState<string|null>(null);
 const inFlight=useRef(false),alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)alert.current?.focus();},[message]);
 async function submit(){
  if(inFlight.current||!consent)return;inFlight.current=true;setPending(true);setMessage(null);
  try{
   const response=await fetch('/api/atividades/'+id+'/enviar',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({versao_esperada:version,autoriza_publicacao:true})});
   const result=await response.json();if(response.ok)router.refresh();else setMessage(result.message??'Não foi possível enviar a atividade.');
  }catch{setMessage('Não foi possível conectar. Tente novamente.');}
  finally{inFlight.current=false;setPending(false);}
 }
 return <form onSubmit={event=>{event.preventDefault();void submit();}} aria-label={'Enviar '+title+' para revisão'} aria-busy={pending}>
  {message&&<div role="alert" className="feedback error" ref={alert} tabIndex={-1}>{message}</div>}
  <div className="field checkbox-field"><label htmlFor={'consentimento-'+id}><input id={'consentimento-'+id} type="checkbox" disabled={!ready||pending} checked={consent} onChange={event=>setConsent(event.target.checked)}/> Autorizo divulgar meu nome público e esta versão da atividade após revisão editorial.</label></div>
  <button type="submit" disabled={!ready||pending||!consent}>{pending?'Enviando…':'Enviar atividade para revisão'}</button>
 </form>;
}
