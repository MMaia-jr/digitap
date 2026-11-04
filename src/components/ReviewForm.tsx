'use client';
import type {PrivateActivity} from '../lib/activities/domain';
import type {ReviewAction} from '../lib/activities/domain';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
const subscribeHydration=()=>()=>{};
export function ReviewForm({activity}:{activity:PrivateActivity}){
 const ready=useSyncExternalStore(subscribeHydration,()=>true,()=>false),[pending,setPending]=useState(false);
 const [feedback,setFeedback]=useState<{message:string;fields?:Record<string,string>}|null>(null);
 const form=useRef<HTMLFormElement>(null),summary=useRef<HTMLDivElement>(null),inFlight=useRef(false);
 const retry=useRef<{signature:string;key:string}|null>(null);
 useEffect(()=>{if(feedback)summary.current?.focus();},[feedback]);
 async function decide(acao:ReviewAction){
  if(inFlight.current||!form.current)return;inFlight.current=true;setPending(true);setFeedback(null);
  try{
   const data=new FormData(form.current);
   const payload={acao,versao_esperada:activity.versao_submetida,estado_esperado:activity.estado_editorial,...(acao==='aprovar'?{autorizacao_id:data.get('autorizacao_id')}:acao==='devolver'||acao==='rejeitar'?{motivo:data.get('motivo')}:{})};
   const signature=JSON.stringify(payload);if(retry.current?.signature!==signature)retry.current={signature,key:crypto.randomUUID()};
   const response=await fetch('/api/admin/atividades/'+activity.id+'/revisar',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,pedido_id:retry.current.key})});
   const result=await response.json();
   if(response.ok&&result.next==='/dashboard/atividade/'+activity.id)window.location.assign(result.next);
   else setFeedback({message:result.message??'Não foi possível registrar a decisão.',fields:result.fields});
  }catch{setFeedback({message:'Não foi possível conectar. Você pode repetir o pedido.'});}
  finally{inFlight.current=false;setPending(false);}
 }
 return <form ref={form} onSubmit={event=>event.preventDefault()} aria-label="Revisão editorial" aria-busy={pending}>
  <h2>Revisão editorial</h2><p>Versão {activity.versao_submetida}. A decisão continua privada e não publica a atividade.</p>
  {feedback&&<div ref={summary} tabIndex={-1} role="alert" className="feedback error">{feedback.message}</div>}
  {activity.estado_editorial==='em_revisao'&&<div className="field"><label htmlFor="autorizacao_id">ID da autorização para esta versão</label><input id="autorizacao_id" name="autorizacao_id" maxLength={36} aria-invalid={feedback?.fields?.autorizacao_id?'true':undefined} aria-describedby={feedback?.fields?.autorizacao_id?'autorizacao_id-error':undefined}/>{feedback?.fields?.autorizacao_id&&<p id="autorizacao_id-error" className="error">{feedback.fields.autorizacao_id}</p>}<p>Use um registro restrito vigente, com escopo de divulgação e desta versão, após examinar sua comprovação. Aprovar não valida automaticamente representação institucional.</p></div>}
  <div className="field"><label htmlFor="motivo">Motivo (devolução ou rejeição)</label><textarea id="motivo" name="motivo" rows={4} maxLength={1500} aria-invalid={feedback?.fields?.motivo?'true':undefined} aria-describedby={feedback?.fields?.motivo?'motivo-error':undefined}/>{feedback?.fields?.motivo&&<p id="motivo-error" className="error">{feedback.fields.motivo}</p>}<p>Obrigatório para devolver ou rejeitar. Visível somente à organização proprietária e à equipe editorial autorizada.</p></div>
  <div className="actions">{activity.estado_editorial==='enviada'?<button type="button" disabled={!ready||pending} onClick={()=>decide('iniciar')}>Iniciar revisão</button>:<button type="button" disabled={!ready||pending} onClick={()=>decide('aprovar')}>Aprovar versão</button>}<button type="button" disabled={!ready||pending} onClick={()=>decide('devolver')}>Devolver atividade</button><button type="button" disabled={!ready||pending} onClick={()=>decide('rejeitar')}>Rejeitar atividade</button></div>
 </form>;
}
