import { Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, type Column, DataTable, EmptyState, Select } from '@crm/design-system';
import { can } from '../permissions';
import { auditEvents, branches, whatsappNumbers } from '../team-access-mock-data';
import type { AuditEvent, AuditEventType } from '../team-access-types';

const eventTypeLabel: Record<AuditEventType, string> = {
  member: 'Member',
  role_access: 'Role & access',
  number_access: 'Number access',
  assignment_ownership: 'Assignment & ownership',
  export: 'Export',
  security_session: 'Security & session',
  offboarding: 'Offboarding',
};

/** TEAM-S21 — Audit. Actor/target/event history; event detail and export overlay separately. */
export default function AuditScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useWorkspace();

  const actorFilter = searchParams.get('actor');
  const eventFilter = searchParams.get('event') as AuditEventType | null;
  const branchFilter = searchParams.get('branch');
  const numberFilter = searchParams.get('number');
  const dateFilter = searchParams.get('date');

  const setFilter = (key: string, value: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  const openEvent = (eventId: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('drawer', 'event');
      next.set('eventId', eventId);
      return next;
    });

  const rows = auditEvents.filter((event) => {
    if (actorFilter && event.actorId !== actorFilter) return false;
    if (eventFilter && event.type !== eventFilter) return false;
    if (branchFilter && event.branchId !== branchFilter) return false;
    if (numberFilter && event.numberId !== numberFilter) return false;
    if (dateFilter && !event.timestamp.startsWith(dateFilter)) return false;
    return true;
  });

  const actorOptions = [
    { value: '', label: 'All actors' },
    ...Array.from(new Map(auditEvents.map((e) => [e.actorId, e.actorName])).entries()).map(([id, name]) => ({ value: id, label: name })),
  ];

  const canExport = can(role, 'exportAudit');

  const columns: Column<AuditEvent>[] = [
    { key: 'timestamp', header: 'Time', render: (e) => new Date(e.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) },
    { key: 'actor', header: 'Actor', render: (e) => e.actorName },
    { key: 'target', header: 'Target', render: (e) => e.targetLabel },
    { key: 'type', header: 'Event', render: (e) => <Badge tone="neutral">{eventTypeLabel[e.type]}</Badge> },
    {
      key: 'summary',
      header: 'Summary',
      render: (e) => (e.sensitive && role !== 'owner' ? <span className="crm-audit__masked">Restricted detail — masked for your role</span> : e.summary),
    },
  ];

  return (
    <div className="crm-audit">
      <PageHeader
        title="Audit"
        description="Every access, role, assignment and offboarding change with who/what/when and why."
        actions={
          canExport ? (
            <Button variant="secondary" iconLeft={<Download />} onClick={() => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('modal', 'export'); return next; })}>
              Export
            </Button>
          ) : (
            <Button variant="secondary" iconLeft={<Download />} disabled title="Export is Owner-only">
              Export
            </Button>
          )
        }
        toolbar={
          <div className="crm-audit__toolbar">
            <Select label="Actor" hideLabel size="sm" options={actorOptions} value={actorFilter ?? ''} onChange={(e) => setFilter('actor', e.target.value)} />
            <Select
              label="Event"
              hideLabel
              size="sm"
              options={[{ value: '', label: 'All events' }, ...Object.entries(eventTypeLabel).map(([value, label]) => ({ value, label }))]}
              value={eventFilter ?? ''}
              onChange={(e) => setFilter('event', e.target.value)}
            />
            <Select label="Branch" hideLabel size="sm" options={[{ value: '', label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} value={branchFilter ?? ''} onChange={(e) => setFilter('branch', e.target.value)} />
            <Select label="Number" hideLabel size="sm" options={[{ value: '', label: 'All numbers' }, ...whatsappNumbers.map((n) => ({ value: n.id, label: n.displayName }))]} value={numberFilter ?? ''} onChange={(e) => setFilter('number', e.target.value)} />
            <input type="date" className="crm-audit__date" value={dateFilter ?? ''} onChange={(e) => setFilter('date', e.target.value)} aria-label="Date" />
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="No matching audit events" description="Try clearing a filter." actions={<Button variant="secondary" onClick={() => setSearchParams(new URLSearchParams())}>Clear filters</Button>} />
      ) : (
        <DataTable caption="Audit history" columns={columns} rows={rows} rowKey={(e) => e.id} onRowClick={(e) => openEvent(e.id)} />
      )}
    </div>
  );
}

export { eventTypeLabel };
