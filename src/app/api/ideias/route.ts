import { FlowError } from '../../../lib/auth/flow.server';
import { createGateway } from '../../../lib/auth/gateway.server';
import { handleMutation, privateHeaders } from '../../../lib/auth/http.server';
import { adminClient } from '../../../lib/supabase/admin.server';
import { appOrigin, mutationOrigins } from '../../../lib/supabase/config.server';
import { userClient } from '../../../lib/supabase/server';
import { createIdeasService, ideaView, IdeasError, type CreateIdea, type UpdateIdea } from '../../../lib/ideas/service.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const service = createIdeasService();
function json(value: unknown, status = 200): Response { return Response.json(value, { status, headers: privateHeaders }); }
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
async function identity() {
  const gateway = createGateway(await userClient(), adminClient, () => {});
  const user = await gateway.currentUser();
  if (!user?.id) throw new FlowError(401, 'Entre para acessar suas ideias.');
  if (!user.email_confirmed_at) throw new FlowError(403, 'Confirme seu e-mail antes de acessar suas ideias.');
  const account = await gateway.account(user.id);
  if (account && (account.auth_user_id !== user.id || account.situacao !== 'ativa')) throw new FlowError(403, 'Acesso indisponível para esta conta.');
  return user.id;
}
function serviceError(error: unknown): never {
  if (error instanceof IdeasError) throw new FlowError(error.status, error.message);
  throw error;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const canonical = appOrigin();
    const requested = request.headers.get('origin');
    const host = request.headers.get('host');
    const trustedOrigins = mutationOrigins(canonical);
    const trustedHosts = trustedOrigins.map(value => new URL(value).host);
    if (request.headers.get('sec-fetch-site') === 'cross-site' || (requested !== null && (!trustedOrigins.includes(requested) || host !== new URL(requested).host)) || (host !== null && !trustedHosts.includes(host))) return json({ message: 'Origem não permitida.' }, 403);
    const owner = await identity();
    const id = new URL(request.url).searchParams.get('id');
    try {
      return json(id ? { ideia: ideaView(await service.get(owner, id)) } : { ideias: (await service.list(owner)).map(ideaView) });
    } catch (error) { serviceError(error); }
  } catch (error) {
    if (error instanceof FlowError) return json({ message: error.message }, error.status);
    return json({ message: 'Serviço indisponível. Tente novamente.' }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleMutation(request, appOrigin(), async input => {
      if (!record(input) || typeof input.action !== 'string') throw new FlowError(400, 'Pedido inválido.');
      const owner = await identity();
      try {
        if (input.action === 'create') {
          if (Object.keys(input).some(key => !['action', 'title', 'originalText', 'originalInterpretation', 'revisedInterpretation'].includes(key))) throw new FlowError(400, 'Pedido inválido.');
          const idea = await service.create(owner, { title: input.title, originalText: input.originalText, originalInterpretation: input.originalInterpretation, revisedInterpretation: input.revisedInterpretation } as CreateIdea);
          return { message: 'Rascunho salvo em Minhas ideias.', ideia: ideaView(idea) };
        }
        if (input.action === 'update') {
          if (Object.keys(input).some(key => !['action', 'id', 'expectedVersion', 'title', 'revisedText', 'revisedInterpretation'].includes(key)) || typeof input.id !== 'string') throw new FlowError(400, 'Pedido inválido.');
          const idea = await service.update(owner, input.id, { expectedVersion: input.expectedVersion, title: input.title, revisedText: input.revisedText, revisedInterpretation: input.revisedInterpretation } as UpdateIdea);
          return { message: 'Rascunho atualizado.', ideia: ideaView(idea) };
        }
        if (input.action === 'delete') {
          if (Object.keys(input).some(key => !['action', 'id', 'confirmDelete'].includes(key)) || typeof input.id !== 'string' || input.confirmDelete !== true) throw new FlowError(400, 'Confirme a exclusão do rascunho.');
          await service.delete(owner, input.id);
          return { message: 'Rascunho excluído.' };
        }
        throw new FlowError(400, 'Pedido inválido.');
      } catch (error) { serviceError(error); }
    }, 200000);
  } catch {
    return json({ message: 'Serviço indisponível. Tente novamente.' }, 503);
  }
}
