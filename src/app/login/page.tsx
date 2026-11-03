import Link from 'next/link';
import { AuthForm } from '../../components/AuthForm';
export default async function Login({searchParams}:{searchParams:Promise<{status?:string}>}){const {status}=await searchParams;return <section className="card"><h1>Entre na sua conta</h1>{status==='senha-atualizada'&&<p role="status">Senha atualizada. Use a nova senha para entrar.</p>}<AuthForm mode="signin"/><p><Link href="/recuperar-acesso">Esqueci minha senha</Link></p><Link href="/cadastro">Criar acesso</Link></section>;}
