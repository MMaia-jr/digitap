'use client';
import { useEffect,useRef,useState,type FormEvent } from 'react';
type Mode='signup'|'signin'|'recover'|'confirm'|'reset'|'organization'|'signout';
const config={
 signup:{endpoint:'/api/auth/cadastro',label:'Criar acesso'},signin:{endpoint:'/api/auth/login',label:'Entrar'},recover:{endpoint:'/api/auth/recuperar',label:'Enviar link de recuperação'},confirm:{endpoint:'/api/auth/confirmar',label:'Confirmar meu e-mail'},reset:{endpoint:'/api/auth/redefinir',label:'Atualizar senha'},organization:{endpoint:'/api/organizacoes',label:'Vincular organização'},signout:{endpoint:'/api/auth/sair',label:'Sair'},
};
const destinations=new Set(['/dashboard','/dashboard/organizacao','/login','/login?status=senha-atualizada']);
export function AuthForm({mode,tokenHash,onNavigate}:{mode:Mode;tokenHash?:string;onNavigate?:(path:string)=>void}){
 const [pending,setPending]=useState(false);const [feedback,setFeedback]=useState<{message:string;error:boolean;fields?:Record<string,string>}|null>(null);const summary=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(feedback)summary.current?.focus();},[feedback]);
 useEffect(()=>{if(tokenHash)window.history.replaceState(null,'','/auth/confirm');},[tokenHash]);
 const email=['signup','signin','recover'].includes(mode);const password=['signup','signin','reset'].includes(mode);
 async function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault();if(pending)return;const form=event.currentTarget;const data=new FormData(form);const body:Record<string,unknown>={};
   if(email)body.email=data.get('email');if(password)body.password=data.get('password');if(mode==='organization'){body.nome_publico=data.get('nome_publico');const channel=data.get('canal_publico');if(typeof channel==='string'&&channel.trim())body.canal_publico=channel;}if(tokenHash)body.token_hash=tokenHash;
   setPending(true);setFeedback(null);
   try{
     const response=await fetch(config[mode].endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
     const result=await response.json();setFeedback({message:result.message??'Não foi possível concluir.',error:!response.ok,fields:result.fields});
     if(response.ok&&destinations.has(result.next)){if(onNavigate)onNavigate(result.next);else window.location.assign(result.next);}
   }catch{setFeedback({message:'Não foi possível conectar. Tente novamente.',error:true});}
   finally{const pass=form.querySelector<HTMLInputElement>('input[type=password]');if(pass)pass.value='';setPending(false);}
 }
 const field=(name:string,label:string,type='text',required=true)=><div className="field" key={name}>
   <label htmlFor={name}>{label}</label>
   <input id={name} name={name} type={type} required={required} autoComplete={name==='email'?'email':name==='password'?(mode==='signin'?'current-password':'new-password'):name==='canal_publico'?'url':'organization'} minLength={name==='password'?12:name==='nome_publico'?2:undefined} maxLength={name==='password'?128:name==='email'?254:name==='canal_publico'?2048:160} aria-invalid={feedback?.fields?.[name]?'true':undefined} aria-describedby={[name==='password'?'password-help':'',feedback?.fields?.[name]?`${name}-error`:''].filter(Boolean).join(' ')||undefined}/>
   {name==='password'&&<p id="password-help" className="hint">Use de 12 a 128 caracteres.</p>}
   {feedback?.fields?.[name]&&<p id={`${name}-error`} className="error">{feedback.fields[name]}</p>}
 </div>;
 return <form method="post" action={config[mode].endpoint} onSubmit={submit} aria-label={config[mode].label} aria-busy={pending}>
   {feedback&&<div ref={summary} tabIndex={-1} role={feedback.error?'alert':'status'} className={feedback.error?'feedback error':'feedback'}>{feedback.message}</div>}
   {email&&field('email','E-mail','email')}{password&&field('password',mode==='reset'?'Nova senha':'Senha','password')}{mode==='organization'&&<>{field('nome_publico','Nome público da organização')}{field('canal_publico','Canal público (opcional)','url',false)}</>}
   <button type="submit" disabled={pending}>{pending?'Aguarde…':config[mode].label}</button>
 </form>;
}
