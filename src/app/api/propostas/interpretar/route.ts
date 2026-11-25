import { FlowError } from '../../../../lib/auth/flow.server';
import { handleMutation, privateHeaders } from '../../../../lib/auth/http.server';
import { createGateway } from '../../../../lib/auth/gateway.server';
import { userClient } from '../../../../lib/supabase/server';
import { adminClient } from '../../../../lib/supabase/admin.server';
import { appOrigin } from '../../../../lib/supabase/config.server';
import { e4Service } from '../../../../lib/capabilities/service.server';
import { projectProposalContext, type ProposalContext } from '../../../../lib/proposals/context.server';
import { interpretProposal } from '../../../../lib/proposals/interpret.server';
import { InterpretationError, type InterpretationDiagnostic } from '../../../../lib/proposals/diagnostics.server';
import { canUseBetaInterpretation } from '../../../../lib/proposals/beta-access.server';

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
  const started = performance.now();
  let stage: 'request' | 'authorization' | 'context' | 'rate_limit' | 'gateway' = 'request';
  let contextual = false;
  let diagnostic: InterpretationDiagnostic | undefined;
  let response: Response;
  try {
    response = await handleMutation(request, appOrigin(), async input => {
      if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.hasOwn(input, 'texto')) throw new FlowError(422, 'Escreva uma proposta de até 2.000 caracteres.');
      const keys = Object.keys(input);
      let selection: { subjectId: string; consentimento: true } | undefined;
      if (keys.length === 2 && keys.includes('texto') && keys.includes('contexto')) {
        const contextInput = (input as { contexto?: unknown }).contexto;
        if (!contextInput || typeof contextInput !== 'object' || Array.isArray(contextInput)) throw new FlowError(422, 'Escolha um sujeito e autorize o envio do contexto.');
        const values = contextInput as Record<string, unknown>;
        if (Object.keys(values).length !== 2 || !Object.hasOwn(values, 'subjectId') || !Object.hasOwn(values, 'consentimento') || typeof values.subjectId !== 'string' || !values.subjectId.trim() || values.consentimento !== true) {
          throw new FlowError(422, 'Escolha um sujeito e autorize o envio do contexto.');
        }
        selection = { subjectId: values.subjectId, consentimento: true };
        contextual = true;
      } else if (keys.length !== 1 || keys[0] !== 'texto') {
        throw new FlowError(422, 'Pedido inválido.');
      }
      const texto = (input as { texto: unknown }).texto;
      if (typeof texto !== 'string' || !texto.trim() || texto.length > 2000) throw new FlowError(422, 'Escreva uma proposta de até 2.000 caracteres.');
      stage = 'authorization';
      const gateway = createGateway(await userClient(), adminClient, () => {});
      const user = await gateway.currentUser();
      if (!user?.id || !user.email_confirmed_at) throw new FlowError(401, 'Entre com uma conta confirmada para interpretar sua proposta.');
      if (!canUseBetaInterpretation(user.id)) {
        throw new FlowError(403, 'Esta conta não está autorizada a usar a interpretação do beta.', { interpretationAccess: 'beta' });
      }
      const account = await gateway.account(user.id);
      if (account && (account.auth_user_id !== user.id || account.situacao !== 'ativa')) throw new FlowError(403, 'Acesso indisponível para esta conta.');
      let contexto: ProposalContext | undefined;
      let authorizedContext: Awaited<ReturnType<typeof e4Service.context>> | undefined;
      if (selection) {
        stage = 'context';
        let subjects;
        try { subjects = await e4Service.subjects(); }
        catch { throw new FlowError(503, 'Contexto autorizado indisponível. Tente novamente mais tarde.'); }
        if (!subjects.some(subject => subject.id === selection.subjectId)) throw new FlowError(403, 'O sujeito selecionado não está autorizado para este contexto.');
        try {
          authorizedContext = await e4Service.context(selection.subjectId);
          contexto = projectProposalContext(authorizedContext);
        }
        catch { throw new FlowError(503, 'Contexto autorizado indisponível. Tente novamente mais tarde.'); }
      }
      stage = 'rate_limit';
      const release = reserve(user.id);
      try {
        // Check committed collaboration state at the send and response boundaries.
        // The provider call is outside the database transaction.
        const revalidate = async () => {
          stage = 'context';
          if (authorizedContext && !await e4Service.contextCollaborationsStillActive(authorizedContext)) {
            throw new FlowError(403, 'O contexto da colaboração selecionada não está mais autorizado.');
          }
        };
        if (authorizedContext) await revalidate();
        let interpretacao;
        stage = 'gateway';
        try { interpretacao = await interpretProposal(texto, contexto, request.signal); }
        catch (error) {
          if (request.signal.aborted) throw new FlowError(499, 'Interpretação cancelada.');
          if (error instanceof InterpretationError) diagnostic = error.diagnostic;
          if (error instanceof Error && 'code' in error && error.code === 'BUDGET') {
            throw new FlowError(402, 'O orçamento de interpretação está indisponível. As demais funcionalidades continuam disponíveis.');
          }
          throw new FlowError(503, 'Interpretação indisponível. Tente novamente mais tarde.');
        }
        if (authorizedContext) await revalidate();
        return { message: 'Prévia para revisão humana.', interpretacao };
      } finally { release(); }
    });
  } catch {
    response = Response.json({ message: 'Interpretação indisponível. Tente novamente mais tarde.' }, { status: 503, headers: privateHeaders });
  }
  if (!response.ok) console.warn('proposal_interpretation_failed', {
    stage, status: response.status, contextual, elapsedMs: Math.round(performance.now() - started), ...diagnostic,
  });
  return response;
}
