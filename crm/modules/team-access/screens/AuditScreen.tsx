import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@crm/components';
import { Badge, DataTable, EmptyState, LoadingSkeleton, Select, type Column } from '@crm/design-system';
import { users } from '@crm/mock-data';
import type { AuditEventType } from '../team-access-types';

// Retained for AuditEventDrawer (HR-event labels), even though the live audit
// trail below uses the operational action strings from /api/crm/audit.
const eventTypeLabel: Record<AuditEventType, string> = {
  member: 'Member', role_access: 'Role & access', number_access: 'Number access',
  assignment_ownership: 'Assignment & ownership', export: 'Export',
  security_session: 'Security & session', offboarding: 'Offboarding',
};

interface AuditRow { id: string; actorId: string | null; action: string; targetType: string | null; targetId: string | null; detail: string | null; at: string }

const ACTION_LABEL: Record<string, string> = {
  'campaign.sent': 'Campaign sent', 'automation.ran': 'Automation ran', 'order.status': 'Order status changed',
  'profile.updated': 'Profile updated', 'conversation.assigned': 'Conversation assigned', 'kundli.generated': 'Pre-call brief generated',
};

/** TEAM-S21 — Audit. Live workspace activity trail from /api/crm/audit. */
export default function AuditScreen() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    fetch('/api/crm/audit', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { events: [] })).then((d) => setRows(d.events ?? [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  const actorName = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? 'System' : 'System');

  const filtered = useMemo(() => rows.filter((r) => (!actor || r.actorId === actor) && (!action || r.action === action)), [rows, actor, action]);

  const actorOptions = useMemo(() => [
    { value: '', label: 'All actors' },
    ...Array.from(new Set(rows.map((r) => r.actorId).filter(Boolean))).map((id) => ({ value: id as string, label: actorName(id) })),
  ], [rows]);
  const actionOptions = useMemo(() => [
    { value: '', label: 'All actions' },
    ...Array.from(new Set(rows.map((r) => r.action))).map((a) => ({ value: a, label: ACTION_LABEL[a] ?? a })),
  ], [rows]);

  const columns: Column<AuditRow>[] = [
    { key: 'at', header: 'Time', render: (r) => new Date(r.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) },
    { key: 'actor', header: 'Actor', render: (r) => actorName(r.actorId) },
    { key: 'action', header: 'Action', render: (r) => <Badge tone="neutral">{ACTION_LABEL[r.action] ?? r.action}</Badge> },
    { key: 'target', header: 'Target', render: (r) => (r.targetType ? `${r.targetType}${r.targetId ? ` · ${r.targetId.slice(0, 8)}` : ''}` : '—') },
    { key: 'detail', header: 'Detail', render: (r) => r.detail ?? '—' },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Audit"
        description="Every workspace action — assignments, campaign sends, automation runs, order changes and more — with who and when."
        toolbar={
          <div style={{ display: 'flex', gap: 10 }}>
            <Select label="Actor" hideLabel size="sm" options={actorOptions} value={actor} onChange={(e) => setActor(e.target.value)} />
            <Select label="Action" hideLabel size="sm" options={actionOptions} value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
        }
      />
      {loading ? <LoadingSkeleton height={56} />
        : filtered.length === 0 ? <EmptyState title="No audit events yet" description="Workspace actions will appear here as your team uses the CRM." />
          : <DataTable caption="Audit trail" columns={columns} rows={filtered} rowKey={(r) => r.id} />}
    </div>
  );
}

export { eventTypeLabel };
