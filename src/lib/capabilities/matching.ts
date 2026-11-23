export const capabilityCategories = ['agroecologia','cultura','comunicacao','cuidado','educacao','gestao','mobilizacao','tecnologia','outros'] as const;
export type CapabilityCategory = typeof capabilityCategories[number];

export interface DeclaredCapability {
  id: string; subjectId: string; subjectName: string; description: string;
  category: CapabilityCategory; conditions: string; visibility: string; status: string;
  version?: number; createdAt?: string; updatedAt?: string;
}
export interface DeclaredNeed {
  id: string; projectId?: string | null; projectTitle?: string | null; activityId?: string | null; activityTitle?: string | null;
  targetType?: 'projeto' | 'atividade'; description: string;
  categories: CapabilityCategory[]; conditions: string; visibility: string; status: string;
  ownerSubjectId?: string; version?: number; createdAt?: string; updatedAt?: string;
}
export interface CapabilityMatch {
  capabilityId: string; subjectId: string; subjectName: string; description: string;
  category: CapabilityCategory; conditions: string; needId: string; targetType: 'projeto' | 'atividade';
  targetId: string; targetTitle: string; projectId?: string; activityId?: string;
  projectTitle?: string; activityTitle?: string; needDescription: string; needConditions: string;
  reason: string; certainty: 'sugestao_nao_confirmada';
  needOwnerSubjectId?: string;
  capabilityVersion?: number; capabilityStatus?: string; capabilityCreatedAt?: string; capabilityUpdatedAt?: string;
  needVersion?: number; needStatus?: string; needCreatedAt?: string; needUpdatedAt?: string;
}

/** Compatibilidade explicável por igualdade exata de categoria declarada. */
export function findCapabilityMatches(capabilities: DeclaredCapability[], needs: DeclaredNeed[]): CapabilityMatch[] {
  const matches: CapabilityMatch[] = [];
  const eligibleCapabilities = capabilities.filter(item => item.visibility === 'publica' && item.status === 'ativa' && capabilityCategories.includes(item.category));
  const eligibleNeeds = needs.filter(item => item.visibility === 'visivel' && item.status === 'aberta');
  for (const need of eligibleNeeds) {
    for (const capability of eligibleCapabilities) {
      if (!need.categories.includes(capability.category)) continue;
      const activityTarget = need.targetType === 'atividade' && Boolean(need.activityId && need.activityTitle);
      const targetId = activityTarget ? need.activityId! : need.projectId ?? '';
      const targetTitle = activityTarget ? need.activityTitle! : need.projectTitle ?? '';
      matches.push({
        capabilityId: capability.id, subjectId: capability.subjectId,
        subjectName: capability.subjectName, description: capability.description,
        category: capability.category, conditions: capability.conditions,
        needId: need.id, targetType: activityTarget ? 'atividade' : 'projeto', targetId, targetTitle,
        ...(activityTarget ? { activityId: need.activityId!, activityTitle: need.activityTitle! } : { projectId: need.projectId ?? undefined, projectTitle: need.projectTitle ?? undefined }),
        needDescription: need.description, needConditions: need.conditions,
        reason: `Categoria declarada em comum: ${capability.category}.`,
        certainty: 'sugestao_nao_confirmada',
        ...(need.ownerSubjectId ? { needOwnerSubjectId: need.ownerSubjectId } : {}),
        ...(capability.version !== undefined ? { capabilityVersion: capability.version } : {}),
        ...(capability.status ? { capabilityStatus: capability.status } : {}),
        ...(capability.createdAt ? { capabilityCreatedAt: capability.createdAt } : {}),
        ...(capability.updatedAt ? { capabilityUpdatedAt: capability.updatedAt } : {}),
        ...(need.version !== undefined ? { needVersion: need.version } : {}),
        ...(need.status ? { needStatus: need.status } : {}),
        ...(need.createdAt ? { needCreatedAt: need.createdAt } : {}),
        ...(need.updatedAt ? { needUpdatedAt: need.updatedAt } : {}),
      });
    }
  }
  return matches.sort((a,b)=>a.needId.localeCompare(b.needId)||a.category.localeCompare(b.category)||a.capabilityId.localeCompare(b.capabilityId));
}
