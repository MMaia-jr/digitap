'use client';
import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent} from 'react';
const subscribeHydration=()=>()=>{};
export function RevokeAuthorizationForm({id}:{id:string}){
 const ready=useSyncExternalStore(subscribeHydration,()=>true,()=>false),[pending,setPending]=useState(false),[feedback,setFeedback]=useState<{message:string;fields?:Record<string,string>}|null>(null);
 const inFlight=useRef(false),retry=useRef<{signature:string;key:string}|null>(null),alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(feedback)alert.current?.focus();},[feedback]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(inFlight.current)return;const data=new FormData(event.currentTarget),motivo=String(data.get('motivo')??''),autorizacao_id=String(data.get('autorizacao_id')??''),signature=JSON.stringify({autorizacao_id,motivo});
  if(retry.current?.signature!==signature)retry.current={signature,key:crypto.randomUUID()};inFlight.current=true;setPending(true);setFeedback(null);
  try{const r=await fetch('/api/admin/atividades/'+id+'/autorizacoes/revogar',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({autorizacao_id,pedido_id:retry.current.key,motivo})}),result=await r.json();if(r.ok&&result.next==='/dashboard/atividade/'+id)window.location.assign(result.next);else setFeedback({message:result.message??'Não foi possível revogar.',fields:result.fields});}catch{setFeedback({message:'Não foi possível conectar. Você pode repetir o pedido.'});}finally{inFlight.current=false;setPending(false);}
 }
 return <form onSubmit={submit} aria-label="Revogação de autorização" aria-busy={pending} noValidate><h2>Revogar autorização</h2><p>A publicação abrangida pela autorização será suspensa. O motivo ficará restrito.</p>{feedback&&<div ref={alert} role="alert" tabIndex={-1}>{feedback.message}</div>}<div className="field"><label htmlFor="revogacao-id">ID da autorização a revogar</label><input id="revogacao-id" name="autorizacao_id" required/></div><div className="field"><label htmlFor="motivo_revogacao">Motivo da revogação</label><textarea id="motivo_revogacao" name="motivo" minLength={10} maxLength={1500} required aria-invalid={feedback?.fields?.motivo?true:undefined} aria-describedby={feedback?.fields?.motivo?'motivo-revogacao-error':undefined}/>{feedback?.fields?.motivo&&<p id="motivo-revogacao-error" className="error">{feedback.fields.motivo}</p>}</div><button disabled={!ready||pending} type="submit">{pending?'Aguarde…':'Revogar autorização'}</button></form>;
}
