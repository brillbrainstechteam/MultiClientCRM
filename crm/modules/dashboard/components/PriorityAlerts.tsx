import { AlertTriangle, ChevronRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';
import { useDashboardHref } from '../dashboard-links';
import type { PriorityAlert } from '../dashboard-selectors';
import type { DashboardSeverity } from '@crm/mock-data';

/** Red only for critical; amber for every other warning (per brief). */
const severityTone: Record<DashboardSeverity, BadgeTone> = {
  critical: 'danger',
  high: 'warning',
  medium: 'warning',
  low: 'neutral',
};
const severityLabel: Record<DashboardSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Warning',
  low: 'Low',
};

export interface PriorityAlertsProps {
  alerts: PriorityAlert[];
  totalOpen: number;
  viewAllTo: string;
}

/**
 * Compact "Needs attention" — at most four combined priority alerts. Replaces
 * the previous eight large alert cards. Each row states priority, issue,
 * affected area, count and a single clear action.
 */
export function PriorityAlerts({ alerts, totalOpen, viewAllTo }: PriorityAlertsProps) {
  const navigate = useNavigate();
  const dashHref = useDashboardHref();

  if (alerts.length === 0) {
    return (
      <div className="crm-priority crm-priority--clear">
        <span className="crm-priority__clear-icon" aria-hidden="true">
          <ShieldCheck />
        </span>
        <div>
          <p className="crm-priority__clear-title">Nothing needs attention right now</p>
          <p className="crm-priority__clear-desc">No open alerts in the current scope.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(dashHref(viewAllTo))}>
          View all alerts
        </Button>
      </div>
    );
  }

  return (
    <div className="crm-priority">
      <ul className="crm-priority__list">
        {alerts.map((alert) => (
          <li key={alert.id} className={`crm-priority__row crm-priority__row--${severityTone[alert.severity]}`}>
            <span className="crm-priority__icon" aria-hidden="true">
              <AlertTriangle />
            </span>
            <div className="crm-priority__text">
              <div className="crm-priority__title-line">
                <Badge tone={severityTone[alert.severity]}>{severityLabel[alert.severity]}</Badge>
                <span className="crm-priority__title">{alert.title}</span>
              </div>
              <span className="crm-priority__meta">
                {alert.affectedEntity}
                {alert.count > 0 ? ` · ${alert.count} affected` : ''}
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate(dashHref(alert.ctaTo))}>
              {alert.ctaLabel}
            </Button>
          </li>
        ))}
      </ul>
      <button className="crm-priority__viewall" onClick={() => navigate(dashHref(viewAllTo))}>
        View all alerts{totalOpen > alerts.length ? ` (${totalOpen})` : ''}
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}
