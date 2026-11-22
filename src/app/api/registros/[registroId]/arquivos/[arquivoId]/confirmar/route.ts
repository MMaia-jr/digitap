import {privateFilesMutation, privateFilesRuntime} from '../../../../../../../lib/evidence/private-files.runtime.server';

export const runtime = 'nodejs';

export async function POST(request: Request, {params}: {params: Promise<{registroId: string; arquivoId: string}>}) {
  const {arquivoId} = await params;
  return privateFilesMutation(request, async () => {
    const {service} = await privateFilesRuntime();
    const result = await service.confirmarUpload({arquivoId});
    return {estado: result.estado};
  });
}
