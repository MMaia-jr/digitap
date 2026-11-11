'use client';
import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import type {ParticipationState,OwnConfirmation} from '../lib/participation/types';
async function readParticipation(endpoint:string,signal?:AbortSignal){
 const response=await fetch(endpoint,{cache:'no-store',signal});
 if(!response.ok)throw new Error('Não foi possível consultar a participação. Tente novamente.');
 return await response.json() as ParticipationState;
}
export function ActivityParticipation({activityId}:{activityId:string}){
 const [state,setState]=useState<ParticipationState|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const inFlight=useRef(false),dialog=useRef<HTMLDialogElement>(null),form=useRef<HTMLFormElement>(null);
 const titleId=useId();
 const endpoint=`/api/atividades/${activityId}/confirmacoes`;
 async function load(){setState(await readParticipation(endpoint));}
 useEffect(()=>{
  const controller=new AbortController();
  void readParticipation(endpoint,controller.signal).then(data=>{if(!controller.signal.aborted)setState(data);}).catch(()=>{if(!controller.signal.aborted)setError('Não foi possível consultar a participação. Tente novamente.');});
  return ()=>controller.abort();
 },[endpoint]);
 async function send(input:Record<string,unknown>){
  if(inFlight.current)return;
  inFlight.current=true;setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
   const result=await response.json() as {message?:string;confirmacao?:OwnConfirmation};
   if(!response.ok){
    setError(result.message??'Não foi possível registrar. Tente novamente.');
    if(response.status===409){try{await load();}catch{/* Keep the conflict message if refresh is unavailable. */}}
    return;
   }
   setState(previous=>previous&&result.confirmacao?{...previous,minha_confirmacao:result.confirmacao}:previous);
   setNotice(result.message??'Registro concluído.');dialog.current?.close();
   try{await load();}catch{setError('Seu registro foi enviado, mas os contadores não puderam ser atualizados. Recarregue a página.');}
  }catch{setError('Não foi possível confirmar a resposta. Recarregue a página antes de tentar novamente.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 function intention(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget);
  void send({tipo:'intencao',whatsapp:String(data.get('whatsapp')??''),acompanhantes:Number(data.get('acompanhantes')),mostrar_nome:data.get('mostrar_nome')==='on'});
 }
 const disabled=busy||!state?.authenticated||!state.resumo.aberta||Boolean(state.minha_confirmacao);
 return <section className="participation-panel" aria-label="Apoio e intenção de presença" aria-busy={busy}>
  <p>Apoio é simbólico. &apos;Vou Participar&apos; é uma intenção, não confirmação de presença.</p>
  {state?<><p className="participation-counts"><strong>{state.resumo.apoios} apoios</strong><strong>{state.resumo.intencoes} intenções</strong></p>
   {!state.authenticated&&<p><Link href="/login">Entre para apoiar ou marcar intenção</Link></p>}
   {!state.resumo.aberta&&<p>Esta atividade não está aberta a novos apoios ou intenções.</p>}
   {state.minha_confirmacao&&<p role="status">Você já registrou {state.minha_confirmacao.tipo==='apoio'?'apoio simbólico':'intenção de presença'} nesta atividade.</p>}
  </>:!error&&<p role="status">Consultando participação…</p>}
  <div className="actions"><button type="button" className="button" disabled={disabled} onClick={()=>void send({tipo:'apoio'})}>Apoiar</button>
   <button type="button" className="button" disabled={disabled} onClick={()=>{form.current?.reset();dialog.current?.showModal();}}>Vou Participar</button></div>
  <p className="participation-hint">Cada perfil pode registrar uma única escolha por atividade: apoio ou intenção. Intenções contam registros, não pessoas presentes.</p>
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  {!state&&error&&<button type="button" onClick={()=>{setError('');void load().catch(()=>setError('Consulta indisponível. Tente novamente.'));}}>Tentar consultar novamente</button>}
  {state&&<div className="participation-names"><h3>Quem autorizou mostrar o nome</h3>{state.resumo.nomes_publicos.length?<ul>{state.resumo.nomes_publicos.map((name,index)=><li key={`${index}:${name}`}>{name}</li>)}</ul>:<p>Nenhum nome autorizado para divulgação até agora.</p>}<p>Somente intenções com autorização explícita. Até 100 nomes; não é lista de presença.</p></div>}
  <dialog ref={dialog} className="participation-dialog" aria-labelledby={titleId}>
   <h2 id={titleId}>Marcar intenção de presença</h2>
   <p>Isso não comprova comparecimento. O organizador recebe apenas contadores; seu WhatsApp não será divulgado nem entregue a ele neste módulo.</p>
   <form ref={form} onSubmit={intention}>
    <label>WhatsApp (opcional)<input name="whatsapp" type="tel" autoComplete="tel" maxLength={40} placeholder="+55 22 99999-9999"/></label>
    <label>Quantidade de pessoas, incluindo você<input name="acompanhantes" type="number" min={1} max={20} step={1} defaultValue={1} required/></label>
    <label className="participation-consent"><input name="mostrar_nome" type="checkbox"/><span>Autorizo mostrar meu nome público na lista de intenções desta atividade (opcional).</span></label>
    <p>Sem marcar a autorização, seu nome não aparece. Para retirar uma autorização ou pedir exclusão, escreva para <a href="mailto:muralitaperuna@gmail.com">muralitaperuna@gmail.com</a>. <Link href="/privacidade">Saiba como usamos os dados</Link>.</p>
    {error&&<p role="alert">{error}</p>}
    <div className="actions"><button className="button" type="submit" disabled={busy}>Registrar intenção</button><button type="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancelar</button></div>
   </form>
  </dialog>
 </section>;
}
