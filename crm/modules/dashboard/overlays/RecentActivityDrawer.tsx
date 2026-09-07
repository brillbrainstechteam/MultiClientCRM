import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Drawer, EmptyState } from '@crm/design-system';
import { findUser, DASHBOARD_REFERENCE_NOW } from '@crm/mock-data';
import { formatRelativeTime, moduleIcon, moduleLabel } from '../dashboard-presentation';
import { scopedActivity } from '../dashboard-selectors';

/** DASH-S11 — Recent Activity, the full feed (Overview only teases the top few). */
export function RecentActivityDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get('drawer') === 'recent-activity';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      return next;
    });

  if (!open) return null;

  const activity = scopedActivity();

  return (
    <Drawer open={open} onClose={close} title="Recent activity" subtitle="Every recorded action across the workspace">
      {activity.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <ul className="crm-activity-feed__list">
          {activity.map((item) => {
            const Icon = moduleIcon[item.module];
            const actor = item.actorId ? findUser(item.actorId)?.name : 'System';
            return (
              <li key={item.id}>
                <Link to={item.entityTo} className="crm-activity-feed__row" onClick={close}>
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
      )}
    </Drawer>
  );
}
