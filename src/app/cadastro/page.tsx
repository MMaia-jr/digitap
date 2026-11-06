import Link from 'next/link';
import { AuthForm } from '../../components/AuthForm';
export default function Signup(){return <section className="card"><p className="eyebrow">Primeiro passo</p><h1>Crie seu acesso</h1><p>Confirme seu e-mail antes de cadastrar a organização. Seu e-mail e sua senha não serão públicos.</p><AuthForm mode="signup"/><p>Leia <Link href="/privacidade">como os dados são usados</Link>.</p><Link href="/login">Já tenho conta</Link><p><Link href="/cadastro/pessoa-fisica">Sou pessoa física</Link></p></section>;}
