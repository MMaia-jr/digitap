// Test-process mock only. The real application source never imports this file.
import { appendFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = '/Users/alexandrechagasleaocryptoboy/projects/digitap-ia-core-recuperacao-20261124';
const out = process.env.A_PRACA_EVIDENCE_DIR;
const marker = 'G4-03B-PRIVATE-SYNTHETIC-20261123-01';
const ownMarker = process.env.G4_03B_CONTEXT_MARKER;
const allowedLocal = new Set(['http://127.0.0.1:3215', 'http://127.0.0.1:56151', 'http://127.0.0.1:56154']);
const gatewayEndpoint = 'https://ai-gateway.vercel.sh/v4/ai/language-model';
const live = process.env.DIGITAP_G4_03B_GATEWAY_REAL === '1';
const expectedProposal = 'Quero organizar uma oficina de dança no projeto sintético Raízes. Proponho uma aula no sábado e preciso confirmar o espaço.';
const auditPath = `${out}/g4-03b-gateway-${live ? "real" : "mock"}.jsonl`;
const blockedPath = `${out}/g4-03b-blocked-external.jsonl`;

if (process.cwd() !== root || realpathSync(fileURLToPath(new URL('../../../', import.meta.url))) !== root
  || (live === (process.env.DIGITAP_G4_03B_GATEWAY_MOCK === '1'))
  || process.env.A_PRACA_ALLOW_FIXTURE_CLEANUP !== '1'
  || (live ? !process.env.AI_GATEWAY_API_KEY : process.env.AI_GATEWAY_API_KEY !== 'g4-03b-synthetic-only')
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
    if (request.method !== 'POST' || request.headers.get('authorization') !== `Bearer ${process.env.AI_GATEWAY_API_KEY}`) {
      throw new Error('Protocolo do mock G4-03B incompatível com o SDK.');
    }
    const model = request.headers.get('ai-language-model-id');
    const body = JSON.parse(await request.clone().text());
    const gateway = body.providerOptions?.gateway;
    if (model !== 'moonshotai/kimi-k2.6'
      || gateway?.only !== undefined
      || gateway?.order !== undefined
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
      mock: !live, endpoint: '/v4/ai/language-model', model, providerPolicy: 'gateway-default',
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
    if (!live) appendFileSync(auditPath, JSON.stringify(safeAudit) + '\n');
    if (contextual && (hasUuid || hasForbiddenFields || safeAudit.hasForeignMarker || !safeAudit.projectionKeysValid)) {
      throw new Error('Payload G4-03B continha contexto fora da projeção permitida.');
    }
    if (live) {
      if (!contextual || proposal !== expectedProposal || context.capabilities.length !== 1
        || capability.description !== marker || capability.category !== 'cultura' || capability.visibility !== 'privada'
        || capability.conditions !== 'Condição sintética do ensaio.' || !exactKeys(capability.provenance, ['source','attribution'])
        || capability.provenance.source !== 'capacidades' || capability.provenance.attribution !== 'subject_owner'
        || !['projects','needs','realizations'].every(collection => Array.isArray(context[collection]) && context[collection].length === 0)
        || body.prompt.length !== 2 || body.prompt[1].content.length !== 1 || body.temperature !== undefined
        || body.maxOutputTokens !== 6000) throw new Error('Somente a projeção da fixture sintética pode sair do harness.');
      const reserveUSD = 0.8191104;
      // Exclusive creation across Next workers. A second upstream request cannot spend.
      writeFileSync(auditPath, JSON.stringify({ ...safeAudit, event: 'reserved', reserveUSD }) + '\n', { flag: 'wx', mode: 0o600 });
      const started = performance.now();
      let response;
      try { response = await originalFetch(request, { redirect: 'error', cache: 'no-store' }); }
      catch (error) {
        const code = error.cause?.code;
        appendFileSync(auditPath, JSON.stringify({ event: 'transport', cancelled: request.signal.aborted,
          code: typeof code === 'string' && /^[A-Z0-9_]+$/.test(code) ? code : undefined,
          latencyMs: Math.round(performance.now() - started) }) + '\n');
        throw error;
      }
      const receipt = { event: 'response', status: response.status };
      try {
        const body = await response.clone().json();
        const gateway = body.providerMetadata?.gateway;
        const categories = ['sujeitos','projetos','atividades','capacidades','relacoes','fontes','informacoes_nao_verificadas'];
        const blocks = (Array.isArray(body.content) ? body.content : []).filter(part => part.type === 'text' && typeof part.text === 'string');
        const text = blocks.map(part => part.text).join('');
        let outputShape = { textBlocks: blocks.length, bytes: Buffer.byteLength(text), json: false };
        try {
          const value = JSON.parse(text);
          outputShape = { ...outputShape, json: true, exactCategories: exactKeys(value, categories),
            lists: Object.fromEntries(categories.map(category => {
              const list = value?.[category];
              return [category, Array.isArray(list) ? {
                size: list.length,
                invalidKeys: list.filter(item => !exactKeys(item, category === 'sujeitos' ? ['descricao','trecho','tipo'] :
                  category === 'relacoes' ? ['origem','destino','tipo','trecho'] : ['descricao','trecho'])).length,
                unanchored: list.filter(item => typeof item?.trecho !== 'string' || !proposal.includes(item.trecho)).length,
                invalidText: list.filter(item => item && typeof item === 'object' && Object.values(item)
                  .some(field => typeof field !== 'string' || !field.trim() || field.length > 1000 || /[<>\u0000-\u001f\u007f]/.test(field))).length,
              } : null];
            })) };
        } catch { /* The absence of JSON is itself diagnostic. */ }
        receipt.outputShape = outputShape;
        const slug = value => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,100}$/.test(value) ? value : undefined;
        Object.assign(receipt, { generationId: slug(gateway?.generationId), provider: slug(gateway?.routing?.finalProvider ?? gateway?.provider),
          costUSD: Number.isFinite(Number(gateway?.cost)) ? Number(gateway.cost) : undefined,
          inputTokens: body.usage?.inputTokens?.total, outputTokens: body.usage?.outputTokens?.total,
          reasoningTokens: body.usage?.outputTokens?.reasoning, answerTokens: body.usage?.outputTokens?.text,
          finishReason: slug(body.finishReason?.unified) });
      } catch {
        // Preserve the original response even when it has no JSON receipt.
      } finally {
        appendFileSync(auditPath, JSON.stringify({ ...receipt, latencyMs: Math.round(performance.now() - started) }) + '\n');
      }
      return response;
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
