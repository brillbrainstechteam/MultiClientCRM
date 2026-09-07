import type { SavedQueueView } from '../domain';

/**
 * Queue saved views (CODE_FIRST_ADAPTER.md §3 — one Queue screen, not
 * separate pages). New Leads / High Value / Event-Festival live here rather
 * than as Call Desk cards (SIMPLIFICATION_DECISIONS.md).
 */
export const savedQueueViews: SavedQueueView[] = [
  { id: 'my-calls', label: 'My Calls', description: 'Everything assigned to you.' },
  { id: 'today', label: 'Today', description: 'Due before the end of today.' },
  { id: 'follow-ups', label: 'Follow-Ups', description: 'Tasks created from a prior call outcome.' },
  { id: 'overdue', label: 'Overdue', description: 'Past due and not yet actioned.' },
  { id: 'new-leads', label: 'New Leads', description: 'First-touch enquiries.' },
  { id: 'high-value', label: 'High Value', description: 'High-tier or high-priority accounts.' },
  { id: 'event', label: 'Event / Festival', description: 'Seasonal or campaign-driven outreach.' },
  { id: 'unassigned', label: 'Unassigned', description: 'No call assignee yet.' },
  {
    id: 'callbacks',
    label: 'Callbacks',
    description: 'Missed-call callback automation — Phase 2.',
    phase2: true,
  },
];

export function findSavedView(id: string): SavedQueueView | undefined {
  return savedQueueViews.find((view) => view.id === id);
}
