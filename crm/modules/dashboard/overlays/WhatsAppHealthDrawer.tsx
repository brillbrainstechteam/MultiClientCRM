import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, Drawer, PermissionRestricted, StatusBadge } from '@crm/design-system';
import { findWhatsAppNumber } from '@crm/mock-data';
import { useAlertStatus } from '../alert-status-context';
import { connectionLabel, connectionTone, qualityLabel, qualityTone } from '../dashboard-presentation';
import { numberAlerts } from '../dashboard-selectors';

/**
 * DASH-S05 — WhatsApp Number Health. Connection, quality, capacity and any
 * open alerts for one number, with reconnect/settings/affected-chats actions.
 *
 * A number outside the acting user's permitted scope (stale bookmark, role
 * switched after the link was shared) renders the Restricted state instead
 * of leaking its health data (DASHBOARD_GENERATION_SPEC.md §10).
 */
export function WhatsAppHealthDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { overrides } = useAlertStatus();
  const { availableWhatsAppNumbers } = useWorkspace();

  const open = searchParams.get('drawer') === 'wa-health';
  const numberId = searchParams.get('whatsappNumberId');
  const number = numberId ? findWhatsAppNumber(numberId) : undefined;
  const permitted = number ? availableWhatsAppNumbers.some((n) => n.id === number.id) : false;

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'whatsappNumberId']) next.delete(key);
      return next;
    });

  if (!open || !number) return null;

  if (!permitted) {
    return (
      <Drawer open={open} onClose={close} title="WhatsApp number health">
        <PermissionRestricted
          title="You do not have access to this number"
          description="This number is outside your current role or branch scope. Ask a workspace owner if you need access."
        />
      </Drawer>
    );
  }

  const alerts = numberAlerts(number.id, overrides);

  return (
    <Drawer
      open={open}
      onClose={close}
      title={number.displayName}
      subtitle={`${number.brand} · ${number.department}`}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(scopedHref('/inbox', { whatsappNumberId: number.id }))}
          >
            View affected chats
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate(scopedHref(`/settings/whatsapp/numbers/${number.id}`))}
          >
            {number.connectionStatus === 'disconnected' ? 'Reconnect' : 'Open in Settings'}
          </Button>
        </>
      }
    >
      <div className="crm-wa-health-drawer">
        <dl className="crm-wa-health-drawer__facts">
          <div>
            <dt>Connection</dt>
            <dd>
              <StatusBadge tone={connectionTone[number.connectionStatus]}>
                {connectionLabel[number.connectionStatus]}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt>Quality rating</dt>
            <dd>
              <Badge tone={qualityTone[number.qualityRating]}>{qualityLabel[number.qualityRating]}</Badge>
            </dd>
          </div>
          <div>
            <dt>Messaging limit</dt>
            <dd>{number.messagingLimit}</dd>
          </div>
          <div>
            <dt>Brand</dt>
            <dd>{number.brand}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{number.department}</dd>
          </div>
          <div>
            <dt>Roles with access</dt>
            <dd>{number.permittedRoles.join(', ')}</dd>
          </div>
        </dl>

        <section>
          <h3 className="crm-wa-health-drawer__section-title">
            Open alerts {alerts.length > 0 ? `(${alerts.length})` : ''}
          </h3>
          {alerts.length === 0 ? (
            <p className="crm-wa-health-drawer__muted">No open alerts for this number.</p>
          ) : (
            <ul className="crm-wa-health-drawer__alerts">
              {alerts.map((alert) => (
                <li key={alert.id}>{alert.title}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}
