import { useMemo, useState } from 'react';
import { Download, Repeat, RotateCcw, Users } from 'lucide-react';
import { Badge, Button, DataTable, EmptyState, SearchField, Select, type Column } from '@crm/design-system';
import { recipientStatusLabel, recipientStatusTone, formatDateTime } from '../../campaigns-labels';
import type { Campaign, RecipientRecord, RecipientStatus } from '../../domain/types';

const statusOptions: { value: RecipientStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'failed', label: 'Failed' },
  { value: 'excluded', label: 'Excluded' },
];

function lastUpdate(recipient: RecipientRecord): string {
  const at = recipient.repliedAt ?? recipient.readAt ?? recipient.deliveredAt ?? recipient.sentAt;
  return at ? formatDateTime(at) : '—';
}

/**
 * Recipients tab — result table (BATCHES.md Batch 1), Recipient Detail
 * (CAM-DR02) and Export (CAM-M06) wired in Batch 5. Create Result Segment
 * (CAM-M07), Retry Failed (CAM-M08) and the Follow-up entry point are wired
 * in Batch 6 — all three read the active status filter as the "result" they
 * scope to, defaulting to every recipient when no filter is set.
 */
export function RecipientsTab({
  campaign,
  onOpenRecipient,
  onExport,
  canExport,
  onCreateSegment,
  canCreateSegment,
  onRetryFailed,
  canRetry,
  onCreateFollowUp,
  canCreateFollowUp,
}: {
  campaign: Campaign;
  onOpenRecipient: (recipientId: string) => void;
  onExport: () => void;
  canExport: boolean;
  onCreateSegment: (result: RecipientStatus | 'all') => void;
  canCreateSegment: boolean;
  onRetryFailed: () => void;
  canRetry: boolean;
  onCreateFollowUp: (result: RecipientStatus | 'all') => void;
  canCreateFollowUp: boolean;
}) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<RecipientStatus | ''>('');
  const failedCount = campaign.recipients.filter((r) => r.status === 'failed').length;

  const rows = useMemo(() => {
    return campaign.recipients.filter((r) => {
      if (status && r.status !== status) return false;
      if (q) {
        const haystack = `${r.name} ${r.mobile}`.toLowerCase();
        if (!haystack.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [campaign.recipients, q, status]);

  const columns: Column<RecipientRecord>[] = [
    {
      key: 'name',
      header: 'Recipient',
      render: (r) => (
        <div>
          <p className="crm-camp-recipients__name">{r.name}</p>
          <p className="crm-camp-recipients__mobile">{r.mobile}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={recipientStatusTone[r.status]}>{recipientStatusLabel[r.status]}</Badge> },
    {
      key: 'detail',
      header: 'Detail',
      render: (r) => {
        if (r.status === 'failed') return <span className="crm-camp-recipients__reason">{r.failureReason}</span>;
        if (r.status === 'excluded') return <span className="crm-camp-recipients__reason">{r.excludedReason}</span>;
        return <span className="crm-camp-recipients__muted">—</span>;
      },
    },
    { key: 'updated', header: 'Last update', align: 'right', render: (r) => <span className="crm-camp-recipients__muted">{lastUpdate(r)}</span> },
  ];

  return (
    <div className="crm-camp-recipients">
      <div className="crm-camp-recipients__toolbar">
        <SearchField label="Search recipients" placeholder="Search by name or mobile…" width="280px" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select label="Status" hideLabel size="sm" options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value as RecipientStatus | '')} />
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Download />}
          disabled={!canExport}
          title={canExport ? undefined : 'Your role cannot export campaign data.'}
          onClick={onExport}
        >
          Export
        </Button>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Users />}
          disabled={!canCreateSegment || campaign.recipients.length === 0}
          title={canCreateSegment ? undefined : 'Your role cannot create segments.'}
          onClick={() => onCreateSegment(status || 'all')}
        >
          Create Segment
        </Button>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<RotateCcw />}
          disabled={!canRetry || failedCount === 0}
          title={!canRetry ? 'Your role cannot retry failed sends.' : failedCount === 0 ? 'No failed recipients to retry.' : undefined}
          onClick={onRetryFailed}
        >
          Retry Failed
        </Button>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Repeat />}
          disabled={!canCreateFollowUp || campaign.recipients.length === 0}
          title={canCreateFollowUp ? undefined : 'Your role cannot create campaigns.'}
          onClick={() => onCreateFollowUp(status || 'all')}
        >
          Follow-up
        </Button>
      </div>

      <DataTable
        caption="Recipients"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => onOpenRecipient(r.id)}
        emptyState={
          <EmptyState
            title={campaign.recipients.length === 0 ? 'No recipients yet' : 'No recipients match these filters'}
            description={
              campaign.recipients.length === 0
                ? 'Recipient results appear once this campaign starts sending.'
                : 'Try a different search or status filter.'
            }
          />
        }
      />
      <p className="crm-camp-recipients__count">{rows.length} of {campaign.recipients.length} shown</p>
    </div>
  );
}
