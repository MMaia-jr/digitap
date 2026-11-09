export function CommunityIcon({name,className=''}:{name:'calendar'|'arrow'|'leaf'|'pin'|'people'|'edit';className?:string}){
 return <svg className={'community-icon '+className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
  {name==='calendar'?<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2"/></>:name==='arrow'?<path d="M4 12h16m-6-6 6 6-6 6"/>:name==='leaf'?<><path d="M20 3C8 2 3 8 5 14c2 6 12 7 15-11Z"/><path d="M4 21 15 10"/></>:name==='pin'?<><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>:name==='edit'?<><path d="m15 5 4 4M4 20l5-1L21 7a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/></>:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></>}
 </svg>;
}
