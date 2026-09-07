import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { useWorkspace } from '@crm/app/workspace-context';
import { findContact, findUser } from '@crm/mock-data';
import { Badge, Banner, Button, DataTable, EmptyState, SearchField, Select, type Column } from '@crm/design-system';
import { findCatalogue, selections } from '../data';
import type { SavedSelection } from '../domain/types';
import { selectionStatusLabel, selectionStatusTone } from '../catalogue-orders-labels';
import { can } from '../permissions';

const intentOptions = [
  { value: 'all', label: 'Selections & carts' },
  { value: 'selection', label: 'Saved Selections (B2B)' },
  { value: 'cart', label: 'Carts (B2C)' },
];

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'shared', label: 'Shared' },
  { value: 'customer-reviewing', label: 'Customer reviewing' },
  { value: 'revised', label: 'Revised' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed-lost', label: 'Closed / lost' },
  { value: 'abandoned', label: 'Abandoned' },
];

/** ECO-S15 — Saved Selections / Carts List. */
export default function SelectionsListScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, branchId } = useWorkspace();
  const [searchParams, patch] = useQueryPatch();

  const q = searchParams.get('q') ?? '';
  const intent = searchParams.get('intent') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const contactId = searchParams.get('contactId');
  const returnTo = searchParams.get('returnTo');
  const contact = contactId ? findContact(contactId) : undefined;

  const rows = useMemo(() => {
    return selections
      .filter((s) => branchId === 'all' || s.branchId === branchId)
      .filter((s) => !contactId || s.contactId === contactId)
      .filter((s) => intent === 'all' || s.intent === intent)
      .filter((s) => status === 'all' || s.status === status)
      .filter((s) => !q || findContact(s.contactId)?.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [branchId, contactId, intent, status, q]);

  const columns: Column<SavedSelection>[] = [
    { key: 'contact', header: 'Contact', render: (s) => findContact(s.contactId)?.name ?? s.contactId },
    { key: 'intent', header: 'Type', render: (s) => <Badge tone={s.intent === 'cart' ? 'info' : 'brand'} appearance="outline">{s.intent === 'cart' ? 'Cart' : 'Selection'}</Badge> },
    { key: 'catalogue', header: 'Catalogue', render: (s) => findCatalogue(s.catalogueId)?.name ?? '—' },
    { key: 'items', header: 'Items', align: 'right', render: (s) => String(s.items.length) },
    { key: 'qty', header: 'Requested', render: (s) => [s.requestedPieces != null ? `${s.requestedPieces} pcs` : null, s.requestedWeightGm != null ? `${s.requestedWeightGm} gm` : null].filter(Boolean).join(' · ') || '—' },
    { key: 'status', header: 'Status', render: (s) => <Badge tone={selectionStatusTone[s.status]}>{selectionStatusLabel[s.status]}</Badge> },
    { key: 'owner', header: 'Owner', render: (s) => findUser(s.ownerId)?.name ?? s.ownerId },
    { key: 'updated', header: 'Updated', render: (s) => new Date(s.updatedAt).toLocaleDateString('en-IN') },
  ];

  return (
    <div className="crm-eco-selections">
      <PageHeader
        title="Selections & Carts"
        description="B2B Saved Selections move to Order Requests; B2C carts move to checkout. Same list, same builder — the label adapts to what the customer actually does."
        breadcrumbs={contact ? [{ label: 'Catalogue & Orders', to: scopedHref('/catalogue-orders/catalogues') }, { label: `${contact.name} — selections & carts` }] : undefined}
        actions={
          can(role, 'selection.create') ? (
            <Button variant="primary" iconLeft={<Plus />} onClick={() => navigate(scopedHref('/catalogue-orders/selections/new'))}>
              New selection or cart
            </Button>
          ) : undefined
        }
      />

      {contact ? (
        <Banner
          tone="info"
          title={`Showing selections & carts for ${contact.name}.`}
          actions={<Button variant="ghost" size="sm" onClick={() => navigate(returnTo ? scopedHref(returnTo) : scopedHref('/catalogue-orders/selections'))}>{returnTo ? 'Back to customer' : 'Clear'}</Button>}
        />
      ) : null}

      <div className="crm-eco-selections__toolbar">
        <SearchField label="Search by contact" placeholder="Search by contact name…" width="240px" value={q} onChange={(e) => patch({ q: e.target.value || null })} />
        <Select label="Type" size="sm" options={intentOptions} value={intent} onChange={(e) => patch({ intent: e.target.value === 'all' ? null : e.target.value })} />
        <Select label="Status" size="sm" options={statusOptions} value={status} onChange={(e) => patch({ status: e.target.value === 'all' ? null : e.target.value })} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No selections or carts match" description="Try a different filter, or start a new one." actions={<Button variant="secondary" onClick={() => patch({ q: null, intent: null, status: null })}>Clear filters</Button>} />
      ) : (
        <DataTable caption="Selections and carts" columns={columns} rows={rows} rowKey={(s) => s.id} onRowClick={(s) => navigate(scopedHref(`/catalogue-orders/selections/${s.id}`))} />
      )}
    </div>
  );
}
