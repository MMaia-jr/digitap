'use client';
import {useState} from 'react';
export function RealizationPhoto({url}:{url:string}){
 const [failed,setFailed]=useState(false);
 const image=/\.(?:avif|webp|png|jpe?g|gif)(?:\?|$)/i.test(url);
 return <figure className="realization-photo">{image&&!failed&&
 // External, editor-approved references are loaded by the browser, never fetched by our server.
 // eslint-disable-next-line @next/next/no-img-element
 <img src={url} alt="Foto da atividade compartilhada pelo responsável" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}
 <figcaption><a href={url} target="_blank" rel="noreferrer noopener">{image?'Abrir foto original':'Ver foto ou vídeo da atividade'} ↗</a></figcaption></figure>;
}
