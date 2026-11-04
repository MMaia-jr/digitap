'use client';
import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent} from 'react';
const subscribeHydration=()=>()=>{};
export function WithdrawForm({id,version}:{id:string;version:number}){
 const ready=useSyncExternalStore(subscribeHydration,()=>true,()=>false),[pending,setPending]=useState(false),[feedback,setFeedback]=useState<{message:string;fields?:Record<string,string>}|null>(null);
 const inFlight=useRef(false),retry=useRef<{signature:string;key:string}|null>(null),alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(feedback)alert.current?.focus();},[feedback]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(inFlight.current)return;const motivo=String(new FormData(event.currentTarget).get('motivo')??''),signature=JSON.stringify({version,motivo});
  if(retry.current?.signature!==signature)retry.current={signature,key:crypto.randomUUID()};inFlight.current=true;setPending(true);setFeedback(null);
  try{const r=await fetch('/api/admin/atividades/'+id+'/retirar',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({versao_esperada:version,pedido_id:retry.current.key,motivo})}),result=await r.json();if(r.ok&&result.next==='/dashboard/atividade/'+id)window.location.assign(result.next);else setFeedback({message:result.message??'Não foi possível retirar.',fields:result.fields});}catch{setFeedback({message:'Não foi possível conectar. Você pode repetir o pedido.'});}finally{inFlight.current=false;setPending(false);}
 }
 return <form onSubmit={submit} aria-label="Retirada de publicação" aria-busy={pending} noValidate><h2>Retirar publicação</h2><p>A atividade ficará fora da consulta pública. O motivo será restrito à organização proprietária e à equipe editorial.</p>{feedback&&<div ref={alert} role="alert" tabIndex={-1}>{feedback.message}</div>}<div className="field"><label htmlFor="motivo_retirada">Motivo da retirada</label><textarea id="motivo_retirada" name="motivo" minLength={10} maxLength={1500} required aria-invalid={feedback?.fields?.motivo?true:undefined} aria-describedby={feedback?.fields?.motivo?'motivo-retirada-error':undefined}/>{feedback?.fields?.motivo&&<p id="motivo-retirada-error" className="error">{feedback.fields.motivo}</p>}</div><button disabled={!ready||pending} type="submit">{pending?'Aguarde…':'Retirar publicação'}</button></form>;
}
