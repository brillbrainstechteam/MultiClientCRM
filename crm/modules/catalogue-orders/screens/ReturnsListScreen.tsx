import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { useWorkspace } from '@crm/app/workspace-context';
import { findContact, findUser } from '@crm/mock-data';
import { Badge, Banner, Button, DataTable, EmptyState, SearchField, Select, type Column } from '@crm/design-system';
import { findOrder, returnCases } from '../data';
import type { ReturnCase } from '../domain/types';
import { refundStatusLabel, refundStatusTone, returnStatusLabel, returnStatusTone, returnTypeLabel } from '../catalogue-orders-labels';

const typeOptions = [
  { value: 'all', label: 'All types' },
  { value: 'return', label: 'Return' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'refund-only', label: 'Refund only' },
];

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'collection-scheduled', label: 'Collection scheduled' },
  { value: 'collected', label: 'Collected' },
  { value: 'received', label: 'Received' },
  { value: 'received-mismatch', label: 'Received — mismatch' },
  { value: 'replacement-shipped', label: 'Replacement shipped' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'closed', label: 'Closed' },
];

const queueOptions = [
  { value: 'all', label: 'All cases' },
  { value: 'needs-decision', label: 'Needs approval/rejection' },
  { value: 'refund-pending', label: 'Refund pending' },
  { value: 'mismatch', label: 'Received — mismatch' },
];

/** ECO-S24 — Returns & Exceptions List. Customer service queue spanning return/replacement/refund-only cases. */
export default function ReturnsListScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { branchId } = useWorkspace();
  const [searchParams, patch] = useQueryPatch();

  const q = searchParams.get('q') ?? '';
  const type = searchParams.get('type') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const queue = searchParams.get('queue') ?? 'all';
  const contactId = searchParams.get('contactId');
  const returnTo = searchParams.get('returnTo');
  const contact = contactId ? findContact(contactId) : undefined;

  const rows = useMemo(() => {
    return returnCases
      .filter((r) => {
        if (branchId === 'all') return true;
        const order = findOrder(r.orderId);
        return order?.branchId === branchId;
      })
      .filter((r) => !contactId || r.contactId === contactId)
      .filter((r) => type === 'all' || r.type === type)
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) => {
        if (queue === 'all') return true;
        if (queue === 'needs-decision') return r.status === 'requested';
        if (queue === 'refund-pending') return r.refundStatus === 'pending' || r.refundStatus === 'manual-confirmation-required' || r.refundStatus === 'processing';
        if (queue === 'mismatch') return r.status === 'received-mismatch';
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const needle = q.toLowerCase();
        return findContact(r.contactId)?.name.toLowerCase().includes(needle) || r.orderId.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle);
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [branchId, contactId, type, status, queue, q]);

  const columns: Column<ReturnCase>[] = [
    { key: 'id', header: 'Case', render: (r) => <div><p className="crm-eco-returns__id">{r.id}</p><p className="crm-eco-returns__sub">Order {findOrder(r.orderId)?.externalOrderId ?? r.orderId}</p></div> },
    { key: 'contact', header: 'Customer', render: (r) => findContact(r.contactId)?.name ?? r.contactId },
    { key: 'type', header: 'Type', render: (r) => <Badge tone="neutral" appearance="outline">{returnTypeLabel[r.type]}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={returnStatusTone[r.status]}>{returnStatusLabel[r.status]}</Badge> },
    { key: 'refund', header: 'Refund', render: (r) => (r.refundStatus ? <Badge tone={refundStatusTone[r.refundStatus]} appearance="outline">{refundStatusLabel[r.refundStatus]}</Badge> : '—') },
    { key: 'owner', header: 'Owner', render: (r) => findUser(r.ownerId)?.name ?? r.ownerId },
    { key: 'updated', header: 'Updated', render: (r) => new Date(r.updatedAt).toLocaleDateString('en-IN') },
  ];

  return (
    <div className="crm-eco-returns">
      <PageHeader
        title="Returns & Exceptions"
        description="Return, replacement and refund-only cases in one customer-service queue — eligibility, evidence and refund method stay explicit."
        breadcrumbs={contact ? [{ label: 'Catalogue & Orders', to: scopedHref('/catalogue-orders/catalogues') }, { label: `${contact.name} — returns` }] : undefined}
      />

      {contact ? (
        <Banner
          tone="info"
          title={`Showing returns & exceptions for ${contact.name}.`}
          actions={<Button variant="ghost" size="sm" onClick={() => navigate(returnTo ? scopedHref(returnTo) : scopedHref('/catalogue-orders/returns'))}>{returnTo ? 'Back to customer' : 'Clear'}</Button>}
        />
      ) : null}

      <div className="crm-eco-returns__toolbar">
        <SearchField label="Search cases" placeholder="Search by customer, order or case ID…" width="260px" value={q} onChange={(e) => patch({ q: e.target.value || null })} />
        <Select label="Queue" size="sm" options={queueOptions} value={queue} onChange={(e) => patch({ queue: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Type" size="sm" options={typeOptions} value={type} onChange={(e) => patch({ type: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Status" size="sm" options={statusOptions} value={status} onChange={(e) => patch({ status: e.target.value === 'all' ? null : e.target.value })} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No return or exception cases match"
          description="Try a different queue, type, status or search term."
          actions={<Button variant="secondary" onClick={() => patch({ q: null, type: null, status: null, queue: null })}>Clear filters</Button>}
        />
      ) : (
        <DataTable caption="Returns and exceptions" columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => navigate(scopedHref(`/catalogue-orders/returns/${r.id}`))} />
      )}
    </div>
  );
}
