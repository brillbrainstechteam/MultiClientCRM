import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import {
  Badge, Button, DataTable, EmptyState, Input, LoadingSkeleton, Modal, Select, Tabs,
  Textarea, Toast, type BadgeTone, type Column, type TabItem,
} from '@crm/design-system';

/**
 * Commerce — real Catalogue + Orders, wired to /api/crm/catalogue and
 * /api/crm/orders. List, create and update-status all persist to the database.
 * The heavier prototype surfaces (selections, returns, sync, media) are out of
 * V1 scope. No mock data.
 */

const TABS: TabItem[] = [{ id: 'catalogue', label: 'Catalogue' }, { id: 'orders', label: 'Orders' }];

interface Item { id: string; title: string; sku: string | null; category: string | null; pricingMode: string; price: number | null; currency: string; stockStatus: string; collection: string | null; active: boolean }
interface OrderItem { id: string; title: string; quantity: number; unitPrice: number | null; lineTotal: number | null }
interface Order { id: string; orderNo: string; type: string; status: string; company: string | null; contactPerson: string | null; total: number | null; currency: string; paymentStatus: string; createdAt: string; items: OrderItem[] }

const ORDER_STATUSES = ['draft', 'enquiry', 'quotation', 'confirmed', 'payment_pending', 'part_paid', 'paid', 'processing', 'ready_dispatch', 'shipped', 'delivered', 'cancelled', 'returned'];
const STATUS_TONE: Record<string, BadgeTone> = { delivered: 'success', paid: 'success', cancelled: 'danger', returned: 'danger', enquiry: 'info', quotation: 'info', draft: 'neutral' };
const money = (v: number | null, c = 'INR') => (v == null ? '—' : `${c} ${v.toLocaleString('en-IN')}`);

export default function CommerceRealScreen() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'orders' ? 'orders' : 'catalogue';
  const setTab = (id: string) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', id); return n; });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Catalogue & Orders" description="Your products, and the enquiries, quotations and orders against them — all live." />
      <Tabs tabs={TABS} activeId={tab} onChange={setTab} ariaLabel="Commerce sections" />
      {tab === 'catalogue' ? <CatalogueTab /> : <OrdersTab />}
    </div>
  );
}

// ---- Catalogue -------------------------------------------------------------

function CatalogueTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [f, setF] = useState({ title: '', sku: '', category: '', pricingMode: 'fixed', price: '', stockStatus: 'available', collection: '' });

  const load = () => fetch('/api/crm/catalogue?all=1', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : { items: [] })).then((d) => setItems(d.items ?? [])).catch(() => setItems([])).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!f.title.trim()) { setToast('Title is required.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/crm/catalogue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ ...f, price: f.price ? Number(f.price) : undefined }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setToast(String(d.error ?? 'Could not add item.')); return; }
      setOpen(false); setF({ title: '', sku: '', category: '', pricingMode: 'fixed', price: '', stockStatus: 'available', collection: '' }); await load(); setToast('Item added.');
    } finally { setBusy(false); }
  };

  const columns: Column<Item>[] = [
    { key: 'title', header: 'Item', render: (i) => <strong>{i.title}</strong> },
    { key: 'sku', header: 'SKU', render: (i) => i.sku ?? '—' },
    { key: 'category', header: 'Category', render: (i) => i.category ?? '—' },
    { key: 'price', header: 'Price', render: (i) => (i.pricingMode === 'on_request' ? 'On request' : i.pricingMode === 'indicative' ? `~${money(i.price, i.currency)}` : money(i.price, i.currency)) },
    { key: 'stock', header: 'Stock', render: (i) => <Badge tone={i.stockStatus === 'available' ? 'success' : 'warning'}>{i.stockStatus === 'made_to_order' ? 'Made to order' : 'Available'}</Badge> },
    { key: 'active', header: 'Status', render: (i) => <Badge tone={i.active ? 'success' : 'neutral'}>{i.active ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" iconLeft={<Plus />} onClick={() => setOpen(true)}>Add item</Button>
      </div>
      {loading ? <LoadingSkeleton height={56} /> : items.length === 0
        ? <EmptyState title="No catalogue items yet" description="Add your first product." actions={<Button variant="primary" onClick={() => setOpen(true)}>Add item</Button>} />
        : <DataTable caption="Catalogue" columns={columns} rows={items} rowKey={(i) => i.id} />}

      <Modal open={open} title="Add catalogue item" onClose={() => setOpen(false)} footer={<>
        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="primary" disabled={busy} onClick={create}>{busy ? 'Adding…' : 'Add item'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <Input label="SKU / Design no." value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} placeholder="Optional" />
          <Input label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Optional" />
          <Select label="Pricing" value={f.pricingMode} onChange={(e) => setF({ ...f, pricingMode: e.target.value })}
            options={[{ value: 'fixed', label: 'Fixed price' }, { value: 'indicative', label: 'Indicative' }, { value: 'on_request', label: 'Price on request' }]} />
          {f.pricingMode !== 'on_request' ? <Input label="Price (INR)" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="numeric" /> : null}
          <Select label="Stock" value={f.stockStatus} onChange={(e) => setF({ ...f, stockStatus: e.target.value })}
            options={[{ value: 'available', label: 'Available' }, { value: 'made_to_order', label: 'Made to order' }]} />
          <Input label="Collection" value={f.collection} onChange={(e) => setF({ ...f, collection: e.target.value })} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}

// ---- Orders ----------------------------------------------------------------

function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [f, setF] = useState({ type: 'enquiry', company: '', contactPerson: '', itemTitle: '', quantity: '1', unitPrice: '', notes: '' });

  const load = () => fetch('/api/crm/orders', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : { orders: [] })).then((d) => setOrders(d.orders ?? [])).catch(() => setOrders([])).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!f.itemTitle.trim() && !f.company.trim()) { setToast('Add a company or an item.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/crm/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          type: f.type, company: f.company, contactPerson: f.contactPerson, notes: f.notes,
          items: f.itemTitle.trim() ? [{ title: f.itemTitle.trim(), quantity: Number(f.quantity) || 1, unitPrice: f.unitPrice ? Number(f.unitPrice) : undefined }] : [],
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setToast(String(d.error ?? 'Could not create.')); return; }
      const d = await res.json(); setOpen(false); setF({ type: 'enquiry', company: '', contactPerson: '', itemTitle: '', quantity: '1', unitPrice: '', notes: '' }); await load(); setToast(`Created ${d.orderNo}.`);
    } finally { setBusy(false); }
  };

  const changeStatus = async (order: Order, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    await fetch(`/api/crm/orders/${order.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ status }) }).catch(() => void load());
  };

  const columns: Column<Order>[] = useMemo(() => [
    { key: 'orderNo', header: 'Order', render: (o) => <strong>{o.orderNo}</strong> },
    { key: 'type', header: 'Type', render: (o) => <Badge tone="neutral">{o.type}</Badge> },
    { key: 'party', header: 'Company / person', render: (o) => o.company || o.contactPerson || '—' },
    { key: 'items', header: 'Items', render: (o) => `${o.items.length} line${o.items.length !== 1 ? 's' : ''}` },
    { key: 'total', header: 'Total', render: (o) => money(o.total, o.currency) },
    { key: 'status', header: 'Status', render: (o) => (
      <Select label="Status" hideLabel size="sm" value={o.status} onChange={(e) => changeStatus(o, e.target.value)}
        options={ORDER_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
    ) },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" iconLeft={<Plus />} onClick={() => setOpen(true)}>New enquiry / order</Button>
      </div>
      {loading ? <LoadingSkeleton height={56} /> : orders.length === 0
        ? <EmptyState title="No orders yet" description="Create an enquiry, quotation or order." actions={<Button variant="primary" onClick={() => setOpen(true)}>New</Button>} />
        : <DataTable caption="Orders" columns={columns} rows={orders} rowKey={(o) => o.id} />}

      <Modal open={open} title="New enquiry / quotation / order" onClose={() => setOpen(false)} footer={<>
        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="primary" disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}
            options={[{ value: 'enquiry', label: 'Enquiry' }, { value: 'quotation', label: 'Quotation' }, { value: 'order', label: 'Order' }]} />
          <Input label="Company" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Optional" />
          <Input label="Contact person" value={f.contactPerson} onChange={(e) => setF({ ...f, contactPerson: e.target.value })} placeholder="Optional" />
          <Input label="Item" value={f.itemTitle} onChange={(e) => setF({ ...f, itemTitle: e.target.value })} placeholder="e.g. Gold chain 22K" />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="Qty" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} inputMode="numeric" />
            <Input label="Unit price (INR)" value={f.unitPrice} onChange={(e) => setF({ ...f, unitPrice: e.target.value })} inputMode="numeric" placeholder="Optional" />
          </div>
          <Textarea label="Notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}
