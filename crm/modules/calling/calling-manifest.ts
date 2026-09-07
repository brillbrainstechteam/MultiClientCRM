/**
 * Calling screen/route manifest — the audit source of truth for Batch 6 and
 * for `docs/figma/calling-capture-manifest.md`. Mirrors the Contacts module's
 * manifest pattern (one row per CALL-S/W id).
 */

export type CallingSurface = 'page' | 'drawer' | 'modal' | 'wizard-step' | 'inline' | 'handoff';

export interface CallingScreen {
  id: string;
  path: string;
  title: string;
  surface: CallingSurface;
  purpose: string;
  batch: number;
}

export const callingPages: CallingScreen[] = [
  {
    id: 'CALL-S01',
    path: '/calling',
    title: 'Call Desk',
    surface: 'page',
    purpose: 'Lightweight daily entry: summary strip, my next calls, urgent attention, Start Calling.',
    batch: 1,
  },
  {
    id: 'CALL-S02',
    path: '/calling/queue',
    title: 'Call Queue',
    surface: 'page',
    purpose: 'One queue with saved views, compact rows, search/filter/sort and bulk actions.',
    batch: 1,
  },
  {
    id: 'CALL-S03',
    path: '/calling/task/:taskId',
    title: 'Call Workspace',
    surface: 'page',
    purpose: 'Single-customer calling workspace: snapshot, why-calling, talking points, sticky actions.',
    batch: 2,
  },
  {
    id: 'CALL-S06',
    path: '/calling/history',
    title: 'Call History',
    surface: 'page',
    purpose: 'Searchable call-attempt history with filters and the Call Record drawer.',
    batch: 3,
  },
  {
    id: 'CALL-S08',
    path: '/calling/lists',
    title: 'Call Lists',
    surface: 'page',
    purpose: 'Managed batches of calling work — Active/Paused/Completed/Closed tabs.',
    batch: 4,
  },
  {
    id: 'CALL-S09',
    path: '/calling/lists/:listId',
    title: 'Call List Detail',
    surface: 'page',
    purpose: 'List identity, KPI strip, customer-level progress table, pause/resume/close.',
    batch: 4,
  },
  {
    id: 'CALL-W01-W03',
    path: '/calling/lists/new',
    title: 'Create Call List',
    surface: 'page',
    purpose: 'Audience → Assignment → Review wizard for creating a call list.',
    batch: 4,
  },
  {
    id: 'CALL-S14',
    path: '/calling/analytics',
    title: 'Calling Analytics',
    surface: 'page',
    purpose: 'Operational metrics first: attempted, connected, completed, follow-ups, conversion.',
    batch: 5,
  },
];

export const callingOverlays: { id: string; queryState: string; title: string; batch: number }[] = [
  { id: 'CALL-S04', queryState: '?drawer=outcome', title: 'Log Outcome', batch: 2 },
  { id: 'CALL-S05', queryState: '?drawer=follow-up', title: 'Follow-Up', batch: 2 },
  { id: 'CALL-S07', queryState: '?drawer=record&attemptId=…', title: 'Call Record', batch: 3 },
  { id: 'CALL-S10', queryState: '?modal=bulk-assign', title: 'Bulk Assignment', batch: 4 },
  { id: 'CALL-S11', queryState: '?drawer=preview&taskId=…', title: 'Quick Customer Preview', batch: 1 },
  { id: 'CALL-S12', queryState: 'handoff to /inbox', title: 'WhatsApp Handoff', batch: 2 },
  { id: 'CALL-S13', queryState: 'inline post-outcome card', title: 'Recommended Next Action', batch: 2 },
];

export const callingDeferred: { id: string; reason: string }[] = [
  { id: 'CALL-S15', reason: 'Cost & Usage — provider-dependent; represented as an analytics state only.' },
  { id: 'CALL-S16', reason: 'Incoming Call Pop — Phase 2 inbound telephony event.' },
  { id: 'CALL-S17', reason: 'Unknown Caller — Phase 2 inbound dependency.' },
  { id: 'CALL-S18', reason: 'Missed Call / Callback automation — represented as a disabled queue view only.' },
  { id: 'CALL-S19', reason: 'Recording / Transcript — Phase 2/3, unresolved consent/retention.' },
  { id: 'CALL-S20', reason: 'AI Receptionist Activity — advanced optional.' },
  { id: 'CALL-CFG-S01–S05', reason: 'Telephony/Voice AI configuration — Settings-owned.' },
  { id: 'CALL-CFG-W01', reason: 'Provider connect wizard — Settings-owned.' },
];

/** Every screen that owns a real route (Batch 0 route audit). */
export const allCallingRoutes: CallingScreen[] = callingPages;
