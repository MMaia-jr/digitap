'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
const subscribe=()=>()=>{};
export function RealizationReviewForm({activityId,hash,evidence}:{activityId:string;hash:string;evidence:{id:string;tipo_fonte:string;url_publica:string}[]}){
 const router=useRouter(),ready=useSyncExternalStore(subscribe,()=>true,()=>false);
 const [pending,setPending]=useState(false),[message,setMessage]=useState<string|null>(null),[reason,setReason]=useState('');
 const inFlight=useRef(false),form=useRef<HTMLFormElement>(null),alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)alert.current?.focus();},[message]);
 async function decide(acao:'aprovar'|'rejeitar'){
  if(inFlight.current)return;
  if(acao==='rejeitar'&&reason.trim().length<10){setMessage('Descreva o motivo em pelo menos 10 caracteres.');return;}
  inFlight.current=true;setPending(true);setMessage(null);
  try{
   const selected=new FormData(form.current!).getAll('evidencias');
   const response=await fetch('/api/admin/atividades/'+activityId+'/relato',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({acao,conteudo_esperado:hash,...(acao==='aprovar'?{evidencias_aprovadas:selected}:{motivo:reason})})});
   const result=await response.json();if(response.ok)router.refresh();else setMessage(result.message??'Não foi possível registrar a decisão.');
  }catch{setMessage('Não foi possível conectar. Recarregue para conferir a decisão antes de tentar novamente.');}
  finally{inFlight.current=false;setPending(false);}
 }
 return <form ref={form} aria-label="Revisar relato de realização" onSubmit={event=>event.preventDefault()} aria-busy={pending}>
  {message&&<div role="alert" className="feedback error" ref={alert} tabIndex={-1}>{message}</div>}
  <fieldset disabled={!ready||pending}><legend>Referências examinadas</legend><p>Marque apenas as referências examinadas e adequadas para divulgação. Aprovar o relato não altera seu estado de apuração para corroborado.</p>{evidence.length?evidence.map(e=><div key={e.id} className="field checkbox-field"><a href={e.url_publica} target="_blank" rel="noreferrer noopener">Examinar: {e.tipo_fonte}</a><label><input type="checkbox" name="evidencias" value={e.id}/> Autorizar esta referência na página pública</label></div>):<p>Este relato não tem foto ou vídeo anexado.</p>}<div className="field"><label htmlFor={'motivo-relato-'+activityId}>Motivo para rejeitar o relato</label><textarea id={'motivo-relato-'+activityId} value={reason} onChange={event=>setReason(event.target.value)} maxLength={1500} rows={3}/></div><div className="actions"><button type="button" onClick={()=>decide('aprovar')}>Aprovar e publicar relato</button><button type="button" onClick={()=>decide('rejeitar')}>Rejeitar relato</button></div></fieldset>
 </form>;
}
