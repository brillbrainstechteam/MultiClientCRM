import { useEffect, useState } from 'react';
import { PageHeader } from '@crm/components';
import { Badge, DataTable, EmptyState, LoadingSkeleton, type Column } from '@crm/design-system';

/**
 * TEAM — Agent performance from real data: conversations assigned, calls logged
 * and actions taken per team member (/api/crm/team/performance). No mock.
 */
interface Row { userId: string; name: string; email: string; role: string; teamFunction: string | null; assignedConversations: number; calls: number; actions: number }

export default function PerformanceScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crm/team/performance', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { rows: [] })).then((d) => setRows(d.rows ?? [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  const columns: Column<Row>[] = [
    { key: 'name', header: 'Member', render: (r) => <div><strong>{r.name}</strong><div style={{ fontSize: 12, color: 'var(--crm-text-muted,#6b7a88)' }}>{r.email}</div></div> },
    { key: 'role', header: 'Role', render: (r) => <Badge tone="neutral">{r.role}</Badge> },
    { key: 'fn', header: 'Function', render: (r) => r.teamFunction ?? '—' },
    { key: 'convos', header: 'Assigned conversations', render: (r) => String(r.assignedConversations) },
    { key: 'calls', header: 'Calls logged', render: (r) => String(r.calls) },
    { key: 'actions', header: 'Actions', render: (r) => String(r.actions) },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Performance" description="Workload and activity per team member, from real assignments, calls and actions." />
      {loading ? <LoadingSkeleton height={56} />
        : rows.length === 0 ? <EmptyState title="No team activity yet" description="Metrics appear as agents are assigned conversations and log calls." />
          : <DataTable caption="Agent performance" columns={columns} rows={rows} rowKey={(r) => r.userId} />}
    </div>
  );
}
