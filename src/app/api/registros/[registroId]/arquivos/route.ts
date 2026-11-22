import {privateFilesMutation, privateFilesResponse, privateFilesRuntime} from '../../../../../lib/evidence/private-files.runtime.server';
import {FlowError} from '../../../../../lib/auth/flow.server';

export const runtime = 'nodejs';

function uploadInput(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new FlowError(400, 'Pedido inválido.');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some(key => !['contentType', 'sizeBytes'].includes(key))) throw new FlowError(400, 'Pedido inválido.');
  return {contentType: body.contentType, sizeBytes: body.sizeBytes};
}

export async function GET(_request: Request, {params}: {params: Promise<{registroId: string}>}) {
  const {registroId} = await params;
  return privateFilesResponse(async () => {
    const {service} = await privateFilesRuntime();
    return service.listarArquivos({registroId});
  });
}

export async function POST(request: Request, {params}: {params: Promise<{registroId: string}>}) {
  const {registroId} = await params;
  return privateFilesMutation(request, async input => {
    const body = uploadInput(input);
    const {service, bucket} = await privateFilesRuntime();
    const file = await service.iniciarUpload({registroId, ...body});
    return {arquivo: {
      id: file.arquivoId,
      objectKey: file.objectKey,
      uploadToken: file.uploadToken,
      bucket,
    }};
  });
}
