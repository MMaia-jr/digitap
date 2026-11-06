import Link from 'next/link';
import {AuthForm} from '../../../components/AuthForm';
export default function PersonSignup(){
 return <section className="card"><p className="eyebrow">Pessoa física</p><h1>Crie seu acesso como pessoa física</h1><p>Confirme seu e-mail para concluir seu cadastro. Você não precisa cadastrar uma organização.</p><p>A publicação depende de curadoria inicial. Seu e-mail e sua senha não serão públicos.</p><AuthForm mode="signup_pf"/><p>Leia <Link href="/privacidade">como os dados são usados</Link>.</p><Link href="/login">Já tenho conta</Link><p><Link href="/cadastro">Cadastro de organização</Link></p></section>;
}
