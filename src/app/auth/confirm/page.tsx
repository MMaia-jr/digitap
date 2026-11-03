import Link from 'next/link';
import { AuthForm } from '../../../components/AuthForm';
export const dynamic='force-dynamic';
export default async function Confirm({searchParams}:{searchParams:Promise<{token_hash?:string;type?:string}>}){
 const {token_hash,type}=await searchParams;
 if(!token_hash||!/^[a-zA-Z0-9_-]{20,512}$/.test(token_hash)||!['signup','recovery'].includes(type??''))return <section className="card"><h1>Link inválido</h1><p>O link está incompleto ou não é reconhecido. Solicite outro link.</p><Link href="/recuperar-acesso">Recuperar acesso</Link></section>;
 return <section className="card"><h1>{type==='recovery'?'Escolha uma nova senha':'Confirme seu e-mail'}</h1><p>{type==='recovery'?'Use uma senha que você ainda não tenha usado nesta conta.':'Continue para confirmar que este e-mail é seu. A organização será cadastrada no próximo passo.'}</p><AuthForm mode={type==='recovery'?'reset':'confirm'} tokenHash={token_hash}/></section>;
}
