import { Badge } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import { useAuditEvents } from '../ai-agents-store';
import type { AuditActionKind } from '../domain/types';

const actionTone: Partial<Record<AuditActionKind, 'success' | 'warning' | 'danger' | 'info' | 'neutral'>> = {
  activated: 'success',
  paused: 'warning',
  deactivated: 'neutral',
  rollback: 'warning',
  'approval-rejected': 'danger',
  'correction-approved': 'success',
  'correction-rejected': 'danger',
  handover: 'info',
  'approval-requested': 'info',
  'approval-granted': 'success',
};

/** AIA-S02 Activity/Audit tab — one shared timeline (SKILL.md "Audit": do not build a separate audit app). */
export function ActivityPanel({ agentId }: { agentId: string }) {
  const events = useAuditEvents(agentId);

  if (events.length === 0) {
    return <p className="crm-aia__muted">No activity recorded yet.</p>;
  }

  return (
    <ul className="crm-aia__picker-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {events.map((event) => (
        <li key={event.id} className="crm-aia__source-row">
          <div className="crm-aia__source-main">
            <span className="crm-aia__source-name">{event.detail}</span>
            <span className="crm-aia__source-meta">
              {event.actorId ? findUser(event.actorId)?.name ?? event.actorId : 'AI Agent'} · {new Date(event.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {event.sourceRefs && event.sourceRefs.length > 0 ? ` · Sources: ${event.sourceRefs.join(', ')}` : ''}
            </span>
          </div>
          <Badge tone={actionTone[event.action] ?? 'neutral'} appearance="outline">{event.action.replace(/-/g, ' ')}</Badge>
        </li>
      ))}
    </ul>
  );
}
