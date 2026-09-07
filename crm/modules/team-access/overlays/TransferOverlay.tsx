import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Drawer, Select, Textarea, Toast } from '@crm/design-system';
import { resolveEligibility } from '../resolvers';
import {
  escalations,
  fallbackQueues,
  findMember,
  findWorkload,
  teamMembers,
  teamRecords,
  transferBatches,
} from '../team-access-mock-data';
import type { TransferEntityType, TransferGroupCount, TransferOwnershipMode } from '../team-access-types';

const entityLabel: Record<TransferEntityType, string> = {
  conversation: 'Conversations',
  contact: 'Contacts',
  company: 'Companies',
  call: 'Calls',
  task: 'Tasks',
  follow_up: 'Follow-ups',
};

function groupsFromMembers(memberIds: string[], includeOwnership: boolean): TransferGroupCount[] {
  const workloads = memberIds.map((id) => findWorkload(id)).filter((w): w is NonNullable<typeof w> => Boolean(w));
  const groups: TransferGroupCount[] = [
    { entityType: 'conversation', count: workloads.reduce((s, w) => s + w.openConversations, 0) },
    { entityType: 'call', count: workloads.reduce((s, w) => s + w.callsDue + w.callsOverdue, 0) },
    { entityType: 'task', count: workloads.reduce((s, w) => s + w.tasksOpen + w.followUpsOpen, 0) },
  ];
  if (includeOwnership) {
    groups.push({ entityType: 'contact', count: workloads.reduce((s, w) => s + w.ownedContacts, 0) });
  }
  return groups.filter((g) => g.count > 0);
}

/**
 * TEAM-S15 — reusable Transfer / Bulk Reassignment overlay. Opened from
 * Workload (`?modal=redistribute&memberIds=`), Escalations
 * (`?modal=transfer&issue=`) or a Queue (`?modal=transfer&queue=`). Never
 * silently changes Contact Owner — ownership transfer is an explicit choice.
 */
export function TransferOverlay() {
  const [searchParams, setSearchParams] = useSearchParams();
  const modal = searchParams.get('modal');
  const open = modal === 'redistribute' || modal === 'transfer';

  const memberIds = (searchParams.get('memberIds') ?? '').split(',').filter(Boolean);
  const issueId = searchParams.get('issue');
  const queueId = searchParams.get('queue');
  const forcedState = searchParams.get('state');

  const [recipientType, setRecipientType] = useState<'user' | 'team' | 'queue'>('user');
  const [recipientId, setRecipientId] = useState('');
  const [ownershipMode, setOwnershipMode] = useState<TransferOwnershipMode>('current_work_only');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['modal', 'memberIds', 'issue', 'queue', 'state']) next.delete(key);
      return next;
    });

  if (!open) return null;

  const escalation = issueId ? escalations.find((e) => e.id === issueId) : undefined;
  const queue = queueId ? fallbackQueues.find((q) => q.id === queueId) : undefined;

  const groups: TransferGroupCount[] = escalation
    ? [{ entityType: 'conversation', count: 1 }]
    : queue
      ? [{ entityType: 'conversation', count: queue.waiting }]
      : groupsFromMembers(memberIds, ownershipMode === 'current_work_and_ownership');

  const sourceLabel = escalation
    ? escalation.contactName
    : queue
      ? queue.name
      : memberIds.map((id) => findMember(id)?.name ?? id).join(', ') || 'Selected work';

  const recipientOptions =
    recipientType === 'user'
      ? teamMembers.filter((m) => m.employmentStatus === 'active').map((m) => ({ value: m.id, label: m.name }))
      : recipientType === 'team'
        ? teamRecords.map((t) => ({ value: t.id, label: t.id }))
        : fallbackQueues.map((q) => ({ value: q.id, label: q.name }));

  const eligibility = recipientType === 'user' && recipientId ? resolveEligibility(recipientId, {}) : null;

  const usingPartialFixture = forcedState === 'partial' || (memberIds.length === 1 && memberIds[0] === 'member_rohan');
  const fixtureResult = transferBatches[0];

  if (submitted) {
    const results = usingPartialFixture
      ? fixtureResult.results
      : groups.map((g) => ({ entityType: g.entityType, succeeded: g.count, failed: 0, skipped: 0, reasons: [] as string[] }));
    const anyFailed = results.some((r) => r.failed > 0);

    return (
      <>
        <Drawer
          open
          title="Transfer result"
          onClose={close}
          width="wide"
          footer={<Button variant="secondary" onClick={close}>Close</Button>}
        >
          <div className="crm-transfer">
            <Badge tone={anyFailed ? 'warning' : 'success'}>{anyFailed ? 'Completed with some failures' : 'Transfer completed'}</Badge>
            {results.map((r) => (
              <div key={r.entityType} className="crm-transfer__result-row">
                <span>{entityLabel[r.entityType]}</span>
                <span>
                  {r.succeeded} succeeded{r.failed ? `, ${r.failed} failed` : ''}{r.skipped ? `, ${r.skipped} skipped` : ''}
                </span>
              </div>
            ))}
            {results.flatMap((r) => r.reasons).map((reason) => (
              <p key={reason} className="crm-transfer__preflight">{reason}</p>
            ))}
            {anyFailed ? (
              <Button variant="secondary" size="sm" onClick={() => setToast('Retry queued for failed items.')}>
                Retry failed items
              </Button>
            ) : null}
          </div>
        </Drawer>
        {toast ? <Toast tone="info" message={toast} onDismiss={() => setToast(null)} /> : null}
      </>
    );
  }

  return (
    <Drawer
      open
      title="Transfer work"
      subtitle={`From: ${sourceLabel}`}
      onClose={close}
      width="wide"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!recipientId} onClick={() => setSubmitted(true)}>
            Transfer
          </Button>
        </>
      }
    >
      <div className="crm-transfer">
        <div className="crm-transfer__groups">
          <strong>Selected work</strong>
          {groups.length === 0 ? <span>No open work found.</span> : null}
          {groups.map((g) => (
            <div key={g.entityType} className="crm-transfer__group-row">
              <span>{entityLabel[g.entityType]}</span>
              <span>{g.count}</span>
            </div>
          ))}
        </div>

        <Select
          label="Recipient type"
          options={[
            { value: 'user', label: 'User' },
            { value: 'team', label: 'Team' },
            { value: 'queue', label: 'Fallback queue' },
          ]}
          value={recipientType}
          onChange={(e) => {
            setRecipientType(e.target.value as typeof recipientType);
            setRecipientId('');
          }}
        />
        <Select
          label="Recipient"
          options={[{ value: '', label: 'Choose…' }, ...recipientOptions]}
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
        />

        {eligibility && !eligibility.eligible ? (
          <div className="crm-transfer__preflight">
            <Badge tone="warning">Capacity/eligibility warning</Badge>
            {eligibility.reasons.map((r) => (
              <span key={r}>{r}</span>
            ))}
          </div>
        ) : null}

        <Select
          label="Ownership"
          options={[
            { value: 'current_work_only', label: 'Transfer current work only — Contact Owner stays the same' },
            { value: 'current_work_and_ownership', label: 'Transfer current work and permanent ownership' },
          ]}
          value={ownershipMode}
          onChange={(e) => setOwnershipMode(e.target.value as TransferOwnershipMode)}
        />

        <Textarea label="Handover note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Context for the receiving person or team (optional but recommended)." />
      </div>
    </Drawer>
  );
}
