// Test-process mock only. The real application source never imports this file.
import { appendFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = '/Users/alexandrechagasleaocryptoboy/projects/digitap-ia-core-recuperacao-20261124';
const out = process.env.A_PRACA_EVIDENCE_DIR;
const marker = 'G4-03B-PRIVATE-SYNTHETIC-20261123-01';
const ownMarker = process.env.G4_03B_CONTEXT_MARKER;
const allowedLocal = new Set(['http://127.0.0.1:3215', 'http://127.0.0.1:56151', 'http://127.0.0.1:56154']);
const gatewayEndpoint = 'https://ai-gateway.vercel.sh/v4/ai/language-model';
const auditPath = `${out}/g4-03b-gateway-mock.jsonl`;
const blockedPath = `${out}/g4-03b-blocked-external.jsonl`;

if (process.cwd() !== root || realpathSync(fileURLToPath(new URL('../../../', import.meta.url))) !== root
  || process.env.DIGITAP_G4_03B_GATEWAY_MOCK !== '1'
  || process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1'
  || process.env.AI_GATEWAY_API_KEY !== 'g4-03b-synthetic-only'
  || process.env.AI_GATEWAY_MODEL !== 'moonshotai/kimi-k2.6'
  || ownMarker !== marker
  || !/^operations\/evidence\/g4-03b-recovery-[a-zA-Z0-9-]+$/.test(out ?? '')
  || process.env.APP_ORIGIN !== 'http://127.0.0.1:3215'
  || process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:56151'
  || process.env.NODE_ENV === 'production') {
  throw new Error('Preload G4-03B fora do modo local autorizado.');
}

const originalFetch = globalThis.fetch;
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const responseBody = data => ({
  content: [{ type: 'text', text: JSON.stringify(data) }],
  finishReason: { unified: 'stop', raw: 'stop' },
  usage: { inputTokens: { total: 24, noCache: 24, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 18, text: 18, reasoning: 0 } },
});

globalThis.fetch = async (input, init) => {
  let url;
  try { url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url); }
  catch { throw new Error('G4-03B bloqueou destino HTTP não reconhecido.'); }

  if (url.href === gatewayEndpoint) {
    const request = new Request(input, init);
    if (request.method !== 'POST' || request.headers.get('authorization') !== 'Bearer g4-03b-synthetic-only') {
      throw new Error('Protocolo do mock G4-03B incompatível com o SDK.');
    }
    const model = request.headers.get('ai-language-model-id');
    const body = JSON.parse(await request.text());
    const gateway = body.providerOptions?.gateway;
    if (model !== 'moonshotai/kimi-k2.6'
      || JSON.stringify(gateway?.only) !== '["parasail"]'
      || gateway?.zeroDataRetention !== true
      || gateway?.disallowPromptTraining !== true
      || gateway?.models !== undefined
      || body.tools !== undefined
      || body.responseFormat?.type !== 'json'
      || body.responseFormat?.schema?.additionalProperties !== false) {
      throw new Error('Contrato de modelo, roteamento, privacidade ou saída estruturada G4-03B inesperado.');
    }

    const userText = body.prompt?.[1]?.content?.find?.(part => part.type === 'text')?.text;
    if (typeof userText !== 'string') throw new Error('Prompt do usuário ausente no protocolo AI SDK G4-03B.');
    const contextual = userText.startsWith('{');
    let context;
    let proposal = userText;
    if (contextual) {
      const parsed = JSON.parse(userText);
      if (!exactKeys(parsed, ['proposta', 'contexto_autorizado']) || typeof parsed.proposta !== 'string'
        || !exactKeys(parsed.contexto_autorizado, ['capabilities', 'projects', 'needs', 'realizations'])) {
        throw new Error('Projeção contextual fora do contrato G4-03B.');
      }
      proposal = parsed.proposta;
      context = parsed.contexto_autorizado;
    }
    const serialized = contextual ? userText : '';
    const capability = context?.capabilities?.[0];
    const capabilityKeys = capability ? Object.keys(capability).sort() : [];
    const expectedCapabilityKeys = ['category', 'conditions', 'createdAt', 'description', 'provenance', 'state', 'updatedAt', 'version', 'visibility'];
    const hasUuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(serialized);
    const hasForbiddenFields = /"(?:subjectId|recordId|authorizedScope|auth_user_id|conta_id|sujeito_id|projectId|ownerSubjectId|access)"\s*:/.test(serialized);
    const failure = proposal.includes('G4-03B-GATEWAY-FAIL');
    const safeAudit = {
      mock: true, endpoint: '/v4/ai/language-model', model, provider: gateway.only,
      zeroDataRetention: gateway.zeroDataRetention, disallowPromptTraining: gateway.disallowPromptTraining,
      tools: body.tools !== undefined, structuredJson: body.responseFormat.type === 'json',
      contextual, mode: failure ? 'failure' : 'ok',
      ...(contextual ? {
        contextKeys: Object.keys(context).sort(), capabilityKeys,
        hasOwnedMarker: JSON.stringify(context).includes(ownMarker),
        hasForeignMarker: JSON.stringify(context).includes('G4-03B-FOREIGN-PRIVATE-SYNTHETIC-20261123-01'),
        hasUuid, hasForbiddenFields,
        projectionKeysValid: !capability || JSON.stringify(capabilityKeys) === JSON.stringify(expectedCapabilityKeys),
      } : {}),
    };
    appendFileSync(auditPath, JSON.stringify(safeAudit) + '\n');
    if (contextual && (hasUuid || hasForbiddenFields || safeAudit.hasForeignMarker || !safeAudit.projectionKeysValid)) {
      throw new Error('Payload G4-03B continha contexto fora da projeção permitida.');
    }
    if (failure) return new Response('SENSITIVE_PROVIDER_MARKER', { status: 503 });
    const extraction = {
      sujeitos: [], projetos: [], atividades: [{ descricao: 'Oficina de leitura sugerida', trecho: 'oficina gratuita de leitura' }],
      capacidades: [], relacoes: [], fontes: [], informacoes_nao_verificadas: [],
    };
    return Response.json(responseBody(extraction));
  }

  if (allowedLocal.has(url.origin) && !url.username && !url.password) return originalFetch(input, { ...init, redirect: 'error' });
  appendFileSync(blockedPath, JSON.stringify({ mock: true, event: 'blocked_external', destination: 'redacted' }) + '\n');
  throw new Error('G4-03B bloqueou tentativa HTTP externa não allowlisted.');
};
