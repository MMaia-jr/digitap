import {useId} from 'react';

/** SVG local: folha-circuito e toque, sem imagem ou fonte externa. */
export function DigItapLogo(){
 const gradient='digitap-neon-'+useId().replace(/[^a-zA-Z0-9_-]/g,'');
 return <span className="digitap-logo">
  <span className="digitap-symbol">
   <svg viewBox="0 0 96 96" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={gradient} x1="14" y1="18" x2="81" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#10B981"/><stop offset=".52" stopColor="#06B6D4"/><stop offset="1" stopColor="#FBBF24"/></linearGradient></defs>
    <path d="M28 8H68L88 28V68L68 88H28L8 68V28L28 8Z" fill="#081E20" fillOpacity=".76" stroke={'url(#'+gradient+')'} strokeOpacity=".32"/>
    <g stroke={'url(#'+gradient+')'} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
     <path d="M25 60V36L47 16H73V40L53 60H25Z" fill={'url(#'+gradient+')'} fillOpacity=".09"/>
     <path d="M25 60 61 28M39 47V33H49M48 38H62V29M34 52H48M27 40H18V29M54 18V9M65 49H79V39"/>
     <path d="m48 48 30 13-13 5-5 13-12-31Z" fill="#081E20"/>
     <path d="m65 66 11 11M76 25l5-5M82 31h6"/>
    </g>
    <g fill={'url(#'+gradient+')'}><circle cx="18" cy="27" r="3"/><circle cx="54" cy="9" r="2.5"/><circle cx="80" cy="37" r="3"/><circle cx="61" cy="28" r="3.2"/></g>
    <path d="M12 73 23 84M72 12l12 12" stroke="#C7F9E9" strokeOpacity=".38" strokeWidth="1.2"/>
   </svg>
  </span>
  <span className="digitap-wordmark"><span className="digitap-name">DigItap</span><span className="digitap-tagline">Tecnologia que cria raízes</span></span>
 </span>;
}
