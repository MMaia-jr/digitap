'use client';
import {useState,useSyncExternalStore} from 'react';
const subscribe=()=>()=>{};
export function PrintPortfolioButton(){
 const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
 const [preparing,setPreparing]=useState(false);
 async function print(){
  setPreparing(true);
  try{
   const images=Array.from(document.querySelectorAll<HTMLImageElement>('.portfolio-page img'));
   images.forEach(image=>{image.loading='eager';});
   // Give off-screen photos a chance to load before opening the print dialog.
   await Promise.race([Promise.allSettled(images.map(image=>image.decode())),new Promise(resolve=>setTimeout(resolve,2000))]);
   window.print();
  }finally{setPreparing(false);}
 }
 return <button type="button" className="button portfolio-print-button" disabled={!ready||preparing} onClick={()=>void print()} aria-describedby="portfolio-print-hint"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M7 8V3h10v5M7 16H4V9h16v7h-3M7 13h10v8H7z"/><path d="M17 10h1"/></svg>{preparing?'Preparando impressão…':'Baixar Portfólio em PDF'}</button>;
}
export function PortfolioSource(){
 const address=useSyncExternalStore(subscribe,()=>window.location.origin+window.location.pathname,()=>'');
 return address?<a className="portfolio-source-url" href={address}>{address}</a>:null;
}
