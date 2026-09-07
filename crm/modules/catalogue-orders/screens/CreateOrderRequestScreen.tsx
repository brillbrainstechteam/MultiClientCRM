import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { contacts, findContact } from '@crm/mock-data';
import { Button, ErrorState, Input, PermissionRestricted, Select, Textarea } from '@crm/design-system';
import { PriceDisplay, SourceModeBadge } from '../components';
import { catalogues, createManualOrderRequest, findCatalogue, findConnector, findItem } from '../data';
import type { PriceMode } from '../domain/types';
import { can } from '../permissions';

interface DraftLine {
  itemId: string;
  title: string;
  quantityPieces: number | null;
  quantityWeightGm: number | null;
  priceMode: PriceMode;
  unitPrice: number | null;
}

/** ECO-S21 — Create Order Request. B2B/connector-aware manual creation without a preceding Saved Selection. */
export default function CreateOrderRequestScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser, branchId } = useWorkspace();
  const [searchParams] = useSearchParams();
  const processedItemIds = useRef('');

  const [catalogueId, setCatalogueId] = useState(searchParams.get('catalogueId') ?? '');
  const [contactId, setContactId] = useState(searchParams.get('contactId') ?? '');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [notes, setNotes] = useState('');

  const catalogue = findCatalogue(catalogueId);
  const contact = contactId ? findContact(contactId) : undefined;
  const connector = catalogue ? findConnector(catalogue.connectorId) : undefined;

  useEffect(() => {
    const raw = searchParams.get('itemIds');
    if (!raw || raw === processedItemIds.current) return;
    processedItemIds.current = raw;
    const ids = raw.split(',').filter(Boolean);
    setLines((prev) => {
      const existing = new Set(prev.map((l) => l.itemId));
      const added: DraftLine[] = ids
        .filter((id) => !existing.has(id))
        .map((id) => findItem(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => ({
          itemId: item.id,
          title: item.title,
          quantityPieces: 1,
          quantityWeightGm: typeof item.attributes.grossWeightGm === 'number' ? item.attributes.grossWeightGm : null,
          priceMode: item.price.mode,
          unitPrice: item.price.amount,
        }));
      return [...prev, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (catalogue && !selectedBranchId) {
      setSelectedBranchId(branchId === 'all' ? catalogue.branchIds[0] ?? '' : branchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue]);

  if (!can(role, 'orderRequest.create')) {
    return (
      <PermissionRestricted
        title="You do not have access to this action"
        description="Creating order requests is restricted for your role."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/orders'))}>Back to Orders</Button>}
      />
    );
  }

  if (catalogues.length === 0) {
    return (
      <ErrorState
        title="No catalogue available"
        description="Create a catalogue before starting an order request."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>Back to Catalogues</Button>}
      />
    );
  }

  function updateLine(itemId: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));
  }

  function removeLine(itemId: string) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function addItems() {
    navigate(scopedHref('/catalogue-orders/picker', { catalogueId, mode: 'multi', source: 'catalogue-orders', returnTo: `/catalogue-orders/orders/new?catalogueId=${catalogueId}${contactId ? `&contactId=${contactId}` : ''}` }));
  }

  const canSubmit = Boolean(catalogueId && contactId && lines.length > 0);

  function submit() {
    if (!canSubmit || !catalogue) return;
    const order = createManualOrderRequest({
      catalogueId,
      contactId,
      branchId: selectedBranchId || catalogue.branchIds[0] || 'branch_delhi',
      ownerId: currentUser.id,
      ownerLabel: currentUser.name,
      connectorId: catalogue.connectorId,
      lines,
      commercialNotes: notes,
    });
    navigate(scopedHref(`/catalogue-orders/orders/${order.id}`));
  }

  return (
    <div className="crm-eco-createorder">
      <PageHeader
        breadcrumbs={[{ label: 'Orders', to: scopedHref('/catalogue-orders/orders') }, { label: 'Create order request' }]}
        title="Create Order Request"
        description="Build a B2B order request for a customer without an existing Saved Selection — final rate/weight is confirmed before it becomes a firm order."
      />

      <div className="crm-eco-createorder__grid">
        <section className="crm-eco-createorder__card">
          <h2 className="crm-eco-createorder__section-title">Catalogue</h2>
          <Select
            label="Catalogue"
            hideLabel
            options={[{ value: '', label: 'Choose a catalogue…' }, ...catalogues.map((c) => ({ value: c.id, label: c.name }))]}
            value={catalogueId}
            onChange={(e) => { setCatalogueId(e.target.value); setSelectedBranchId(''); setLines([]); }}
          />
          {catalogue ? <SourceModeBadge mode={catalogue.sourceMode} /> : null}
          {connector ? <p className="crm-eco-createorder__hint">Connector: {connector.name}{!connector.capabilities['orders.create'] ? ' — does not accept orders.create; this stays a CRM request until manually pushed.' : ''}</p> : null}

          <h2 className="crm-eco-createorder__section-title">Customer</h2>
          {contact ? (
            <p className="crm-eco-createorder__contact">{contact.name}</p>
          ) : (
            <Select
              label="Assign a contact"
              options={[{ value: '', label: 'Choose a contact…' }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]}
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            />
          )}

          {catalogue && catalogue.branchIds.length > 1 ? (
            <>
              <h2 className="crm-eco-createorder__section-title">Branch</h2>
              <Select label="Branch" options={catalogue.branchIds.map((b) => ({ value: b, label: b.replace('branch_', '') }))} value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} />
            </>
          ) : null}

          <h2 className="crm-eco-createorder__section-title">Commercial notes</h2>
          <Textarea label="Notes" hideLabel value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g. Awaiting final rate confirmation, discount discussed with customer…" />
        </section>

        <section className="crm-eco-createorder__card crm-eco-createorder__card--wide">
          <div className="crm-eco-createorder__items-header">
            <h2 className="crm-eco-createorder__section-title">Items</h2>
            <Button variant="secondary" size="sm" iconLeft={<Plus />} onClick={addItems} disabled={!catalogueId}>Add items</Button>
          </div>

          {!catalogueId ? (
            <p className="crm-eco-createorder__empty">Choose a catalogue before adding items.</p>
          ) : lines.length === 0 ? (
            <p className="crm-eco-createorder__empty">No items yet — add items from the catalogue picker.</p>
          ) : (
            <table className="crm-eco-createorder__table">
              <thead><tr><th>Item</th><th>Pieces</th><th>Weight (gm)</th><th>Price</th><th></th></tr></thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.itemId}>
                    <td>{line.title}</td>
                    <td><Input label="Pieces" hideLabel type="number" min={0} value={line.quantityPieces ?? ''} onChange={(e) => updateLine(line.itemId, { quantityPieces: e.target.value ? Number(e.target.value) : null })} /></td>
                    <td><Input label="Weight" hideLabel type="number" min={0} value={line.quantityWeightGm ?? ''} onChange={(e) => updateLine(line.itemId, { quantityWeightGm: e.target.value ? Number(e.target.value) : null })} /></td>
                    <td><PriceDisplay price={{ mode: line.priceMode, amount: line.unitPrice, compareAtAmount: null, currency: 'INR' }} /></td>
                    <td><Button variant="ghost" size="sm" onClick={() => removeLine(line.itemId)} aria-label="Remove item"><Trash2 size={14} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="crm-eco-createorder__actions">
        <Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/orders'))}>Cancel</Button>
        <Button variant="primary" iconRight={<ArrowRight />} disabled={!canSubmit} onClick={submit}>Create order request</Button>
      </div>
    </div>
  );
}
