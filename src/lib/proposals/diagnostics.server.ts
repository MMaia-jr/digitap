import 'server-only';

const messages = {
  INPUT: 'Proposta inválida.',
  CONFIGURATION: 'Interpretação não configurada.',
  OUTPUT: 'Resposta de interpretação inválida.',
  CANCELLED: 'Interpretação cancelada.',
  BUDGET: 'Orçamento de interpretação indisponível.',
  UNAVAILABLE: 'Interpretação indisponível.',
} as const;
export type InterpretationCode = keyof typeof messages;
export type SemanticRule = 'output_shape' | 'category_not_array' | 'category_too_many_items' | 'item_shape'
  | 'field_type' | 'field_blank' | 'field_too_long' | 'field_forbidden_character' | 'subject_type' | 'quote_not_in_proposal';
export type InterpretationDiagnostic =
  | { reason: 'finish_reason'; finishReason: 'length' | 'tool-calls' | 'content-filter' | 'error' | 'other' }
  | { reason: 'provider_timeout' | 'provider_http' | 'budget'; providerStatus: number }
  | { reason: 'semantic_validation'; rule: SemanticRule; category?: string; field?: string }
  | { reason: 'connection' | 'response_size' | 'structured_extraction' | 'configuration' | 'sdk_unavailable' };

export class InterpretationError extends Error {
  override readonly cause = undefined;
  constructor(readonly code: InterpretationCode, readonly diagnostic?: InterpretationDiagnostic) {
    super(messages[code]);
  }
}
