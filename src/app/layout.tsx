import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { AppHeader } from '../components/AppHeader';
export const metadata:Metadata={title:{default:'A Praça',template:'%s — A Praça'},description:'Atividades e encontros de Itaperuna e região.',icons:{icon:{url:'/favicon.svg',type:'image/svg+xml'}},robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><a className="skip" href="#conteudo">Pular para o conteúdo</a><AppHeader/><main id="conteudo">{children}</main><footer><p>A Praça é operada provisoriamente por Marcos Antonio Maia Júnior</p><nav aria-label="Governança e contato"><Link href="/governanca">Governança</Link><Link href="/privacidade">Política de privacidade</Link><Link href="/termos">Termos de uso</Link><Link href="/contestacao">Como contestar</Link></nav><p>Contestar publicação ou solicitar correção: <a href="mailto:muralitaperuna@gmail.com">muralitaperuna@gmail.com</a></p><p>Plataforma em beta. Nenhuma parceria confirmada.</p></footer></body></html>;}
