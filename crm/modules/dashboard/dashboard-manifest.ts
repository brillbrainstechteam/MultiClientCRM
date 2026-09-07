/**
 * Canonical Dashboard screen manifest (CODE_FIRST_ADAPTER.md route contract +
 * DASHBOARD_GENERATION_SPEC.md §5 surface taxonomy). Every DASH-S id maps to
 * exactly one entry here — Batch 0 registers all of them; `batch` records
 * which batch fills in the real screen so the audit in Batch 6 has one source
 * of truth to check against.
 */

export type DashboardSurface = 'page' | 'drawer' | 'wide-drawer' | 'popover' | 'modal' | 'edit-mode' | 'overlay';

export interface DashboardScreen {
  id: string;
  title: string;
  surface: DashboardSurface;
  /** Route path for `page`, or the query-state shape for every other surface. */
  location: string;
  purpose: string;
  batch: number;
}

export const dashboardScreens: DashboardScreen[] = [
  {
    id: 'DASH-S01',
    title: 'Dashboard Overview',
    surface: 'page',
    location: '/dashboard',
    purpose: 'Primary operational control centre: attention, setup, snapshot, domain widgets, trends, AI, activity.',
    batch: 1,
  },
  {
    id: 'DASH-S02',
    title: 'Alerts & Attention Centre',
    surface: 'page',
    location: '/dashboard/alerts',
    purpose: 'Full alert list with severity/category/number/branch/team/status filters and row actions.',
    batch: 2,
  },
  {
    id: 'DASH-S03',
    title: 'Alert Detail',
    surface: 'drawer',
    location: '?drawer=alert&alertId=...',
    purpose: 'Issue, severity, impact, recommended action and the exact owning-module CTA.',
    batch: 2,
  },
  {
    id: 'DASH-S04',
    title: 'Setup Checklist',
    surface: 'drawer',
    location: '?drawer=setup',
    purpose: 'Overall progress and per-step completion, blocked-dependency explanation, continue CTA.',
    batch: 2,
  },
  {
    id: 'DASH-S05',
    title: 'WhatsApp Number Health',
    surface: 'drawer',
    location: '?drawer=wa-health&whatsappNumberId=...',
    purpose: 'Connection, verification, quality, restriction, capacity, response-window and repair actions.',
    batch: 2,
  },
  {
    id: 'DASH-S06',
    title: 'Number Health Comparison',
    surface: 'wide-drawer',
    location: '?drawer=number-comparison',
    purpose: 'Compare every in-scope number side by side; selecting one opens DASH-S05.',
    batch: 2,
  },
  {
    id: 'DASH-S07',
    title: 'Dashboard Filter',
    surface: 'popover',
    location: '?popover=filters',
    purpose: 'Date, WhatsApp number(s), branch/department, team member, comparison period.',
    batch: 3,
  },
  {
    id: 'DASH-S08',
    title: 'Saved Views',
    surface: 'popover',
    location: '?popover=saved-views',
    purpose: 'Personal views plus admin-published role views; Manage views deep-links to Settings.',
    batch: 3,
  },
  {
    id: 'DASH-S09',
    title: 'Customise Dashboard',
    surface: 'edit-mode',
    location: '?mode=customise',
    purpose: 'In-page edit mode of DASH-S01: hide/show, reorder, reset, save/cancel.',
    batch: 3,
  },
  {
    id: 'DASH-S10',
    title: 'Quick Actions',
    surface: 'popover',
    location: '?popover=quick-actions',
    purpose: 'Launcher handing off immediately to the responsible module.',
    batch: 3,
  },
  {
    id: 'DASH-S11',
    title: 'Recent Activity',
    surface: 'drawer',
    location: '?drawer=recent-activity',
    purpose: 'Workspace activity feed with actor, entity, module, timestamp and open-source-record action.',
    batch: 3,
  },
  {
    id: 'DASH-S12',
    title: 'AI Management Summary',
    surface: 'drawer',
    location: '?drawer=ai-summary',
    purpose: 'Plain-language business movement, pending work, risks, wins and recommendations.',
    batch: 3,
  },
  {
    id: 'DASH-S13',
    title: 'AI Insight Detail',
    surface: 'drawer',
    location: '?drawer=ai-insight&insightId=...',
    purpose: 'What changed, drivers, affected area, evidence and recommendation for one AI insight.',
    batch: 3,
  },
  {
    id: 'DASH-S14',
    title: 'Export Dashboard',
    surface: 'modal',
    location: '?modal=export',
    purpose: 'Current filters/view summary, format choice, included metrics, restricted-metric handling.',
    batch: 3,
  },
  {
    id: 'DASH-S15',
    title: 'Reassign Pending Work',
    surface: 'modal',
    location: '?modal=reassign-work',
    purpose: 'Affected work, current owner, replacement owner, confirm with impact count.',
    batch: 3,
  },
  {
    id: 'DASH-S16',
    title: 'Guided Tour',
    surface: 'overlay',
    location: '?tour=1&step=...',
    purpose: 'First-login/help coach marks over attention, filters/views, drill-down and quick actions.',
    batch: 3,
  },
];

export function findDashboardScreen(id: string): DashboardScreen | undefined {
  return dashboardScreens.find((screen) => screen.id === id);
}
