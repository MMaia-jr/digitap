'use client';
import {useEffect,useState} from 'react';
import type {ConfirmationCounts as Counts} from '../lib/participation/types';
export function ConfirmationCounts({activityId}:{activityId:string}){
 const [counts,setCounts]=useState<Counts|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch(`/api/atividades/${activityId}/confirmacoes/resumo`,{cache:'no-store',signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error('Consulta indisponível');setCounts(await response.json() as Counts);})
   .catch(()=>{if(!controller.signal.aborted)setFailed(true);});
  return ()=>controller.abort();
 },[activityId]);
 if(failed)return <p>Contadores de participação indisponíveis.</p>;
 if(!counts)return <p>Consultando apoios e intenções…</p>;
 return <p className="participation-counts"><span>{counts.apoios} apoios</span><span>{counts.intencoes} intenções</span></p>;
}
