/**
 * Canonical Automation screen manifest (SKILL.md core inventory +
 * CODE_FIRST_ADAPTER.md route contract). Three real primary routes; almost
 * everything else is query-state on the Builder route. This table is the
 * audit source of truth for SOURCE_COVERAGE_AUDIT.md and the Figma capture
 * manifest, not a 1:1 react-router route table.
 */

export type AutomationSurface = 'page' | 'modal' | 'drawer' | 'panel' | 'state';

export interface AutomationScreen {
  id: string;
  route: string;
  title: string;
  surface: AutomationSurface;
  purpose: string;
  batch: number | 'deferred';
}

export const automationScreens: AutomationScreen[] = [
  { id: 'AUT-S01', route: '/automation', title: 'Automation Library', surface: 'page', purpose: 'All flows and operational lifecycle management.', batch: 1 },
  { id: 'AUT-S01-VIEW', route: '/automation?view=live', title: 'Library lifecycle view', surface: 'state', purpose: 'Filter by status.', batch: 1 },
  { id: 'AUT-S01-EMPTY', route: '/automation?state=empty', title: 'Library empty state', surface: 'state', purpose: 'No flows yet.', batch: 1 },
  { id: 'AUT-S01-NORESULTS', route: '/automation?q=payment&state=no-results', title: 'Library no-results state', surface: 'state', purpose: 'Search/filter matched nothing.', batch: 1 },
  { id: 'AUT-S01-DENIED', route: '/automation?role=agent', title: 'Library permission-denied state', surface: 'state', purpose: 'Role without automation.view access.', batch: 1 },
  { id: 'AUT-S02', route: '/automation/new', title: 'Starter Flow Gallery', surface: 'page', purpose: 'Starting point for new automation.', batch: 1 },
  { id: 'AUT-S02-CATEGORY', route: '/automation/new?category=lead-capture', title: 'Starter Gallery category filter', surface: 'state', purpose: 'Filter starters by category.', batch: 1 },
  { id: 'AUT-S03', route: '/automation/:flowId', title: 'Flow Builder', surface: 'page', purpose: 'Visual canvas and all contextual editing/testing/publishing.', batch: 2 },
  { id: 'AUT-S03-NODE', route: '/automation/:flowId?panel=node&node=msg_01', title: 'Node configuration panel', surface: 'panel', purpose: 'Configure the selected node.', batch: 2 },
  { id: 'AUT-S03-VALIDATION', route: '/automation/:flowId?panel=validation', title: 'Validation panel', surface: 'panel', purpose: 'Errors vs warnings, deep-link to node.', batch: 4 },
  { id: 'AUT-S03-TEST', route: '/automation/:flowId?panel=test', title: 'Test Mode panel', surface: 'panel', purpose: 'Simulated test runner.', batch: 4 },
  { id: 'AUT-S03-PUBLISH', route: '/automation/:flowId?modal=publish', title: 'Publish modal', surface: 'modal', purpose: 'Go Live / schedule / approval.', batch: 5 },
  { id: 'AUT-S03-VERSIONS', route: '/automation/:flowId?panel=versions', title: 'Versions panel', surface: 'panel', purpose: 'Version history + rollback.', batch: 5 },
  { id: 'AUT-S03-ACTIVITY', route: '/automation/:flowId?panel=activity', title: 'Activity / Audit panel', surface: 'panel', purpose: 'Created/edited/tested/published/paused/rollback log.', batch: 5 },
  { id: 'AUT-S03-ERRORLINK', route: '/automation/:flowId?node=<nodeId>&panel=validation&issue=<issueId>', title: 'Error deep-link state', surface: 'state', purpose: 'Admin/failure alert lands on the failing node.', batch: 4 },

  // Phase 2 — deliberately deferred (SOURCE_COVERAGE_AUDIT.md §L).
  { id: 'AUT-DEFER-ANALYTICS', route: '/automation/:flowId?tab=analytics&state=phase-2', title: 'Analytics tab placeholder', surface: 'state', purpose: 'Step/drop-off/conversion analytics.', batch: 'deferred' },
  { id: 'AUT-DEFER-CONDITION', route: '/automation/:flowId?panel=node&node=api_01&state=phase-2', title: 'Advanced Condition placeholder', surface: 'state', purpose: 'AND/OR nested condition builder.', batch: 'deferred' },
  { id: 'AUT-DEFER-SPLIT', route: '/automation/:flowId?panel=node&node=commerce_01&state=phase-2', title: 'Random Split / Commerce placeholder', surface: 'state', purpose: 'Random/split routing, commerce workflow actions.', batch: 'deferred' },
];

export function findAutomationScreen(id: string): AutomationScreen | undefined {
  return automationScreens.find((screen) => screen.id === id);
}

export const coreAutomationScreens = automationScreens.filter((screen) => screen.batch !== 'deferred');
export const deferredAutomationScreens = automationScreens.filter((screen) => screen.batch === 'deferred');
