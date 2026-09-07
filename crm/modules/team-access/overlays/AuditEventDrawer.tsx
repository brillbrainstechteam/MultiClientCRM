import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, Drawer } from '@crm/design-system';
import { findAuditEvent } from '../team-access-mock-data';
import { eventTypeLabel } from '../screens/AuditScreen';

/** Audit event detail drawer (`?drawer=event&eventId=…`). Sensitive values stay masked for non-Owner roles. */
export function AuditEventDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useWorkspace();
  const open = searchParams.get('drawer') === 'event' && Boolean(searchParams.get('eventId'));
  const eventId = searchParams.get('eventId') ?? '';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'eventId']) next.delete(key);
      return next;
    });

  const openRelated = (relatedId: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('eventId', relatedId);
      return next;
    });

  if (!open) return null;

  const event = findAuditEvent(eventId);
  if (!event) return null;

  const masked = event.sensitive && role !== 'owner';

  return (
    <Drawer open title={event.targetLabel} subtitle={eventTypeLabel[event.type]} onClose={close} footer={<Button variant="secondary" onClick={close}>Close</Button>}>
      <div className="crm-audit-event">
        <div className="crm-audit-event__row"><span>Timestamp</span><span>{new Date(event.timestamp).toLocaleString('en-IN')}</span></div>
        <div className="crm-audit-event__row"><span>Actor</span><span>{event.actorName}</span></div>
        <div className="crm-audit-event__row"><span>Target</span><span>{event.targetLabel} ({event.targetType})</span></div>

        {masked ? (
          <Badge tone="warning">Before/after and source detail are masked for your role</Badge>
        ) : (
          <>
            {event.before !== null || event.after !== null ? (
              <div className="crm-audit-event__diff">
                <div className="crm-audit-event__diff-col"><strong>Before</strong><span>{event.before ?? '—'}</span></div>
                <div className="crm-audit-event__diff-col"><strong>After</strong><span>{event.after ?? '—'}</span></div>
              </div>
            ) : null}
            {event.reason ? <div className="crm-audit-event__row"><span>Reason</span><span>{event.reason}</span></div> : null}
            {event.sourceIp ? <div className="crm-audit-event__row"><span>Source</span><span>{event.sourceIp} · {event.sessionLabel}</span></div> : null}
          </>
        )}

        {event.relatedEventIds.length > 0 ? (
          <div className="crm-audit-event__related">
            <strong>Related events</strong>
            {event.relatedEventIds.map((id) => (
              <Button key={id} variant="ghost" size="sm" onClick={() => openRelated(id)}>
                {id}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
