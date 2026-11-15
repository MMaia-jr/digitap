import { FlowError } from '../../../../lib/auth/flow.server';
import { handleMutation, privateHeaders } from '../../../../lib/auth/http.server';
import { createGateway } from '../../../../lib/auth/gateway.server';
import { userClient } from '../../../../lib/supabase/server';
import { adminClient } from '../../../../lib/supabase/admin.server';
import { appOrigin } from '../../../../lib/supabase/config.server';
import { interpretProposal } from '../../../../lib/proposals/interpret.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const windowMs = 600000;
// Process-local cost guard, not a distributed quota. Only verified Auth IDs are
// keys. No proposal text or user data is retained here; failures consume attempts.
const attempts = new Map<string, { until: number; count: number }>();
const running = new Set<string>();
let total = { until: 0, count: 0 };
function reserve(id: string): () => void {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  if (total.until <= now) total = { until: now + windowMs, count: 0 };
  const entry = attempts.get(id) ?? { until: now + windowMs, count: 0 };
  if (running.has(id) || running.size >= 2 || entry.count >= 3 || total.count >= 20 || (!attempts.has(id) && attempts.size >= 1000)) {
    throw new FlowError(429, 'Limite temporário de interpretação atingido. Tente novamente mais tarde.');
  }
  entry.count++; total.count++; attempts.set(id, entry); running.add(id);
  return () => { running.delete(id); };
}
export async function POST(request: Request): Promise<Response> {
  try {
    return await handleMutation(request, appOrigin(), async input => {
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'texto')) throw new FlowError(422, 'Escreva uma proposta de até 2.000 caracteres.');
      const texto = (input as { texto: unknown }).texto;
      if (typeof texto !== 'string' || !texto.trim() || texto.length > 2000) throw new FlowError(422, 'Escreva uma proposta de até 2.000 caracteres.');
      const gateway = createGateway(await userClient(), adminClient, () => {});
      const user = await gateway.currentUser();
      if (!user?.id || !user.email_confirmed_at) throw new FlowError(401, 'Entre com uma conta confirmada para interpretar sua proposta.');
      const account = await gateway.account(user.id);
      if (account && (account.auth_user_id !== user.id || account.situacao !== 'ativa')) throw new FlowError(403, 'Acesso indisponível para esta conta.');
      const release = reserve(user.id);
      try {
        const interpretacao = await interpretProposal(texto);
        return { message: 'Prévia para revisão humana.', interpretacao };
      } catch {
        throw new FlowError(503, 'Interpretação indisponível. Tente novamente mais tarde.');
      } finally { release(); }
    });
  } catch {
    return Response.json({ message: 'Interpretação indisponível. Tente novamente mais tarde.' }, { status: 503, headers: privateHeaders });
  }
}
