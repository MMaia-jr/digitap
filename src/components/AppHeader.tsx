import Link from 'next/link';
import {DigItapLogo} from './DigItapLogo';
import { AuthForm } from './AuthForm';
import {CommunityIcon} from './CommunityIcons';
import { getViewer } from './Viewer.server';
export async function AppHeader() {
  const viewer = await getViewer();
  return <header className="app-header"><div className="app-header-inner">
    <Link href="/" className="brand" aria-label="DigItap — início"><DigItapLogo/></Link>
    <nav aria-label="Navegação principal"><Link className="nav-explore" href="/#atividades-publicas">Explorar</Link>
      {viewer.kind === 'ready' ? <><Link href={viewer.dashboard}>Olá, {viewer.name}</Link>{viewer.editorial&&<Link href="/admin/atividades">Admin</Link>}<AuthForm mode="signout" /></> : <>
        <Link href="/login">Entrar</Link><Link className="nav-signup" href="/cadastro">Criar acesso<CommunityIcon name="arrow"/></Link>
        {viewer.kind === 'unavailable' && <span>Não foi possível verificar seu acesso.</span>}
      </>}
    </nav>
  </div></header>;
}
