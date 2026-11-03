import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessDependencies } from './permissions.server';

/** Auth client carries the user's session. Admin client must never carry user cookies. */
export function createAccessDependencies(userClient: SupabaseClient, adminClient: SupabaseClient): AccessDependencies {
  return {
    async verifyUser() {
      const { data, error } = await userClient.auth.getUser();
      if (error) {
        if ([400, 401, 403].includes(error.status ?? 0)) return null;
        throw new Error('Autenticação indisponível.');
      }
      return data.user;
    },
    async findAccount(userId) {
      const { data, error } = await adminClient.from('contas_acesso')
        .select('auth_user_id,organizacao_id,papel,situacao')
        .eq('auth_user_id', userId).maybeSingle();
      if (error) throw new Error('Consulta indisponível.');
      return data;
    },
  };
}
