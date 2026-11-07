import { redirect } from 'next/navigation';
import { AuthForm } from '../../../../components/AuthForm';
import { userClient } from '../../../../lib/supabase/server';
import { adminClient } from '../../../../lib/supabase/admin.server';
import { createGateway } from '../../../../lib/auth/gateway.server';
import { oauthDestination } from '../../../../lib/auth/oauth.server';

export const dynamic = 'force-dynamic';

export default async function CompletePersonProfile() {
  let destination: string;
  try {
    destination = await oauthDestination(createGateway(await userClient(), adminClient, () => {}));
  } catch {
    redirect('/login');
  }
  if (destination !== '/cadastro/pessoa-fisica/completar') redirect(destination);
  return (
    <section className="card">
      <h1>Complete seu perfil de pessoa física</h1>
      <p>Escolha como quer ser identificado publicamente. Não informe CPF ou documentos.</p>
      <p>Seu cadastro ficará pendente de curadoria. A entrada com Google não libera publicação automática.</p>
      <AuthForm mode="complete_pf" />
      <AuthForm mode="signout" />
    </section>
  );
}
