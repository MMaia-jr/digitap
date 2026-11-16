import { ActivityError } from '../../../../../lib/activities/domain';
import { activities } from '../../../../../lib/activities/service.server';
import { FlowError } from '../../../../../lib/auth/flow.server';
import { handleMutation, privateHeaders } from '../../../../../lib/auth/http.server';
import { appOrigin, mutationOrigins } from '../../../../../lib/supabase/config.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: privateHeaders });

function allowedReadOrigin(request: Request) {
  const canonical = appOrigin();
  const allowed = mutationOrigins(canonical);
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  if (origin !== null && (!allowed.includes(origin) || host !== new URL(origin).host)) return false;
  return host === null || allowed.some(value => new URL(value).host === host);
}

function translate(error: unknown): never {
  if (error instanceof ActivityError) throw new FlowError(error.status, error.message, error.fields);
  throw error;
}

export async function GET(request: Request, { params }: Context) {
  if (!allowedReadOrigin(request)) return json({ message: 'Origem não permitida.' }, 403);
  const { id } = await params;
  try {
    return json({ plano: await activities.getExecutionPlan(id) });
  } catch (error) {
    if (error instanceof ActivityError) return json({ message: error.message }, error.status);
    return json({ message: 'Serviço indisponível. Tente novamente.' }, 503);
  }
}

async function mutate(request: Request, method: 'create' | 'update', { params }: Context) {
  const { id } = await params;
  const postRequest = request.method === 'PATCH' ? new Request(request, { method: 'POST' }) : request;
  return handleMutation(postRequest, appOrigin(), async input => {
    try {
      const plano = method === 'create'
        ? await activities.createExecutionPlan(id, input)
        : await activities.updateExecutionPlan(id, input);
      return { message: 'Planejamento privado salvo. Valores são previstos, não despesas ou pagamentos.', plano };
    } catch (error) {
      translate(error);
    }
  }, 131072);
}

export async function POST(request: Request, context: Context) {
  return mutate(request, 'create', context);
}

export async function PATCH(request: Request, context: Context) {
  return mutate(request, 'update', context);
}
