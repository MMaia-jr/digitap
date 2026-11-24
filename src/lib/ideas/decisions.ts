export const decisionStates = ['DEFINIDO', 'PROVISÓRIO', 'PENDENTE', 'EXCLUÍDO'] as const;
export type DecisionState = typeof decisionStates[number];

export type Decision = { chave: string; estado: DecisionState; descricao: string };
export type DecisionRevision = Decision & { versao_ideia: number; confirmada_em: string };
export type DecisionHistory = { decisions: DecisionRevision[]; history: DecisionRevision[]; hasMore: boolean };
export type DecisionSnapshot = { versao_ideia: number; decisoes: DecisionRevision[] };

export function decisionState(value: unknown): value is DecisionState {
  return decisionStates.some(state => state === value);
}
