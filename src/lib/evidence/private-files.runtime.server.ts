import 'server-only';
import {FlowError} from '../auth/flow.server';
import {handleMutation, privateHeaders} from '../auth/http.server';
import {createGateway} from '../auth/gateway.server';
import {adminClient} from '../supabase/admin.server';
import {appOrigin} from '../supabase/config.server';
import {userClient} from '../supabase/server';
import {createPrivateFileRepository} from './private-files.repository.server';
import {createSupabasePrivateFileStorage} from './private-files.storage.server';
import {createPrivateFileService} from './private-files.server';

export async function privateFilesRuntime() {
  const bucket = process.env.SUPABASE_PRIVATE_EVIDENCE_BUCKET;
  if (!bucket || !/^[a-z0-9][a-z0-9_-]{1,99}$/.test(bucket)) {
    throw new Error('Bucket privado não configurado.');
  }
  const admin = adminClient();
  const user = await createGateway(await userClient(), () => admin, () => {}).currentUser();
  const access = createPrivateFileRepository();
  const service = createPrivateFileService({
    verifyActor: async () => user?.id && user.email_confirmed_at ? user.id : null,
    authorize: access.authorize,
    repository: access.repository,
    storage: createSupabasePrivateFileStorage(admin, bucket),
  });
  return {service, bucket};
}

function privateFileFailure(error: unknown) {
  if (error instanceof FlowError) return error;
  const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
  const message = error && typeof error === 'object' && 'message' in error ? error.message : undefined;
  if (typeof status === 'number' && [400, 401, 403, 404, 409, 422].includes(status)
    && typeof message === 'string') return new FlowError(status, message);
  return new FlowError(503, 'Serviço indisponível. Tente novamente.');
}

export function privateFilesMutation(request: Request, execute: (input: unknown) => Promise<Record<string, unknown>>) {
  return handleMutation(request, appOrigin(), async input => {
    try {
      return {message: 'Operação privada concluída.', ...await execute(input)};
    } catch (error) {
      throw privateFileFailure(error);
    }
  }, 8192);
}

export async function privateFilesResponse(operation: () => Promise<unknown>) {
  try {
    return Response.json(await operation(), {headers: privateHeaders});
  } catch (error) {
    const failure = privateFileFailure(error);
    return Response.json({message: failure.message}, {status: failure.status, headers: privateHeaders});
  }
}

export async function privateFilesRedirect(operation: () => Promise<string>) {
  try {
    const url = await operation();
    return new Response(null, {status: 302, headers: {
      ...privateHeaders,
      Location: url,
    }});
  } catch (error) {
    const failure = privateFileFailure(error);
    return Response.json({message: failure.message}, {status: failure.status, headers: privateHeaders});
  }
}
