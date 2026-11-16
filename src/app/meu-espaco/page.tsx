import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '../../components/Viewer.server';
export const dynamic = 'force-dynamic';
export default async function WorkspaceEntry(){
  const viewer=await getViewer();
  if(viewer.kind==='visitor')redirect('/login');
  if(viewer.kind==='unavailable')return <section className="card"><h1>Serviço indisponível</h1><p>Não foi possível verificar seu acesso. Tente novamente mais tarde.</p></section>;
  if(viewer.dashboard!=='/meu-espaco')redirect(viewer.dashboard);
  return <section className="card"><p className="eyebrow">Meu espaço</p><h1>Como você quer participar?</h1><p>Escolha como deseja construir sua trajetória na Praça. Esta escolha não concede permissões institucionais automaticamente.</p><div className="actions"><Link className="button-outline" href="/meu-espaco/ideia">Descreva sua ideia</Link><Link className="button" href="/meu-espaco/capacidades">Minhas capacidades</Link><Link className="button-outline" href="/encontros">Descobrir encontros</Link><Link className="button-outline" href="/biblioteca-acoes">Biblioteca de Ações</Link><Link className="button" href="/cadastro/pessoa-fisica/completar">Continuar como pessoa física</Link><Link className="button-outline" href="/dashboard/organizacao">Cadastrar organização</Link></div><p>Coletivos informais também fazem parte do DigItap. O cadastro autônomo de coletivos ainda não está disponível neste percurso.</p></section>;
}
