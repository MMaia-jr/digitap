/**
 * ValueFlows-compatible read-only projection of one ALREADY PUBLIC E4 need.
 *
 * It is NOT a persistence model or a publication endpoint. Callers MUST get
 * receiverSubjectId from a trusted database join and authorize visibility,
 * current subject status and revocation BEFORE calling this pure function.
 * Based on the ValueFlows 1.0 vocabulary: https://www.valueflo.ws/
 * The HTTP vocabulary IRI matches the official JSON-LD examples.
 */
import type { DeclaredNeed } from '../capabilities/matching';

export type ValueFlowsAction = 'work' | 'use' | 'transfer';
export interface NeedProjectionContext {
  /** Must be derived from trusted subject ownership, NEVER request body. */
  receiverSubjectId: string;
  /** The economic operation MUST be chosen explicitly; never inferred from E4 category. */
  action: ValueFlowsAction;
  version: number;
  updatedAt: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const urn = (id: string): string => {
  if (typeof id !== 'string' || !uuidPattern.test(id)) throw new TypeError('Identificador UUID inválido.');
  return `urn:uuid:${id.toLowerCase()}`;
};

/**
 * Produces a JSON-LD graph with an anonymous Intent (not a new canonical ID)
 * and a Proposal referencing the existing E4 need UUID. The metadata envelope
 * is DigItap-specific; it does not assert ValueFlows verification semantics.
 */
export function projectPublicNeedAsValueFlows(need: DeclaredNeed, ctx: NeedProjectionContext) {
  if (need.visibility !== 'visivel' || need.status !== 'aberta') {
    throw new Error('Necessidade não elegível para projeção pública.');
  }
  const isActivity = need.targetType === 'atividade';
  const targetId = isActivity ? need.activityId : need.projectId;
  const targetTitle = isActivity ? need.activityTitle : need.projectTitle;
  if (!targetId || !targetTitle || !String(targetTitle).trim()) {
    throw new Error('Necessidade não elegível: alvo público incompleto.');
  }
  urn(targetId);
  const needUrn = urn(need.id);
  if (typeof ctx.receiverSubjectId !== 'string' || !uuidPattern.test(ctx.receiverSubjectId)) {
    throw new TypeError('Sujeito receptor UUID explícito obrigatório.');
  }
  if (!(['work', 'use', 'transfer'] as unknown[]).includes(ctx.action)) {
    throw new TypeError('Ação explícita ValueFlows obrigatória.');
  }
  if (!Number.isSafeInteger(ctx.version) || ctx.version < 1) {
    throw new TypeError('Versão válida obrigatória.');
  }
  if (typeof ctx.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(ctx.updatedAt) || !Number.isFinite(Date.parse(ctx.updatedAt))) {
    throw new TypeError('Data ISO UTC válida obrigatória.');
  }
  if (typeof need.description !== 'string' || !need.description.trim()) {
    throw new TypeError('Descrição pública necessária.');
  }
  const intentId = `_:intent_${need.id.toLowerCase().replaceAll('-', '')}`;
  // Explicit allow-list: never spread database rows, user input, or credentials.
  const declaredNote = need.description.trim() +
    (typeof need.conditions === 'string' && need.conditions.trim()
      ? `\nCondições declaradas: ${need.conditions.trim()}` : '');
  return {
    source: {
      system: 'digitap', entity: 'necessidade_projeto',
      id: need.id.toLowerCase(), version: ctx.version, updatedAt: ctx.updatedAt,
      targetType: isActivity ? 'atividade' : 'projeto', targetId: targetId.toLowerCase(),
      certainty: 'declarada_nao_verificada',
    },
    document: {
      '@context': { '@vocab': 'http://w3id.org/valueflows/ont/vf#' },
      '@graph': [
        {
          '@id': needUrn,
          '@type': 'Proposal', purpose: 'request', name: 'Necessidade pública declarada',
          publishes: { '@id': intentId },
        },
        {
          '@id': intentId,
          '@type': 'Intent', action: ctx.action,
          receiver: { '@id': urn(ctx.receiverSubjectId) },
          note: declaredNote,
        },
      ],
    },
  } as const;
}
