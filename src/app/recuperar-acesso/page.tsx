import Link from 'next/link';
import { AuthForm } from '../../components/AuthForm';
export default function Recover(){return <section className="card"><h1>Recupere seu acesso</h1><p>Informe seu e-mail. Se houver uma conta elegível, enviaremos um link de recuperação.</p><AuthForm mode="recover"/><p><Link href="/login">Voltar para entrar</Link></p></section>;}
