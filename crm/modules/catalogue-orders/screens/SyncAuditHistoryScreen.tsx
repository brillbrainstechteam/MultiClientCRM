import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { Badge, Button, DataTable, EmptyState, SearchField, Select, Toast, type BadgeTone, type Column } from '@crm/design-system';
import { catalogues, connectors, findCatalogue, findConnector, findOrder, syncEvents } from '../data';
import type { SyncEvent } from '../domain/types';
import { can } from '../permissions';
import { useWorkspace } from '@crm/app/workspace-context';

const statusTone: Record<SyncEvent['status'], BadgeTone> = {
  success: 'success',
  error: 'danger',
  retrying: 'warning',
  conflict: 'danger',
};

const entityOptions = [
  { value: 'all', label: 'All entity types' },
  { value: 'catalogue', label: 'Catalogue' },
  { value: 'item', label: 'Item' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'order', label: 'Order' },
  { value: 'payment', label: 'Payment' },
  { value: 'fulfilment', label: 'Fulfilment' },
  { value: 'media', label: 'Media' },
];

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'conflict', label: 'Conflict' },
];

/** ECO-S26 — Sync & Audit History across every connector. */
export default function SyncAuditHistoryScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role } = useWorkspace();
  const [searchParams, patch] = useQueryPatch();
  const [, forceRerender] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const q = searchParams.get('q') ?? '';
  const catalogueId = searchParams.get('catalogueId') ?? 'all';
  const connectorId = searchParams.get('connectorId') ?? 'all';
  const entityType = searchParams.get('entityType') ?? 'all';
  const status = searchParams.get('status') ?? 'all';

  const rows = useMemo(() => {
    return syncEvents
      .filter((e) => catalogueId === 'all' || e.catalogueId === catalogueId)
      .filter((e) => connectorId === 'all' || e.connectorId === connectorId)
      .filter((e) => entityType === 'all' || e.entityType === entityType)
      .filter((e) => status === 'all' || e.status === status)
      .filter((e) => !q || e.entityLabel.toLowerCase().includes(q.toLowerCase()) || e.message.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogueId, connectorId, entityType, status, q]);

  function retry(event: SyncEvent) {
    event.status = 'success';
    event.message = `${event.message} — retried and resolved.`;
    event.occurredAt = new Date().toISOString();
    forceRerender((n) => n + 1);
    setToast(`Retried sync for ${event.entityLabel}.`);
  }

  function openEntity(event: SyncEvent) {
    if (event.entityType === 'order' && event.entityId) {
      const order = findOrder(event.entityId);
      if (order) { navigate(scopedHref(`/catalogue-orders/orders/${order.id}`)); return; }
    }
    if (event.catalogueId) navigate(scopedHref(`/catalogue-orders/catalogues/${event.catalogueId}/explorer`));
  }

  const columns: Column<SyncEvent>[] = [
    { key: 'occurred', header: 'Occurred', render: (e) => new Date(e.occurredAt).toLocaleString('en-IN') },
    { key: 'entity', header: 'Entity', render: (e) => <div><p className="crm-eco-sync__entity">{e.entityLabel}</p><p className="crm-eco-sync__sub">{e.entityType} · {findCatalogue(e.catalogueId ?? '')?.name ?? '—'}</p></div> },
    { key: 'connector', header: 'Source', render: (e) => findConnector(e.connectorId)?.name ?? e.connectorId },
    { key: 'direction', header: 'Direction', render: (e) => <Badge tone="neutral" appearance="outline">{e.direction}</Badge> },
    { key: 'status', header: 'Status', render: (e) => <Badge tone={statusTone[e.status]}>{e.status}</Badge> },
    { key: 'message', header: 'Message', render: (e) => <span className="crm-eco-sync__message">{e.message}</span> },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (e) =>
        e.retryable && can(role, 'integration.manage') ? (
          <Button variant="secondary" size="sm" iconLeft={<RotateCcw size={14} />} onClick={() => retry(e)}>Retry</Button>
        ) : null,
    },
  ];

  return (
    <div className="crm-eco-sync">
      <PageHeader
        title="Sync & Audit History"
        description="Every inbound/outbound connector event across catalogues, inventory, orders, payments and fulfilment — with eligible retries."
      />

      <div className="crm-eco-sync__toolbar">
        <SearchField label="Search events" placeholder="Search by entity or message…" width="260px" value={q} onChange={(e) => patch({ q: e.target.value || null })} />
        <Select label="Catalogue" size="sm" options={[{ value: 'all', label: 'All catalogues' }, ...catalogues.map((c) => ({ value: c.id, label: c.name }))]} value={catalogueId} onChange={(e) => patch({ catalogueId: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Connector" size="sm" options={[{ value: 'all', label: 'All connectors' }, ...connectors.map((c) => ({ value: c.id, label: c.name }))]} value={connectorId} onChange={(e) => patch({ connectorId: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Entity type" size="sm" options={entityOptions} value={entityType} onChange={(e) => patch({ entityType: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Status" size="sm" options={statusOptions} value={status} onChange={(e) => patch({ status: e.target.value === 'all' ? null : e.target.value })} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No sync events match" description="Try a different catalogue, connector, entity type or status." actions={<Button variant="secondary" onClick={() => patch({ q: null, catalogueId: null, connectorId: null, entityType: null, status: null })}>Clear filters</Button>} />
      ) : (
        <DataTable caption="Sync events" columns={columns} rows={rows} rowKey={(e) => e.id} onRowClick={openEntity} />
      )}

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
