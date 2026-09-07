import { EmptyState } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import { formatDateTime } from '../../campaigns-labels';
import type { Campaign } from '../../domain/types';

/** Activity / audit tab — who did what, when (CODE_FIRST_ADAPTER.md §4 auditEvents). */
export function ActivityTab({ campaign }: { campaign: Campaign }) {
  if (campaign.auditEvents.length === 0) {
    return <EmptyState title="No activity yet" description="Actions taken on this campaign will appear here." />;
  }

  const events = [...campaign.auditEvents].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <ol className="crm-camp-activity-tab">
      {events.map((event) => (
        <li key={event.id} className="crm-camp-activity-tab__item">
          <div className="crm-camp-activity-tab__dot" aria-hidden="true" />
          <div>
            <p className="crm-camp-activity-tab__action">
              {event.action}
              <span className="crm-camp-activity-tab__actor"> · {event.actorId ? findUser(event.actorId)?.name ?? event.actorId : 'System'}</span>
            </p>
            {event.detail ? <p className="crm-camp-activity-tab__detail">{event.detail}</p> : null}
            <p className="crm-camp-activity-tab__time">{formatDateTime(event.at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
