import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { useWorkspace } from '@crm/app/workspace-context';
import { findBranch } from '@crm/mock-data';
import {
  Badge,
  Button,
  DataTable,
  Drawer,
  EmptyState,
  Input,
  PermissionRestricted,
  SearchField,
  Select,
  Textarea,
  Toast,
  type Column,
} from '@crm/design-system';
import { catalogues, findCatalogue, findConnector, findItem, inventoryAudit, inventoryPositions } from '../data';
import { formatDualQuantity, formatQuantity } from '../domain/units';
import type { InventoryAuditEntry, InventoryPosition } from '../domain/types';
import { can } from '../permissions';
import { ConnectorStateBadge } from '../components';

const sourceOptions = [
  { value: 'all', label: 'All sources' },
  { value: 'integrated', label: 'Integrated (read-only)' },
  { value: 'spreadsheet', label: 'Spreadsheet' },
  { value: 'crm-managed', label: 'CRM-managed' },
];

const stateOptions = [
  { value: 'all', label: 'All stock states' },
  { value: 'in-stock', label: 'In stock' },
  { value: 'out-of-stock', label: 'Out of stock' },
  { value: 'made-to-order', label: 'Made to order' },
  { value: 'stale', label: 'Stale source' },
];

interface Row extends InventoryPosition {
  rowId: string;
  itemTitle: string;
  catalogueName: string;
}

