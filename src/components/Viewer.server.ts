import 'server-only';
import { cache } from 'react';
import { userClient } from '../lib/supabase/server';
import { adminClient } from '../lib/supabase/admin.server';
import { createGateway } from '../lib/auth/gateway.server';
import { personState } from '../lib/auth/person-access.server';
import { organizationState,institutionalState } from '../lib/auth/dashboard.server';

type Viewer = { kind: 'visitor' } | { kind: 'unavailable' } | { kind: 'ready'; name: string; dashboard: string; editorial?: boolean };
export const getViewer = cache(async (): Promise<Viewer> => {
  try {
    const gateway = createGateway(await userClient(), adminClient, () => {});
    const user = await gateway.currentUser();
    if (!user) return { kind: 'visitor' };
    const account = await gateway.account(user.id);
    if (account && (account.auth_user_id !== user.id || account.situacao !== 'ativa')) return { kind: 'unavailable' };
    const editorial=Boolean(account&&['editor','administrador'].includes(account.papel));
    if (account?.papel === 'publicador'||(editorial&&account?.organizacao_id===null)) {
      const state = await personState();
      if(state.kind==='ready')return {kind:'ready',name:state.person.nome_publico,dashboard:'/dashboard/pessoa-fisica',editorial};
      if(!editorial){const institution=await institutionalState();if(institution.kind==='ready')return {kind:'ready',name:institution.organization.nome_publico,dashboard:'/dashboard'};return {kind:'unavailable'};}
    }
    if (account?.papel === 'organizacao') {
      const state = await organizationState();
      return state.kind === 'ready' ? { kind: 'ready', name: state.organization.nome_publico, dashboard: '/dashboard' } : { kind: 'unavailable' };
    }
    const name = typeof user.user_metadata?.nome_publico === 'string' ? user.user_metadata.nome_publico : 'Minha conta';
    return { kind: 'ready', name, editorial, dashboard: account ? '/admin/atividades' : '/dashboard/organizacao' };
  } catch { return { kind: 'unavailable' }; }
});
