import { useEffect, useMemo, useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { PageHeader } from '@crm/components';
import {
  Badge, Button, Checkbox, DataTable, EmptyState, Input, LoadingSkeleton, Modal, Select, Textarea, Toast, type BadgeTone, type Column,
} from '@crm/design-system';

/**
 * Selections — curated sets of catalogue items shared with a customer, then
 * converted to an order. Real, wired to /api/crm/selections (+ /api/crm/catalogue
 * for the picker). No mock, no payments (conversion creates a real order).
 */
interface Sel { id: string; name: string; status: string; note: string | null; contactId: string | null; items: { id: string; title: string; quantity: number }[] }
interface CatItem { id: string; title: string; price: number | null; currency: string }

const STATUSES = ['draft', 'shared', 'confirmed', 'converted', 'closed'];
const TONE: Record<string, BadgeTone> = { converted: 'success', confirmed: 'info', shared: 'brand', closed: 'neutral', draft: 'neutral' };

export default function SelectionsRealScreen() {
  const [sels, setSels] = useState<Sel[]>([]);
  const [catalogue, setCatalogue] = useState<CatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<Record<string, number>>({});

  const load = () => Promise.all([
    fetch('/api/crm/selections', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { selections: [] })),
    fetch('/api/crm/catalogue', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { items: [] })),
  ]).then(([s, c]) => { setSels(s.selections ?? []); setCatalogue(c.items ?? []); }).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!name.trim()) { setToast('Name the selection.'); return; }
    const items = Object.entries(picked).map(([id, qty]) => { const it = catalogue.find((c) => c.id === id); return { catalogueItemId: id, title: it?.title ?? 'Item', quantity: qty }; });
    if (items.length === 0) { setToast('Pick at least one item.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/crm/selections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name: name.trim(), note, items }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setToast(String(d.error ?? 'Could not create.')); return; }
      setOpen(false); setName(''); setNote(''); setPicked({}); await load(); setToast('Selection created.');
    } finally { setBusy(false); }
  };

  const setStatus = async (s: Sel, status: string) => {
    setSels((prev) => prev.map((x) => (x.id === s.id ? { ...x, status } : x)));
    await fetch(`/api/crm/selections/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ status }) }).catch(() => void load());
  };

  const convert = async (s: Sel) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/crm/selections/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ convert: true }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setToast(String(d.error ?? 'Could not convert.')); return; }
      await load(); setToast(`Converted to order ${d.orderNo}.`);
    } finally { setBusy(false); }
  };

  const columns: Column<Sel>[] = useMemo(() => [
    { key: 'name', header: 'Selection', render: (s) => <strong>{s.name}</strong> },
    { key: 'items', header: 'Items', render: (s) => `${s.items.length} item${s.items.length !== 1 ? 's' : ''}` },
    { key: 'status', header: 'Status', render: (s) => s.status === 'converted'
      ? <Badge tone="success">converted</Badge>
      : <Select label="Status" hideLabel size="sm" value={s.status} onChange={(e) => setStatus(s, e.target.value)} options={STATUSES.filter((x) => x !== 'converted').map((x) => ({ value: x, label: x }))} /> },
    { key: 'convert', header: '', align: 'right', render: (s) => s.status !== 'converted'
      ? <Button variant="secondary" size="sm" iconLeft={<ShoppingCart size={14} />} disabled={busy} onClick={() => convert(s)}>Convert to order</Button>
      : <Badge tone={TONE.converted}>Ordered</Badge> },
  ], [busy]);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <PageHeader title="Selections" description="Curate a set of items to share with a customer, then convert it to an order."
        actions={<Button variant="primary" iconLeft={<Plus />} onClick={() => setOpen(true)}>New selection</Button>} />
      {loading ? <LoadingSkeleton height={56} /> : sels.length === 0
        ? <EmptyState title="No selections yet" description="Build a curated set of catalogue items to share." actions={<Button variant="primary" onClick={() => setOpen(true)}>New selection</Button>} />
        : <DataTable caption="Selections" columns={columns} rows={sels} rowKey={(s) => s.id} />}

      <Modal open={open} title="New selection" onClose={() => setOpen(false)} footer={<>
        <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="primary" disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali picks for Sharma & Sons" />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-muted,#6b7a88)', margin: '0 0 6px', textTransform: 'uppercase' }}>Items</p>
            {catalogue.length === 0 ? <p style={{ fontSize: 13, color: 'var(--crm-text-muted,#6b7a88)', margin: 0 }}>No catalogue items yet — add some in Catalogue first.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflow: 'auto' }}>
                {catalogue.map((c) => {
                  const on = c.id in picked;
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Checkbox label={c.title} checked={on} onChange={() => setPicked((p) => { const n = { ...p }; if (on) delete n[c.id]; else n[c.id] = 1; return n; })} />
                      {on ? <Input label="qty" hideLabel value={String(picked[c.id])} onChange={(e) => setPicked((p) => ({ ...p, [c.id]: Number(e.target.value) || 1 }))} inputMode="numeric" width="64px" /> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}
