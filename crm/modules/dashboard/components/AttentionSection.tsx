import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { AttentionCard, Button } from '@crm/design-system';
import type { DashboardAlert } from '@crm/mock-data';
import { alertCategoryIcon, severityToAttentionTone } from '../dashboard-presentation';

export interface AttentionSectionProps {
  alerts: DashboardAlert[];
}

/**
 * DASH-S01 §7 row 3 — Attention Needed. Every card drills into DASH-S03 (alert
 * detail) which then hands off to the exact owning-module record/setting.
 * When nothing is open, shows the required positive/no-action state instead
 * of collapsing the region entirely (§10).
 */
export function AttentionSection({ alerts }: AttentionSectionProps) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  if (alerts.length === 0) {
    return (
      <div className="crm-attention-positive">
        <span className="crm-attention-positive__icon" aria-hidden="true">
          <ShieldCheck />
        </span>
        <div>
          <p className="crm-attention-positive__title">Nothing needs attention right now</p>
          <p className="crm-attention-positive__description">
            No open alerts in the current scope. New issues will appear here immediately.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref('/dashboard/alerts'))}>
          View alert history
        </Button>
      </div>
    );
  }

  return (
    <div className="crm-attention-grid">
      {alerts.map((alert) => (
        <AttentionCard
          key={alert.id}
          title={alert.title}
          count={alert.count}
          description={alert.affectedEntity}
          icon={<AlertIcon alert={alert} />}
          tone={severityToAttentionTone(alert.severity)}
          to={scopedHref('/dashboard', { drawer: 'alert', alertId: alert.id })}
          actionLabel="Review"
        />
      ))}
    </div>
  );
}

function AlertIcon({ alert }: { alert: DashboardAlert }) {
  const Icon = alertCategoryIcon[alert.category];
  return <Icon aria-hidden="true" />;
}
