'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
const subscribe=()=>()=>{};
export function RealizationForm({id,version}:{id:string;version:number}){
 const router=useRouter(),ready=useSyncExternalStore(subscribe,()=>true,()=>false);
 const [pending,setPending]=useState(false),[message,setMessage]=useState<string|null>(null);
 const inFlight=useRef(false),retry=useRef<{signature:string;key:string}|null>(null),alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)alert.current?.focus();},[message]);
 async function submit(form:HTMLFormElement){
  if(inFlight.current)return;inFlight.current=true;setPending(true);setMessage(null);
  const data=new FormData(form),body={versao_esperada:version,relato:String(data.get('relato')??''),participantes:Number(data.get('participantes')),url:String(data.get('url')??''),autoriza_publicacao:data.get('consentimento')==='on'};
  const signature=JSON.stringify(body);if(retry.current?.signature!==signature)retry.current={signature,key:crypto.randomUUID()};
  try{
   const response=await fetch('/api/atividades/'+id+'/realizacao',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,pedido_id:retry.current.key})});
   const result=await response.json();if(response.ok){router.push('/dashboard/pessoa-fisica?registro=enviado');router.refresh();}else setMessage(result.message??'Não foi possível registrar.');
  }catch{setMessage('Não foi possível conectar. Você pode tentar novamente.');}
  finally{inFlight.current=false;setPending(false);}
 }
 return <form className="realization-form" aria-label="Registrar que aconteceu" aria-busy={pending} onSubmit={event=>{event.preventDefault();void submit(event.currentTarget);}}>
  {message&&<div role="alert" className="feedback error" ref={alert} tabIndex={-1}>{message}</div>}
  <fieldset disabled={!ready||pending}>
   <div className="field"><label htmlFor="relato">O que aconteceu?</label><textarea id="relato" name="relato" required minLength={50} maxLength={5000} rows={6} placeholder="Conte como foi o encontro, o que vocês fizeram e o que ficou dessa experiência." aria-describedby="relato-ajuda"/><p className="hint" id="relato-ajuda">De 50 a 5000 caracteres. Conte a experiência sem expor dados pessoais de outras pessoas.</p></div>
   <div className="field"><label htmlFor="participantes">Quantas pessoas participaram?</label><input id="participantes" name="participantes" type="number" required min={0} max={1000000} step={1} inputMode="numeric" placeholder="Ex.: 12"/><p className="hint">Esse número será apresentado como informação declarada por você.</p></div>
   <div className="field"><label htmlFor="foto-video">Link da foto ou vídeo (opcional)</label><input id="foto-video" name="url" type="url" maxLength={2048} placeholder="https://…"/><p className="hint">Use um link público e só compartilhe imagens com autorização de quem aparece. A referência será examinada pelo editor.</p></div>
   <div className="field checkbox-field"><label htmlFor="consentimento-relato"><input id="consentimento-relato" name="consentimento" type="checkbox" required/> Autorizo divulgar este relato, o número de participantes e as referências selecionadas após revisão editorial.</label></div>
   <button className="button realization-submit" type="submit">{pending?'Enviando relato…':'Salvar e enviar para revisão'}</button>
  </fieldset>
 </form>;
}
