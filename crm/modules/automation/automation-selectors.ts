import type { AutomationFlow, FlowStatus } from './domain/types';

export type LibraryView = 'all' | FlowStatus;

export interface LibraryFilters {
  q: string | null;
  view: LibraryView;
  category: string | null;
  ownerId: string | null;
}

export interface LibraryScope {
  branchId: string | null;
  whatsappNumberId: string | null;
}

export function filterFlows(scope: LibraryScope, filters: LibraryFilters, flows: AutomationFlow[]): AutomationFlow[] {
  return flows
    .filter((flow) => (scope.branchId ? flow.branchId === scope.branchId || !flow.branchId : true))
    .filter((flow) => (scope.whatsappNumberId ? flow.whatsappNumberId === scope.whatsappNumberId || !flow.whatsappNumberId : true))
    .filter((flow) => (filters.view === 'all' ? true : flow.status === filters.view))
    .filter((flow) => (filters.category ? flow.category === filters.category : true))
    .filter((flow) => (filters.ownerId ? flow.ownerId === filters.ownerId : true))
    .filter((flow) => {
      if (!filters.q) return true;
      const q = filters.q.toLowerCase();
      return (
        flow.name.toLowerCase().includes(q) ||
        flow.purpose.toLowerCase().includes(q) ||
        flow.trigger.summary.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface LifecycleCounts {
  all: number;
  draft: number;
  testing: number;
  live: number;
  paused: number;
  inactive: number;
}

export function lifecycleCounts(scope: LibraryScope, flows: AutomationFlow[]): LifecycleCounts {
  const inScope = flows
    .filter((flow) => (scope.branchId ? flow.branchId === scope.branchId || !flow.branchId : true))
    .filter((flow) => (scope.whatsappNumberId ? flow.whatsappNumberId === scope.whatsappNumberId || !flow.whatsappNumberId : true));

  return {
    all: inScope.length,
    draft: inScope.filter((f) => f.status === 'draft').length,
    testing: inScope.filter((f) => f.status === 'testing').length,
    live: inScope.filter((f) => f.status === 'live').length,
    paused: inScope.filter((f) => f.status === 'paused').length,
    inactive: inScope.filter((f) => f.status === 'inactive').length,
  };
}

export function distinctCategories(flows: AutomationFlow[]): string[] {
  return Array.from(new Set(flows.map((flow) => flow.category)));
}
