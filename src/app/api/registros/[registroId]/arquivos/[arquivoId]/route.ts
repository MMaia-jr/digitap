import {privateFilesRedirect, privateFilesRuntime} from '../../../../../../lib/evidence/private-files.runtime.server';

export const runtime = 'nodejs';

export async function GET(_request: Request, {params}: {params: Promise<{registroId: string; arquivoId: string}>}) {
  const {arquivoId} = await params;
  return privateFilesRedirect(async () => {
    const {service} = await privateFilesRuntime();
    return (await service.obterUrlLeitura({arquivoId})).url;
  });
}
