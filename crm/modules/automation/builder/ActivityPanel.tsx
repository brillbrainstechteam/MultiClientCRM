import { Download, X } from 'lucide-react';
import { Button, IconButton } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import type { FlowAuditEvent } from '../domain/types';

const actionLabel: Record<FlowAuditEvent['action'], string> = {
  created: 'Created',
  edited: 'Edited',
  tested: 'Tested',
  published: 'Published',
  paused: 'Paused',
  resumed: 'Resumed',
  rolled_back: 'Rolled back',
  archived: 'Archived',
  cloned: 'Cloned',
  deleted: 'Deleted',
  sent_for_approval: 'Sent for approval',
  approved: 'Approved',
  changes_requested: 'Changes requested',
};

/** Builder Activity / Audit panel (spec §16) — not a standalone audit app. */
export function ActivityPanel({
  events,
  canExport,
  onExport,
  onClose,
}: {
  events: FlowAuditEvent[];
  canExport: boolean;
  onExport: () => void;
  onClose: () => void;
}) {
  const ordered = [...events].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="crm-aut-nodeconfig">
      <header className="crm-aut-nodeconfig__header">
        <div className="crm-aut-nodeconfig__heading">
          <p className="crm-aut-nodeconfig__type">Activity</p>
          <p className="crm-aut-trigger__title">{events.length} event{events.length === 1 ? '' : 's'}</p>
        </div>
        <IconButton label="Close panel" icon={<X />} size="sm" onClick={onClose} />
      </header>

      <div className="crm-aut-nodeconfig__body">
        {canExport ? (
          <Button variant="ghost" size="sm" iconLeft={<Download />} onClick={onExport}>
            Export Audit
          </Button>
        ) : null}
        <ol className="crm-aut-activity__list">
          {ordered.map((event) => (
            <li key={event.id} className="crm-aut-activity__item">
              <p className="crm-aut-activity__headline">
                <strong>{findUser(event.actorId)?.name ?? event.actorId}</strong> {actionLabel[event.action].toLowerCase()}
              </p>
              <p className="crm-aut-activity__detail">{event.detail}</p>
              <p className="crm-aut-activity__meta">{formatDateTime(event.at)}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
