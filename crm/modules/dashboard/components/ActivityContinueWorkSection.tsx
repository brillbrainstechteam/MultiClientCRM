import { History, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { WidgetShell } from '@crm/design-system';
import { findUser, type ActivityFeedItem, type ContinueWorkItem } from '@crm/mock-data';
import { DASHBOARD_REFERENCE_NOW } from '@crm/mock-data';
import { formatRelativeTime, moduleIcon, moduleLabel } from '../dashboard-presentation';

export interface ActivityContinueWorkSectionProps {
  activity: ActivityFeedItem[];
  continueWork: ContinueWorkItem[];
}

/** DASH-S01 §7 row 12 — Recent Activity + Continue Work, side by side. */
export function ActivityContinueWorkSection({ activity, continueWork }: ActivityContinueWorkSectionProps) {
  const scopedHref = useScopedHref();

  return (
    <div className="crm-dash-two-col">
      <WidgetShell
        title="Recent activity"
        icon={<History />}
        footerTo={scopedHref('/dashboard', { drawer: 'recent-activity' })}
        footerLabel="View all activity"
        state={activity.length === 0 ? 'empty' : undefined}
        stateTitle="No recent activity"
      >
        <ul className="crm-activity-feed__list">
          {activity.slice(0, 5).map((item) => {
            const Icon = moduleIcon[item.module];
            const actor = item.actorId ? findUser(item.actorId)?.name : 'System';
            return (
              <li key={item.id}>
                <Link to={item.entityTo} className="crm-activity-feed__row">
                  <span className="crm-activity-feed__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="crm-activity-feed__body">
                    <span className="crm-activity-feed__summary">{item.summary}</span>
                    <span className="crm-activity-feed__meta">
                      {actor} · {moduleLabel[item.module]} · {formatRelativeTime(item.at, DASHBOARD_REFERENCE_NOW)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </WidgetShell>

      <WidgetShell
        title="Continue work"
        icon={<ListTodo />}
        state={continueWork.length === 0 ? 'empty' : undefined}
        stateTitle="Nothing in progress"
        stateDescription="Drafts and pending items you started will show up here."
      >
        <ul className="crm-activity-feed__list">
          {continueWork.slice(0, 5).map((item) => (
            <li key={item.id}>
              <Link to={item.to} className="crm-activity-feed__row">
                <span className="crm-activity-feed__icon" aria-hidden="true">
                  {(() => {
                    const Icon = moduleIcon[item.module];
                    return <Icon />;
                  })()}
                </span>
                <span className="crm-activity-feed__body">
                  <span className="crm-activity-feed__summary">{item.title}</span>
                  <span className="crm-activity-feed__meta">
                    {item.status} · {formatRelativeTime(item.updatedAt, DASHBOARD_REFERENCE_NOW)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </WidgetShell>
    </div>
  );
}
