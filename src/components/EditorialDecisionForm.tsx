'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import type {PrivateActivity} from '../lib/activities/domain';
const subscribe=()=>()=>{};
export function EditorialDecisionForm({activity}:{activity:PrivateActivity}){
 const router=useRouter(),ready=useSyncExternalStore(subscribe,()=>true,()=>false);
 const [pending,setPending]=useState(false),[message,setMessage]=useState<string|null>(null);
 const [reason,setReason]=useState('');const inFlight=useRef(false),retry=useRef<{signature:string;key:string}|null>(null),alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)alert.current?.focus();},[message]);
 async function decide(acao:'aprovar_publicacao'|'rejeitar'){
  if(inFlight.current)return;
  if(acao==='rejeitar'&&reason.trim().length<10){setMessage('Descreva o motivo da rejeição em pelo menos 10 caracteres.');return;}
  inFlight.current=true;setPending(true);setMessage(null);
  const body={acao,versao_esperada:activity.versao_submetida,...(acao==='rejeitar'?{motivo:reason}:{})};
  const signature=JSON.stringify(body);if(retry.current?.signature!==signature)retry.current={signature,key:crypto.randomUUID()};
  try{
   const response=await fetch('/api/admin/atividades/'+activity.id+'/decidir',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,pedido_id:retry.current.key})});
   const result=await response.json();
   if(response.ok)router.refresh();else setMessage(result.message??'Não foi possível registrar a decisão.');
  }catch{setMessage('Não foi possível conectar. Você pode repetir a mesma decisão.');}
  finally{inFlight.current=false;setPending(false);}
 }
 return <form onSubmit={event=>event.preventDefault()} aria-label={'Decidir publicação de '+activity.titulo} aria-busy={pending}>
  {message&&<div className="feedback error" role="alert" ref={alert} tabIndex={-1}>{message}</div>}
  <p>Aprovar Publicação confirma a revisão e torna pública a versão autorizada. Apoios e autopublicação continuam desabilitados.</p>
  <div className="field"><label htmlFor={'rejeicao-'+activity.id}>Motivo da rejeição</label><textarea disabled={!ready||pending} id={'rejeicao-'+activity.id} value={reason} onChange={event=>setReason(event.target.value)} rows={3} maxLength={1500}/><p className="hint">Preencha somente para rejeitar. O motivo fica visível ao titular e à equipe editorial.</p></div>
  <div className="actions"><button type="button" disabled={!ready||pending} onClick={()=>decide('aprovar_publicacao')}>Aprovar Publicação</button><button type="button" disabled={!ready||pending} onClick={()=>decide('rejeitar')}>Rejeitar</button></div>
 </form>;
}
