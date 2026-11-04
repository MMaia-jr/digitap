'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
const subscribeHydration=()=>()=>{};
export function PublishForm({id,version}:{id:string;version:number}){
 const ready=useSyncExternalStore(subscribeHydration,()=>true,()=>false),[pending,setPending]=useState(false),[message,setMessage]=useState<string|null>(null);
 const inFlight=useRef(false),key=useRef<string|null>(null),alert=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)alert.current?.focus();},[message]);
 async function publish(){
  if(inFlight.current)return;inFlight.current=true;setPending(true);setMessage(null);key.current??=crypto.randomUUID();
  try{const r=await fetch('/api/admin/atividades/'+id+'/publicar',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({versao_esperada:version,pedido_id:key.current})});const result=await r.json();if(r.ok&&result.next==='/dashboard/atividade/'+id)window.location.assign(result.next);else setMessage(result.message??'Não foi possível publicar.');}
  catch{setMessage('Não foi possível conectar. Você pode repetir o mesmo pedido.');}finally{inFlight.current=false;setPending(false);}
 }
 return <section aria-label="Publicação"><h2>Publicar versão aprovada</h2><p>Esta ação torna visível o snapshot autorizado da versão {version}. Não habilita apoios.</p>{message&&<div role="alert" ref={alert} tabIndex={-1} className="feedback error">{message}</div>}<button type="button" disabled={!ready||pending} onClick={publish}>{pending?'Aguarde…':'Publicar versão aprovada'}</button></section>;
}
