import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { useWorkspace } from '@crm/app/workspace-context';
import { findContact, findUser } from '@crm/mock-data';
import { Badge, Banner, Button, DataTable, EmptyState, SearchField, Select, type Column } from '@crm/design-system';
import { findCatalogue, findConnector, orders } from '../data';
import type { Order } from '../domain/types';
import { orderSourceLabel, orderStatusLabel, orderStatusTone, paymentStatusLabel, paymentStatusTone } from '../catalogue-orders-labels';
import { can } from '../permissions';

const sourceOptions = [
  { value: 'all', label: 'All sources' },
  { value: 'crm-request', label: 'CRM order request' },
  { value: 'external-sync', label: 'Synced external order' },
  { value: 'crm-managed-checkout', label: 'CRM-managed checkout' },
];

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending-confirmation', label: 'Pending customer confirmation' },
  { value: 'pending-sync', label: 'Pending sync' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'packed', label: 'Packed' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
  { value: 'reconciliation-required', label: 'Reconciliation required' },
];

const queueOptions = [
  { value: 'all', label: 'All orders' },
  { value: 'payment-pending', label: 'Payment pending' },
  { value: 'delivery-exception', label: 'Delivery exception' },
  { value: 'reconciliation', label: 'Reconciliation required' },
  { value: 'pending-sync', label: 'Pending sync' },
];

/** ECO-S19 — Order Requests & Orders. Combined operational list: CRM requests + synchronized external orders. */
export default function OrdersListScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, branchId } = useWorkspace();
  const [searchParams, patch] = useQueryPatch();

  const q = searchParams.get('q') ?? '';
  const source = searchParams.get('source') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const queue = searchParams.get('queue') ?? 'all';
  const contactId = searchParams.get('contactId');
  const returnTo = searchParams.get('returnTo');
  const contact = contactId ? findContact(contactId) : undefined;

  const rows = useMemo(() => {
    return orders
      .filter((order) => branchId === 'all' || order.branchId === branchId)
      .filter((order) => !contactId || order.contactId === contactId)
      .filter((order) => source === 'all' || order.source === source)
      .filter((order) => status === 'all' || order.status === status)
      .filter((order) => {
        if (queue === 'all') return true;
        if (queue === 'payment-pending') return order.payment.status === 'pending' || order.payment.status === 'failed' || order.payment.status === 'expired';
        if (queue === 'delivery-exception') return order.fulfilment.status === 'delayed' || order.fulfilment.status === 'failed' || order.fulfilment.status === 'rto';
        if (queue === 'reconciliation') return order.status === 'reconciliation-required';
        if (queue === 'pending-sync') return order.syncStatus === 'pending-sync';
        return true;
      })
      .filter((order) => {
        if (!q) return true;
        const needle = q.toLowerCase();
        return (
          findContact(order.contactId)?.name.toLowerCase().includes(needle) ||
          order.id.toLowerCase().includes(needle) ||
          (order.externalOrderId ?? '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [branchId, contactId, source, status, queue, q]);

  const columns: Column<Order>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (o) => (
        <div className="crm-eco-orders__id-cell">
          <p className="crm-eco-orders__id">{o.externalOrderId ?? o.id}</p>
          <p className="crm-eco-orders__source-sub">{orderSourceLabel[o.source]}</p>
        </div>
      ),
    },
    { key: 'contact', header: 'Contact', render: (o) => findContact(o.contactId)?.name ?? o.contactId },
    { key: 'catalogue', header: 'Catalogue', render: (o) => findCatalogue(o.catalogueId)?.name ?? '—' },
    { key: 'total', header: 'Total', align: 'right', render: (o) => (o.commercialSummary.total != null ? `₹${o.commercialSummary.total.toLocaleString('en-IN')}` : 'Rate-linked') },
    { key: 'status', header: 'Status', render: (o) => <Badge tone={orderStatusTone[o.status]}>{orderStatusLabel[o.status]}</Badge> },
    { key: 'payment', header: 'Payment', render: (o) => <Badge tone={paymentStatusTone[o.payment.status]} appearance="outline">{paymentStatusLabel[o.payment.status]}</Badge> },
    {
      key: 'sync',
      header: 'Source',
      render: (o) => {
        const connector = findConnector(o.connectorId);
        if (!connector) return <span className="crm-eco-orders__readonly">CRM-owned</span>;
        return o.syncStatus === 'reconciliation-required' ? (
          <Badge tone="danger">Reconciliation required</Badge>
        ) : o.syncStatus === 'pending-sync' ? (
          <Badge tone="warning">Pending sync</Badge>
        ) : (
          <Badge tone="neutral" appearance="outline">{connector.name}</Badge>
        );
      },
    },
    { key: 'owner', header: 'Owner', render: (o) => findUser(o.ownerId)?.name ?? o.ownerId },
    { key: 'updated', header: 'Updated', render: (o) => new Date(o.updatedAt).toLocaleDateString('en-IN') },
  ];

  return (
    <div className="crm-eco-orders">
      <PageHeader
        title="Order Requests & Orders"
        description="CRM order requests and synchronized external orders in one operational queue — source and sync state are always explicit."
        breadcrumbs={contact ? [{ label: 'Catalogue & Orders', to: scopedHref('/catalogue-orders/catalogues') }, { label: `${contact.name} — orders` }] : undefined}
        actions={
          can(role, 'orderRequest.create') ? (
            <Button variant="primary" iconLeft={<Plus />} onClick={() => navigate(scopedHref('/catalogue-orders/orders/new'))}>
              Create order request
            </Button>
          ) : undefined
        }
      />

      {contact ? (
        <Banner
          tone="info"
          title={`Showing orders for ${contact.name}.`}
          actions={<Button variant="ghost" size="sm" onClick={() => navigate(returnTo ? scopedHref(returnTo) : scopedHref('/catalogue-orders/orders'))}>{returnTo ? 'Back to customer' : 'Clear'}</Button>}
        />
      ) : null}

      <div className="crm-eco-orders__toolbar">
        <SearchField label="Search orders" placeholder="Search by contact, order or external ID…" width="260px" value={q} onChange={(e) => patch({ q: e.target.value || null })} />
        <Select label="Queue" size="sm" options={queueOptions} value={queue} onChange={(e) => patch({ queue: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Source" size="sm" options={sourceOptions} value={source} onChange={(e) => patch({ source: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Status" size="sm" options={statusOptions} value={status} onChange={(e) => patch({ status: e.target.value === 'all' ? null : e.target.value })} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No orders match"
          description="Try a different queue, source, status or search term."
          actions={<Button variant="secondary" onClick={() => patch({ q: null, source: null, status: null, queue: null })}>Clear filters</Button>}
        />
      ) : (
        <DataTable caption="Orders" columns={columns} rows={rows} rowKey={(o) => o.id} onRowClick={(o) => navigate(scopedHref(`/catalogue-orders/orders/${o.id}`))} />
      )}
    </div>
  );
}
