import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { WidgetShell } from '@crm/design-system';
import type { InboxSnapshot } from '@crm/mock-data';

export interface InboxSnapshotWidgetProps {
  snapshot: InboxSnapshot;
}

/** DASH-S01 §7 row 6 (right half) — Inbox unread/pending/unassigned/SLA breach. */
export function InboxSnapshotWidget({ snapshot }: InboxSnapshotWidgetProps) {
  const scopedHref = useScopedHref();

  const rows = [
    { label: 'Unread', value: snapshot.unread, status: undefined },
    { label: 'Pending reply', value: snapshot.pendingReply, status: undefined },
    { label: 'Unassigned', value: snapshot.unassigned, status: 'unassigned' },
    { label: 'SLA breach', value: snapshot.slaBreach, status: 'sla-breach' },
  ];

  return (
    <WidgetShell title="Inbox" icon={<MessageSquare />} footerTo={scopedHref('/inbox')} footerLabel="Open Inbox">
      <div className="crm-dash-metric-row">
        {rows.map((row) => (
          <Link
            key={row.label}
            to={row.status ? scopedHref('/inbox', { status: row.status }) : scopedHref('/inbox')}
            className="crm-dash-metric"
          >
            <span className="crm-dash-metric__value">{row.value}</span>
            <span className="crm-dash-metric__label">{row.label}</span>
          </Link>
        ))}
      </div>
    </WidgetShell>
  );
}
