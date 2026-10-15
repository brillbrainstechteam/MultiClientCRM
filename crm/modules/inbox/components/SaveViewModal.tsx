import { useState } from 'react';
import { Button, Input, Modal, Select } from '@crm/design-system';
import type { InboxFilterState, QuickViewKey } from '../inbox-types';

/**
 * Name and keep the list you are looking at.
 *
 * The summary matters as much as the name field: a view saved from a list the
 * operator had half-forgotten the shape of is a view that returns surprising
 * results next week. Showing what is about to be saved, in words, is what makes
 * "hot leads waiting over a day" trustworthy a month later.
 */
export function SaveViewModal({
  open, onClose, onSave, view, filters, canShare,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (input: { name: string; scope: 'personal' | 'workspace'; isPinned: boolean }) =>
    Promise<{ ok: true } | { ok: false; error: string }>;
  view: QuickViewKey;
  filters: InboxFilterState;
  canShare: boolean;
}) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'personal' | 'workspace'>('personal');
  const [isPinned, setIsPinned] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const summary = describeFilters(view, filters);

  const submit = async () => {
    if (!name.trim()) { setError('Give the view a name.'); return; }
    setBusy(true); setError('');
    try {
      const r = await onSave({ name: name.trim(), scope, isPinned });
      if (!r.ok) { setError(r.error); return; }
      setName('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save this view"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Saving…' : 'Save view'}
          </Button>
        </>
      }
    >
      <div className="crm-saveview">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hot leads waiting over a day"
          hint="What you would call this list out loud."
        />

        {/* What is actually being saved, in words. */}
        <div className="crm-saveview__summary">
          <span className="crm-saveview__summary-label">This view shows</span>
          <ul className="crm-saveview__list">
            {summary.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>

        <Select
          label="Who can see it"
          value={scope}
          onChange={(e) => setScope(e.target.value as 'personal' | 'workspace')}
          options={[
            { value: 'personal', label: 'Only me' },
            { value: 'workspace', label: 'Everyone on the team', disabled: !canShare },
          ]}
          hint={canShare ? undefined : 'Only a manager or admin can share a view with the team.'}
        />

        {scope === 'workspace' ? (
          <label className="crm-saveview__pin">
            <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
            Show it beside the other queues
          </label>
        ) : null}

        {error ? <p className="crm-saveview__error">{error}</p> : null}
      </div>
    </Modal>
  );
}

const VIEW_LABEL: Partial<Record<QuickViewKey, string>> = {
  all: 'All chats', mine: 'Chats assigned to me', unassigned: 'Unassigned chats',
  'needs-reply': 'Chats needing a reply', pending: 'Pending chats', unread: 'Unread chats',
  overdue: 'Overdue chats', 'sla-breached': 'Chats past their SLA', resolved: 'Resolved chats',
  'new-leads': 'New leads', 'ad-leads': 'Leads from ads', 'campaign-replies': 'Campaign replies',
  'missed-calls': 'Chats with a missed call', favourites: 'Favourites',
  'window-closed': 'Chats where the reply window has closed',
};

/** Describe the saved list in the words an operator would use. */
function describeFilters(view: QuickViewKey, f: InboxFilterState): string[] {
  const lines: string[] = [VIEW_LABEL[view] ?? 'All chats'];

  if (f.unreadOnly) lines.push('that are unread');
  if (f.favouritesOnly) lines.push('that I starred');
  if (f.newLeadsOnly) lines.push('from leads nobody has worked yet');
  if (f.campaignRepliesOnly) lines.push('that replied to a campaign');
  if (f.adLeadsOnly) lines.push('that came from an ad');
  if (f.missedCallsOnly) lines.push('where a call went unanswered');
  if (f.windowClosedOnly) lines.push('where only a template will deliver');

  if (f.waitingLongerThanMinutes != null) {
    const mins = f.waitingLongerThanMinutes;
    const pretty = mins >= 1440
      ? `${Math.round(mins / 1440)} day${mins >= 2880 ? 's' : ''}`
      : mins >= 60 ? `${Math.round(mins / 60)} hour${mins >= 120 ? 's' : ''}` : `${mins} minutes`;
    lines.push(`waiting on us for more than ${pretty}`);
  }

  if (f.statuses.length) lines.push(`with status ${f.statuses.join(' or ')}`);
  if (f.labelIds.length) lines.push(`labelled ${f.labelIds.length === 1 ? 'one label' : `${f.labelIds.length} labels`}`);
  if (f.assigneeIds.length) lines.push(`assigned to ${f.assigneeIds.length} person(s)`);
  if (f.dateFrom || f.dateTo) lines.push('within a date range');

  return lines;
}
