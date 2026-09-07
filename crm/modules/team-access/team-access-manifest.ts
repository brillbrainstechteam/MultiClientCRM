/**
 * Canonical Team & Access screen manifest (adapter route contract). Every
 * TEAM-S / TSET-S id maps to exactly one entry here — one source of truth for
 * routes, the secondary nav and the source-coverage audit.
 *
 * Route base note: the adapter document specifies `/team`, but this
 * repository's shell (AppRoutes.tsx, navigation.ts, and links already built
 * by Dashboard/Inbox) uses `/team-access` as the registered module path.
 * `/team-access` is kept so this module's routes resolve for links other
 * modules already ship (e.g. `/team-access?drawer=invite`).
 */

export type TeamAccessSurface = 'page' | 'drawer' | 'modal' | 'wizard' | 'settings';

export interface TeamAccessScreen {
  id: string;
  path: string;
  title: string;
  surface: TeamAccessSurface;
  purpose: string;
  /** Batch that implements the real content (0 = foundation only). */
  batch: number;
}

/** Full pages under /team-access. */
export const teamAccessPages: TeamAccessScreen[] = [
  {
    id: 'TEAM-S01',
    path: '/team-access',
    title: 'Overview',
    surface: 'page',
    purpose: 'Actionable staffing/access/work risk snapshot: active/pending, unassigned work, overload, number issues, exit attention.',
    batch: 1,
  },
  {
    id: 'TEAM-S02',
    path: '/team-access/people',
    title: 'People',
    surface: 'page',
    purpose: 'Directory of members with status, role, team, branch, availability, workload and access cues.',
    batch: 1,
  },
  {
    id: 'TEAM-S03',
    path: '/team-access/people/:memberId',
    title: 'Member Profile',
    surface: 'page',
    purpose: 'Overview/Access/Workload/Activity/Security tabs for one member.',
    batch: 1,
  },
  {
    id: 'TEAM-S05-S10',
    path: '/team-access/structure',
    title: 'Structure',
    surface: 'page',
    purpose: 'Teams, Branches and Numbers tabs — organisation shape and resource coverage.',
    batch: 2,
  },
  {
    id: 'TEAM-S06',
    path: '/team-access/teams/:teamId',
    title: 'Team Workspace',
    surface: 'page',
    purpose: 'Overview/Members/Numbers/Workload/Routing/Activity for one team.',
    batch: 2,
  },
  {
    id: 'TEAM-S08',
    path: '/team-access/branches/:branchId',
    title: 'Branch Detail',
    surface: 'page',
    purpose: 'Overview/Managers/Teams/Numbers/Access boundary/Work health/Activity for one branch.',
    batch: 2,
  },
  {
    id: 'TEAM-S11-S15',
    path: '/team-access/work',
    title: 'Work Distribution',
    surface: 'page',
    purpose: 'Workload, Routing, Queues and Escalations tabs with manual/bulk transfer.',
    batch: 3,
  },
  {
    id: 'TEAM-S16-S17',
    path: '/team-access/performance',
    title: 'Performance',
    surface: 'page',
    purpose: 'Actionable performance snapshot with filters and a detail drawer.',
    batch: 5,
  },
  {
    id: 'TEAM-S21',
    path: '/team-access/audit',
    title: 'Audit',
    surface: 'page',
    purpose: 'Actor/target/event history with detail drawer and permission-controlled export.',
    batch: 5,
  },
];

/** Overlays hosted as query-state over the pages above (not their own routes). */
export const teamAccessOverlays: { id: string; queryState: string; title: string; batch: number }[] = [
  { id: 'TEAM-S04+S19', queryState: '?drawer=invite&step=identity|scope|numbers|review', title: 'Invite / Edit / Onboard Member', batch: 1 },
  { id: 'TEAM-S09-S10', queryState: '?drawer=access&numberId=…', title: 'Number Access', batch: 2 },
  { id: 'TEAM-S15', queryState: '?modal=redistribute | ?modal=transfer', title: 'Transfer / Bulk Reassignment', batch: 3 },
  { id: 'TEAM-S11-availability', queryState: '?drawer=availability&memberId=…', title: 'Change availability / capacity', batch: 3 },
  { id: 'TEAM-S17', queryState: '?drawer=detail&subject=…', title: 'Performance Detail', batch: 5 },
  { id: 'TEAM-S20', queryState: '?wizard=exit&step=…', title: 'Employee Exit & Work Transfer', batch: 5 },
  { id: 'TEAM-audit-event', queryState: '?drawer=event&eventId=…', title: 'Audit Event Detail', batch: 5 },
  { id: 'TEAM-audit-export', queryState: '?modal=export', title: 'Audit Export', batch: 5 },
];

/** Roles & Permissions — Settings-owned (mounted at /settings/team/*). */
export const teamRoleSettingsScreens: TeamAccessScreen[] = [
  {
    id: 'TSET-S01',
    path: '/settings/team/roles',
    title: 'Roles',
    surface: 'settings',
    purpose: 'Standard/custom role directory with user count, scope, risk and last changed.',
    batch: 4,
  },
  {
    id: 'TSET-S02',
    path: '/settings/team/roles/:roleId',
    title: 'Role Detail',
    surface: 'settings',
    purpose: 'Grouped Module Actions, Record Scope, Data Protection, Effective Users, Change Impact.',
    batch: 4,
  },
];

/** Assignment Rules — Settings-owned (mounted at /settings/routing). */
export const routingSettingsScreens: TeamAccessScreen[] = [
  {
    id: 'TSET-S05',
    path: '/settings/routing',
    title: 'Assignment Rules',
    surface: 'settings',
    purpose: 'Ordered rule list plus create/edit wizard with simulation trace.',
    batch: 4,
  },
];

/** Every screen that owns a real route (Batch 0 route audit + coverage doc). */
export const allTeamAccessRoutes: TeamAccessScreen[] = [
  ...teamAccessPages,
  ...teamRoleSettingsScreens,
  ...routingSettingsScreens,
];
