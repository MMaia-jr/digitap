import { redirect } from 'next/navigation';
import { AuthForm } from '../../../../components/AuthForm';
import { userClient } from '../../../../lib/supabase/server';
import { adminClient } from '../../../../lib/supabase/admin.server';
import { createGateway } from '../../../../lib/auth/gateway.server';
import { personState } from '../../../../lib/auth/person-access.server';

export const dynamic = 'force-dynamic';
type State = 'login'|'onboarding'|'ready'|'other'|'forbidden'|'unavailable';
export default async function CompletePersonProfile() {
  let state:State='unavailable';
  try {
    const gateway=createGateway(await userClient(),adminClient,()=>{});
    const user=await gateway.currentUser();
    if(!user?.id)state='login';
    else if(!user.email_confirmed_at)state='forbidden';
    else {
      const account=await gateway.account(user.id);
      if(!account)state='onboarding';
      else if(account.auth_user_id!==user.id||account.situacao!=='ativa')state='forbidden';
      else if(account.papel==='publicador'&&account.organizacao_id===null){
        const person=await personState();
        state=person.kind==='ready'?'ready':person.kind==='forbidden'?'onboarding':person.kind==='login'?'login':'unavailable';
      }else if(['organizacao','editor','administrador'].includes(account.papel))state='other';
      else state='forbidden';
    }
  }catch{state='unavailable';}
  if(state==='login')redirect('/login');
  if(state==='ready')redirect('/dashboard/pessoa-fisica');
  if(state==='other')redirect('/meu-espaco');
  if(state!=='onboarding')return <section className="card"><h1>{state==='unavailable'?'Serviço indisponível':'Acesso indisponível'}</h1><p>Não foi possível habilitar a conclusão de pessoa física nesta conta.</p><AuthForm mode="signout"/></section>;
  return <section className="card"><h1>Complete seu perfil de pessoa física</h1><p>Escolha como quer ser identificado publicamente. Não informe CPF ou documentos.</p><p>Seu cadastro ficará pendente de curadoria. Concluir seu perfil não libera publicação automática.</p><AuthForm mode="complete_pf"/><AuthForm mode="signout"/></section>;
}
