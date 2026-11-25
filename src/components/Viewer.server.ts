import 'server-only';
import { cache } from 'react';
import { userClient } from '../lib/supabase/server';
import { adminClient } from '../lib/supabase/admin.server';
import { createGateway } from '../lib/auth/gateway.server';
import { personState } from '../lib/auth/person-access.server';
import { organizationState,institutionalState } from '../lib/auth/dashboard.server';
import { canUseBetaInterpretation } from '../lib/proposals/beta-access.server';

type Viewer = { kind: 'visitor' } | { kind: 'unavailable' } | { kind: 'ready'; name: string; dashboard: string; canInterpret: boolean; editorial?: boolean };
export const getViewer = cache(async (): Promise<Viewer> => {
  try {
    const gateway = createGateway(await userClient(), adminClient, () => {});
    const user = await gateway.currentUser();
    if (!user) return { kind: 'visitor' };
    if (!user.email_confirmed_at) return { kind: 'unavailable' };
    const account = await gateway.account(user.id);
    if (account && (account.auth_user_id !== user.id || account.situacao !== 'ativa')) return { kind: 'unavailable' };
    const canInterpret = canUseBetaInterpretation(user.id);
    const editorial=Boolean(account&&['editor','administrador'].includes(account.papel));
    if (account?.papel === 'publicador'||(editorial&&account?.organizacao_id===null)) {
      const state = await personState();
      if(state.kind==='ready')return {kind:'ready',name:state.person.nome_publico,dashboard:'/dashboard/pessoa-fisica',canInterpret,editorial};
      if(!editorial){const institution=await institutionalState();if(institution.kind==='ready')return {kind:'ready',name:institution.organization.nome_publico,dashboard:'/dashboard',canInterpret};return {kind:'unavailable'};}
    }
    if (account?.papel === 'organizacao') {
      const state = await organizationState();
      return state.kind === 'ready' ? { kind: 'ready', name: state.organization.nome_publico, dashboard: '/dashboard', canInterpret } : { kind: 'unavailable' };
    }
    const name = typeof user.user_metadata?.nome_publico === 'string' ? user.user_metadata.nome_publico : 'Minha conta';
    return { kind: 'ready', name, canInterpret, editorial, dashboard: account ? '/admin/atividades' : '/meu-espaco' };
  } catch { return { kind: 'unavailable' }; }
});
