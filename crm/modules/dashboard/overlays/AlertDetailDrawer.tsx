import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, Drawer } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import { alertCategoryLabel, severityToBadgeTone } from '../dashboard-presentation';
import { findDashboardAlert } from '../dashboard-selectors';

export interface AlertDetailDrawerProps {
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  statusOverride: Record<string, string>;
}

/**
 * DASH-S03 — Alert Detail. Issue, severity, impact, recommended action and the
 * exact owning-module CTA. Informational alerts never show a false "Resolve"
 * and critical/non-dismissible alerts never expose Dismiss (§8 DASH-S03).
 */
export function AlertDetailDrawer({ onAcknowledge, onDismiss, onResolve, statusOverride }: AlertDetailDrawerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const open = searchParams.get('drawer') === 'alert';
  const alertId = searchParams.get('alertId');
  const alert = alertId ? findDashboardAlert(alertId) : undefined;

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'alertId']) next.delete(key);
      return next;
    });

  if (!open || !alert) return null;

  const status = statusOverride[alert.id] ?? alert.status;
  const owner = alert.ownerId ? findUser(alert.ownerId) : undefined;

  return (
    <Drawer
      open={open}
      onClose={close}
      title={alert.title}
      subtitle={`${alertCategoryLabel[alert.category]} · ${alert.affectedEntity}`}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
          {alert.dismissible && status === 'open' ? (
            <Button variant="secondary" onClick={() => onDismiss(alert.id)}>
              Dismiss
            </Button>
          ) : null}
          {status === 'open' ? (
            <Button variant="secondary" onClick={() => onAcknowledge(alert.id)}>
              Acknowledge
            </Button>
          ) : null}
          {alert.resolvable && status !== 'resolved' ? (
            <Button variant="secondary" onClick={() => onResolve(alert.id)}>
              Mark resolved
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => navigate(scopedHref(alert.ctaTo))}>
            {alert.ctaLabel}
          </Button>
        </>
      }
    >
      <div className="crm-alert-detail">
        <div className="crm-alert-detail__badges">
          <Badge tone={severityToBadgeTone(alert.severity)}>{alert.severity}</Badge>
          <Badge tone="neutral" appearance="outline">
            {status}
          </Badge>
          {!alert.dismissible ? <Badge tone="danger">Persists until resolved</Badge> : null}
        </div>

        <p className="crm-alert-detail__description">{alert.description}</p>

        <dl className="crm-alert-detail__facts">
          <div>
            <dt>Detected</dt>
            <dd>{new Date(alert.detectedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
          </div>
          {owner ? (
            <div>
              <dt>Owner</dt>
              <dd>{owner.name}</dd>
            </div>
          ) : null}
        </dl>

        <section>
          <h3 className="crm-alert-detail__section-title">Business impact</h3>
          <p>{alert.businessImpact}</p>
        </section>

        <section>
          <h3 className="crm-alert-detail__section-title">Recommended action</h3>
          <p>{alert.recommendedAction}</p>
        </section>
      </div>
    </Drawer>
  );
}
