import 'server-only';
import type { e4Service } from '../capabilities/service.server';

type E4Context = Awaited<ReturnType<typeof e4Service.context>>;

/** Minimal, authorized projection for one interpretation request.
 * Identifiers and authorization scopes stay inside E4; source, attribution,
 * state, version and available timestamps remain attached to each fragment.
 */
export type ProposalContext = {
  capabilities: Array<{
    description: string; category: string; conditions: string;
    provenance: { source: string; attribution: string };
    state: string; visibility: string; version: number; createdAt: string; updatedAt: string;
  }>;
  projects: Array<{
    title: string; description: string; year: number;
    provenance: { source: string };
  }>;
  needs: Array<{
    description: string; categories: string[]; conditions: string;
    provenance: { source: string; attribution: string };
    state: string; visibility: string; version: number; createdAt: string; updatedAt: string;
  }>;
  realizations: Array<{
    description: string; sourceDeclaration: string;
    provenance: { source: string; attribution: string };
    state: string; visibility: string; version: number; publishedAt: string; realizationDate: string; certainty: string;
  }>;
};

export function projectProposalContext(context: E4Context): ProposalContext {
  return {
    capabilities: context.capabilities.map(({ description, category, conditions, source, attribution, state, visibility, version, createdAt, updatedAt }) => ({
      description, category, conditions, provenance: { source, attribution }, state, visibility, version, createdAt, updatedAt,
    })),
    projects: context.projects.map(({ title, description, year, source }) => ({
      title, description, year, provenance: { source },
    })),
    needs: context.needs.map(({ description, categories, conditions, source, attribution, state, visibility, version, createdAt, updatedAt }) => ({
      description, categories, conditions, provenance: { source, attribution }, state, visibility, version, createdAt, updatedAt,
    })),
    realizations: context.realizations.map(({ description, sourceDeclaration, source, attribution, state, visibility, version, publishedAt, realizationDate, certainty }) => ({
      description, sourceDeclaration, provenance: { source, attribution }, state, visibility, version, publishedAt, realizationDate, certainty,
    })),
  };
}
