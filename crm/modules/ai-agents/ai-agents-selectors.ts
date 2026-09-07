import type { AiAgent } from './domain/types';
import { useCaseLabel } from './ai-agents-labels';

/**
 * Library view buckets (CODE_FIRST_ADAPTER.md route manifest
 * `?view=all|draft|ready-to-test|active|paused|inactive`). `ready-to-test`
 * also surfaces `tested` agents — both are "not yet activated" states and the
 * spec does not carve out a separate library tab for `tested`.
 */
export type LibraryView = 'all' | 'draft' | 'ready-to-test' | 'active' | 'paused' | 'inactive';

const viewStatuses: Record<Exclude<LibraryView, 'all'>, AiAgent['lifecycleStatus'][]> = {
  draft: ['draft'],
  'ready-to-test': ['ready_to_test', 'tested'],
  active: ['active'],
  paused: ['paused'],
  inactive: ['inactive'],
};

export interface AgentScope {
  branchId: string | null;
  whatsappNumberId: string | null;
}

export interface AgentFilters {
  q: string | null;
  view: LibraryView;
  useCase: string | null;
  ownerId: string | null;
}

function inScope(agent: AiAgent, scope: AgentScope): boolean {
  if (scope.branchId && agent.branchId && agent.branchId !== scope.branchId) return false;
  if (scope.whatsappNumberId && agent.whatsappNumberId && agent.whatsappNumberId !== scope.whatsappNumberId) return false;
  return true;
}

export function filterAgents(agents: AiAgent[], scope: AgentScope, filters: AgentFilters): AiAgent[] {
  return agents.filter((agent) => {
    if (!inScope(agent, scope)) return false;
    if (filters.view !== 'all' && !viewStatuses[filters.view].includes(agent.lifecycleStatus)) return false;
    if (filters.useCase && agent.useCase !== filters.useCase) return false;
    if (filters.ownerId && agent.ownerId !== filters.ownerId) return false;
    if (filters.q) {
      const needle = filters.q.toLowerCase();
      const haystack = `${agent.name} ${useCaseLabel[agent.useCase]}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export interface LibraryCounts {
  all: number;
  draft: number;
  readyToTest: number;
  active: number;
  paused: number;
  inactive: number;
}

export function lifecycleCounts(agents: AiAgent[], scope: AgentScope): LibraryCounts {
  const scoped = agents.filter((agent) => inScope(agent, scope));
  return {
    all: scoped.length,
    draft: scoped.filter((a) => viewStatuses.draft.includes(a.lifecycleStatus)).length,
    readyToTest: scoped.filter((a) => viewStatuses['ready-to-test'].includes(a.lifecycleStatus)).length,
    active: scoped.filter((a) => viewStatuses.active.includes(a.lifecycleStatus)).length,
    paused: scoped.filter((a) => viewStatuses.paused.includes(a.lifecycleStatus)).length,
    inactive: scoped.filter((a) => viewStatuses.inactive.includes(a.lifecycleStatus)).length,
  };
}

/** Agents an Automation "Hand off to AI Agent" node may pick — active/eligible only. */
export function eligibleForHandoff(agents: AiAgent[]): AiAgent[] {
  return agents.filter((agent) => agent.lifecycleStatus === 'active');
}
