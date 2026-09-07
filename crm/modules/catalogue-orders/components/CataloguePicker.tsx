import { useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Badge, Button, DataTable, EmptyState, SearchField, Select, type Column } from '@crm/design-system';
import { catalogues, itemsForCatalogue } from '../data';
import type { CatalogueItem } from '../domain/types';
import { PriceDisplay } from './PriceDisplay';
import { SourceModeBadge } from './SourceModeBadge';

export type PickerMode = 'single' | 'multi';

export interface CataloguePickerProps {
  initialCatalogueId?: string;
  mode?: PickerMode;
  /** Restrict to branches the caller can see (e.g. Inbox conversation's branch). */
  branchId?: string;
  confirmLabel?: string;
  onConfirm: (itemIds: string[]) => void;
}

/**
 * The one Catalogue Picker contract (SKILL.md §3.8) — Inbox, Campaigns,
 * Templates, Automation, Contacts and AI handoff all embed this component
 * rather than building their own item chooser. It never sends anything
 * itself; the caller (Inbox/Campaigns/this module's own Share screen)
 * decides what happens with the returned item ids.
 */
export function CataloguePicker({ initialCatalogueId, mode = 'multi', branchId, confirmLabel, onConfirm }: CataloguePickerProps) {
  const [catalogueId, setCatalogueId] = useState(initialCatalogueId ?? catalogues[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const items = useMemo(() => {
    let scoped = itemsForCatalogue(catalogueId).filter((item) => item.status === 'active' && item.customerVisible);
    if (branchId && branchId !== 'all') scoped = scoped.filter((item) => item.branchVisibility.includes(branchId));
    if (q) {
      const needle = q.toLowerCase();
      scoped = scoped.filter((item) => item.title.toLowerCase().includes(needle) || item.sku.toLowerCase().includes(needle) || item.itemCode.toLowerCase().includes(needle));
    }
    return scoped;
  }, [catalogueId, branchId, q]);

  function toggle(id: string) {
    setSelected((prev) => {
      if (mode === 'single') return prev.has(id) ? new Set() : new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (mode === 'single') return;
    setSelected((prev) => (prev.size >= items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  const columns: Column<CatalogueItem>[] = [
    {
      key: 'item',
      header: 'Item',
      render: (item) => {
        const cover = item.media.find((m) => m.isCover) ?? item.media[0];
        return (
          <div className="crm-eco-picker__item-cell">
            <span className="crm-eco-picker__thumb">
              {cover && cover.status === 'ok' ? <img src={cover.url} alt="" /> : <ImageOff size={14} aria-hidden="true" />}
            </span>
            <div>
              <p className="crm-eco-picker__item-title">{item.title}</p>
              <p className="crm-eco-picker__item-sub">{item.itemCode} · {item.sku}</p>
            </div>
          </div>
        );
      },
    },
    { key: 'price', header: 'Price', render: (item) => <PriceDisplay price={item.price} /> },
    { key: 'stale', header: '', render: (item) => (item.sourceStale ? <Badge tone="warning">Stale</Badge> : null) },
  ];

  return (
    <div className="crm-eco-picker">
      <div className="crm-eco-picker__toolbar">
        <Select label="Catalogue" size="sm" options={catalogues.map((c) => ({ value: c.id, label: c.name }))} value={catalogueId} onChange={(e) => { setCatalogueId(e.target.value); setSelected(new Set()); }} />
        <SourceModeBadge mode={catalogues.find((c) => c.id === catalogueId)?.sourceMode ?? 'crm-managed'} />
        <SearchField label="Search items" placeholder="Search by title, SKU or code…" width="240px" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="No items available" description="Try a different catalogue or search term." />
      ) : (
        <DataTable
          caption="Catalogue items"
          columns={columns}
          rows={items}
          rowKey={(item) => item.id}
          selectable={mode === 'multi'}
          selectedIds={selected}
          onToggleRow={toggle}
          onToggleAll={toggleAll}
          onRowClick={mode === 'single' ? (item) => toggle(item.id) : undefined}
        />
      )}

      <div className="crm-eco-picker__footer">
        <span className="crm-eco-picker__count">{selected.size} item{selected.size === 1 ? '' : 's'} selected</span>
        <Button variant="primary" disabled={selected.size === 0} onClick={() => onConfirm(Array.from(selected))}>
          {confirmLabel ?? 'Use selected items'}
        </Button>
      </div>
    </div>
  );
}
