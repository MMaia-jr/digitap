import Link from 'next/link';
import { AuthForm } from './AuthForm';
import { getViewer } from './Viewer.server';
export async function AppHeader() {
  const viewer = await getViewer();
  return <header>
    <Link href="/" className="brand">A Praça<span>Itaperuna e Região</span></Link>
    <nav aria-label="Navegação principal">
      {viewer.kind === 'ready' ? <><Link href={viewer.dashboard}>Olá, {viewer.name}</Link>{viewer.editorial&&<Link href="/admin/atividades">Admin</Link>}<AuthForm mode="signout" /></> : <>
        <Link href="/login">Entrar</Link><Link href="/cadastro">Criar acesso</Link>
        {viewer.kind === 'unavailable' && <span>Não foi possível verificar seu acesso.</span>}
      </>}
    </nav>
  </header>;
}