/** ECO-S13/S14 — Inventory & Availability list, plus the Inventory Update drawer. */
export default function InventoryScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, branchId } = useWorkspace();
  const [searchParams, patch] = useQueryPatch();
  const [, forceRerender] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const q = searchParams.get('q') ?? '';
  const catalogueFilter = searchParams.get('catalogueId') ?? 'all';
  const sourceFilter = searchParams.get('source') ?? 'all';
  const stateFilter = searchParams.get('state') ?? 'all';
  const drawerItemId = searchParams.get('drawer') === 'update' ? searchParams.get('itemId') : null;

  const rows = useMemo<Row[]>(() => {
    return inventoryPositions
      .map((position) => {
        const item = findItem(position.itemId);
        if (!item) return null;
        const catalogue = findCatalogue(item.catalogueId);
        return { ...position, rowId: `${position.itemId}-${position.branchId}-${position.variantId ?? 'base'}`, itemTitle: item.title, catalogueName: catalogue?.name ?? 'Unknown' } as Row;
      })
      .filter((row): row is Row => Boolean(row))
      .filter((row) => branchId === 'all' || row.branchId === branchId)
      .filter((row) => catalogueFilter === 'all' || findItem(row.itemId)?.catalogueId === catalogueFilter)
      .filter((row) => sourceFilter === 'all' || row.source === sourceFilter)
      .filter((row) => {
        if (stateFilter === 'all') return true;
        if (stateFilter === 'made-to-order') return row.madeToOrder;
        if (stateFilter === 'stale') return row.stale;
        if (stateFilter === 'out-of-stock') return !row.madeToOrder && row.primaryQuantity === 0;
        if (stateFilter === 'in-stock') return !row.madeToOrder && row.primaryQuantity > 0;
        return true;
      })
      .filter((row) => !q || row.itemTitle.toLowerCase().includes(q.toLowerCase()));
  }, [branchId, catalogueFilter, sourceFilter, stateFilter, q]);

  const drawerItem = drawerItemId ? findItem(drawerItemId) : undefined;

  function openUpdate(itemId: string) {
    patch({ drawer: 'update', itemId });
  }

  function closeDrawer() {
    patch({ drawer: null, itemId: null });
  }

  const columns: Column<Row>[] = [
    { key: 'item', header: 'Item', render: (r) => <div><p className="crm-eco-inv__item-title">{r.itemTitle}</p><p className="crm-eco-inv__item-sub">{r.catalogueName}</p></div> },
    { key: 'branch', header: 'Branch', render: (r) => findBranch(r.branchId)?.name ?? r.branchId },
    { key: 'qty', header: 'Quantity', render: (r) => formatDualQuantity(r.primaryQuantity, r.primaryUnit, r.secondaryQuantity, r.secondaryUnit) },
    { key: 'source', header: 'Source', render: (r) => <Badge tone={r.source === 'integrated' ? 'brand' : r.source === 'spreadsheet' ? 'info' : 'neutral'}>{r.source}</Badge> },
    { key: 'updated', header: 'Updated', render: (r) => new Date(r.updatedAt).toLocaleDateString('en-IN') },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (r.madeToOrder ? <Badge tone="info">Made to order</Badge> : r.stale ? <Badge tone="warning">Stale</Badge> : r.primaryQuantity === 0 ? <Badge tone="danger">Out of stock</Badge> : <Badge tone="success">In stock</Badge>),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (r) => {
        if (r.source === 'integrated') {
          const connector = findConnector(findCatalogue(findItem(r.itemId)?.catalogueId ?? '')?.connectorId ?? null);
          if (!connector) return <span className="crm-eco-inv__readonly">Connector-managed</span>;
          const canManage = can(role, 'integration.manage');
          return (
            <div className="crm-eco-inv__connector-actions">
              <ConnectorStateBadge state={connector.state} />
              {connector.errorMessage ? (
                <Button variant="ghost" size="sm" onClick={() => setToast(`${connector.name}: ${connector.errorMessage}`)}>View error</Button>
              ) : canManage ? (
                <Button variant="ghost" size="sm" onClick={() => setToast(`Sync requested from ${connector.name} — inventory.write is disabled for this connector, so quantities are read-only until the next scheduled sync.`)}>Sync now</Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => setToast(`Would open ${findItem(r.itemId)?.externalId ?? r.itemId} in ${connector.name} — stock is edited at the source.`)}>Open source</Button>
            </div>
          );
        }
        return can(role, 'inventory.adjust') ? (
          <Button variant="secondary" size="sm" onClick={() => openUpdate(r.itemId)}>Update</Button>
        ) : null;
      },
    },
  ];

  return (
    <div className="crm-eco-inventory">
      <PageHeader
        title="Inventory & Availability"
        description="Stock across every catalogue and branch — integrated sources stay read-only here; spreadsheet and CRM-managed catalogues can be adjusted directly."
      />

      <div className="crm-eco-inventory__toolbar">
        <SearchField label="Search items" placeholder="Search by item name…" width="240px" value={q} onChange={(e) => patch({ q: e.target.value || null })} />
        <Select label="Catalogue" size="sm" options={[{ value: 'all', label: 'All catalogues' }, ...catalogues.map((c) => ({ value: c.id, label: c.name }))]} value={catalogueFilter} onChange={(e) => patch({ catalogueId: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Source" size="sm" options={sourceOptions} value={sourceFilter} onChange={(e) => patch({ source: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Stock state" size="sm" options={stateOptions} value={stateFilter} onChange={(e) => patch({ state: e.target.value === 'all' ? null : e.target.value })} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No inventory positions match" description="Try a different catalogue, source or stock state filter." actions={<Button variant="secondary" onClick={() => patch({ q: null, catalogueId: null, source: null, state: null })}>Clear filters</Button>} />
      ) : (
        <DataTable caption="Inventory positions" columns={columns} rows={rows} rowKey={(r) => r.rowId} onRowClick={(r) => navigate(scopedHref(`/catalogue-orders/catalogues/${findItem(r.itemId)?.catalogueId}/items/${r.itemId}`))} />
      )}

      {drawerItem ? (
        <InventoryUpdateDrawer
          itemId={drawerItem.id}
          itemTitle={drawerItem.title}
          onClose={closeDrawer}
          onSaved={(message) => {
            forceRerender((n) => n + 1);
            setToast(message);
            closeDrawer();
          }}
        />
      ) : null}

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function InventoryUpdateDrawer({
  itemId,
  itemTitle,
  onClose,
  onSaved,
}: {
  itemId: string;
  itemTitle: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { currentUser, role, branchId } = useWorkspace();
  const positions = inventoryPositions.filter((p) => p.itemId === itemId && (branchId === 'all' || p.branchId === branchId));
  const [selectedBranchId, setSelectedBranchId] = useState(positions[0]?.branchId ?? '');
  const position = inventoryPositions.find((p) => p.itemId === itemId && p.branchId === selectedBranchId);
  const connector = position?.source === 'integrated' ? findConnector(findCatalogue(findItem(itemId)?.catalogueId ?? '')?.connectorId ?? null) : null;
  const [primaryQty, setPrimaryQty] = useState(String(position?.primaryQuantity ?? 0));
  const [secondaryQty, setSecondaryQty] = useState(position?.secondaryQuantity != null ? String(position.secondaryQuantity) : '');
  const [delta, setDelta] = useState('1');
  const [reason, setReason] = useState('');

  const history = inventoryAudit.filter((entry) => entry.itemId === itemId).slice(-5).reverse();

  function logAudit(action: InventoryAuditEntry['action'], entryDelta: number | null) {
    if (!position) return;
    const entry: InventoryAuditEntry = {
      id: `invaud_local_${Date.now()}`,
      itemId,
      branchId: position.branchId,
      action,
      delta: entryDelta,
      unit: position.primaryUnit,
      reason,
      actorId: currentUser.id,
      at: new Date().toISOString(),
    };
    inventoryAudit.push(entry);
  }

  function save(markUnavailable = false) {
    if (!position) return;
    if (!reason.trim()) return;
    const newQty = markUnavailable ? 0 : Number(primaryQty) || 0;
    position.primaryQuantity = newQty;
    if (position.secondaryUnit) position.secondaryQuantity = secondaryQty ? Number(secondaryQty) : null;
    position.updatedAt = new Date().toISOString();
    position.stale = false;
    logAudit(markUnavailable ? 'mark-unavailable' : 'adjust', null);
    onSaved(`Inventory updated for ${itemTitle}.`);
  }

  function addOrReduce(direction: 'add' | 'reduce') {
    if (!position) return;
    if (!reason.trim()) return;
    const change = Number(delta) || 0;
    if (change <= 0) return;
    const signedDelta = direction === 'add' ? change : -change;
    position.primaryQuantity = Math.max(0, position.primaryQuantity + signedDelta);
    position.updatedAt = new Date().toISOString();
    position.stale = false;
    position.madeToOrder = false;
    logAudit(direction, signedDelta);
    onSaved(`${direction === 'add' ? 'Added' : 'Reduced'} ${change} ${position.primaryUnit.toLowerCase()} for ${itemTitle}.`);
  }

  function markMadeToOrder() {
    if (!position) return;
    if (!reason.trim()) return;
    position.madeToOrder = true;
    position.primaryQuantity = 0;
    position.updatedAt = new Date().toISOString();
    position.stale = false;
    logAudit('mark-made-to-order', null);
    onSaved(`${itemTitle} marked as made-to-order at ${findBranch(position.branchId)?.name ?? position.branchId}.`);
  }

  const canAdjust = can(role, 'inventory.adjust');

  if (!canAdjust) {
    return (
      <Drawer open title={`Update inventory — ${itemTitle}`} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
        <PermissionRestricted
          title="You do not have access to this action"
          description="Adjusting inventory quantities is restricted to workspace owners and managers."
        />
      </Drawer>
    );
  }

  if (position?.source === 'integrated') {
    return (
      <Drawer open title={`Update inventory — ${itemTitle}`} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
        <div className="crm-eco-inv-drawer">
          {positions.length > 1 ? (
            <Select label="Branch" options={positions.map((p) => ({ value: p.branchId, label: findBranch(p.branchId)?.name ?? p.branchId }))} value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} />
          ) : null}
          <p className="crm-eco-inv-drawer__hint">
            {connector ? `${connector.name} owns this item's stock — quantities are read-only here and must be changed at the source.` : 'This item is connector-managed — quantities are read-only here and must be changed at the source.'}
          </p>
          {connector ? (
            <>
              <p className="crm-eco-inv-drawer__hint"><ConnectorStateBadge state={connector.state} /></p>
              {connector.errorMessage ? <p className="crm-eco-inv-drawer__hint">{connector.errorMessage}</p> : null}
              <div className="crm-eco-inv-drawer__state-actions">
                {connector.errorMessage ? null : can(role, 'integration.manage') ? (
                  <Button variant="secondary" onClick={() => onSaved(`Sync requested from ${connector.name} — inventory.write is disabled for this connector, so quantities are read-only until the next scheduled sync.`)}>Sync now</Button>
                ) : null}
                <Button variant="secondary" onClick={() => onSaved(`Would open ${findItem(itemId)?.externalId ?? itemId} in ${connector.name} — stock is edited at the source.`)}>Open source</Button>
              </div>
            </>
          ) : null}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open title={`Update inventory — ${itemTitle}`} onClose={onClose} footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!reason.trim()} onClick={() => save(false)}>Save</Button>
      </>
    }>
      <div className="crm-eco-inv-drawer">
        {positions.length > 1 ? (
          <Select label="Branch" options={positions.map((p) => ({ value: p.branchId, label: findBranch(p.branchId)?.name ?? p.branchId }))} value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} />
        ) : null}

        {!position ? (
          <p className="crm-eco-inv-drawer__hint">No inventory position for this branch.</p>
        ) : (
          <>
            {position.source === 'spreadsheet' ? (
              <p className="crm-eco-inv-drawer__hint">Spreadsheet-maintained — adjustments here apply immediately, but the next inventory-only re-import will overwrite these values from the uploaded file.</p>
            ) : null}

            <Textarea label="Reason for this change" required value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. New batch received, sold at branch, stock count correction…" />

            <div className="crm-eco-inv-drawer__quick-adjust">
              <Input label={`Adjust by (${position.primaryUnit.toLowerCase()})`} type="number" min={1} value={delta} onChange={(e) => setDelta(e.target.value)} />
              <Button variant="secondary" disabled={!reason.trim() || Number(delta) <= 0} onClick={() => addOrReduce('add')}>Add stock</Button>
              <Button variant="secondary" disabled={!reason.trim() || Number(delta) <= 0} onClick={() => addOrReduce('reduce')}>Reduce stock</Button>
            </div>

            <Input label={`Set exact quantity (${position.primaryUnit.toLowerCase()})`} type="number" min={0} value={primaryQty} onChange={(e) => setPrimaryQty(e.target.value)} />
            {position.secondaryUnit ? (
              <Input label={`Quantity (${position.secondaryUnit.toLowerCase()})`} type="number" min={0} value={secondaryQty} onChange={(e) => setSecondaryQty(e.target.value)} />
            ) : null}

            <div className="crm-eco-inv-drawer__state-actions">
              <Button variant="secondary" disabled={!reason.trim()} onClick={() => save(true)}>Mark unavailable</Button>
              <Button variant="secondary" disabled={!reason.trim() || position.madeToOrder} onClick={markMadeToOrder}>Mark made-to-order</Button>
            </div>

            {history.length > 0 ? (
              <div className="crm-eco-inv-drawer__history">
                <h3>Recent activity</h3>
                <ul>
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <span>{new Date(entry.at).toLocaleDateString('en-IN')}</span>
                      <span>{entry.action}</span>
                      <span>{entry.reason || formatQuantity(entry.delta ?? 0, entry.unit)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Drawer>
  );
}
