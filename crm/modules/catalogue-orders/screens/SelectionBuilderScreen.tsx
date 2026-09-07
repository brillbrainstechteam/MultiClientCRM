import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { contacts, findContact } from '@crm/mock-data';
import {
  Badge,
  Button,
  ErrorState,
  Input,
  PermissionRestricted,
  Select,
  Textarea,
} from '@crm/design-system';
import { PriceDisplay, SourceModeBadge } from '../components';
import { approvalsForEntity, catalogues, createApproval, createOrderFromSelection, createSelection, decideApproval, findCatalogue, findItem, findSelection, updateSelection } from '../data';
import type { SavedSelection, SelectionLine, SelectionStatus } from '../domain/types';
import { approvalStatusLabel, approvalStatusTone, selectionStatusLabel } from '../catalogue-orders-labels';
import { can } from '../permissions';

const statusOptions: { value: SelectionStatus; label: string }[] = (Object.keys(selectionStatusLabel) as SelectionStatus[]).map((value) => ({ value, label: selectionStatusLabel[value] }));

/** ECO-S16 — Selection / Cart Builder. Same builder for B2B Saved Selections and B2C carts. */
export default function SelectionBuilderScreen() {
  const { selectionId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams] = useSearchParams();
  const { role, currentUser, branchId } = useWorkspace();

  const queryItemIds = (searchParams.get('itemIds') ?? '').split(',').filter(Boolean);
  const queryContactId = searchParams.get('contactId');
  const [approvalNote, setApprovalNote] = useState('');

  const [selection, setSelection] = useState<SavedSelection | null>(() => {
    if (selectionId) return findSelection(selectionId) ?? null;
    const firstItem = queryItemIds[0] ? findItem(queryItemIds[0]) : undefined;
    const catalogue = firstItem ? findCatalogue(firstItem.catalogueId) : catalogues[0];
    if (!catalogue) return null;
    const created = createSelection({
      intent: catalogue.businessMode === 'b2c' ? 'cart' : 'selection',
      catalogueId: catalogue.id,
      contactId: queryContactId ?? '',
      conversationId: null,
      ownerId: currentUser.id,
      branchId: branchId === 'all' ? catalogue.branchIds[0] : branchId,
      eventSource: 'Manual',
    });
    for (const itemId of queryItemIds) {
      const item = findItem(itemId);
      if (!item) continue;
      created.items.push({ itemId, variantId: null, quantityPieces: 1, quantityWeightGm: typeof item.attributes.grossWeightGm === 'number' ? item.attributes.grossWeightGm : null, priceAtSelection: item.price.amount, notes: '' });
    }
    recompute(created);
    return created;
  });

  useEffect(() => {
    if (!selectionId && selection) {
      navigate(scopedHref(`/catalogue-orders/selections/${selection.id}`), { replace: true });
    }
    // Only runs once on mount for the "new" route — the draft is created in useState's initializer above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (selectionId && !selection) {
    return (
      <ErrorState
        title="Selection not found"
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/selections'))}>Back to Selections &amp; Carts</Button>}
      />
    );
  }
  if (!selection) {
    return (
      <ErrorState
        title="No catalogue available"
        description="Create a catalogue before starting a selection or cart."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>Back to Catalogues</Button>}
      />
    );
  }
  if (!can(role, 'selection.create')) {
    return (
      <PermissionRestricted
        title="You do not have access to this action"
        description="Creating and editing Saved Selections and carts is restricted for your role."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/selections'))}>Back to Selections &amp; Carts</Button>}
      />
    );
  }

  const safeSelection = selection;
  const catalogue = findCatalogue(safeSelection.catalogueId);
  const contact = findContact(safeSelection.contactId);
  const isCart = safeSelection.intent === 'cart';

  const approvals = approvalsForEntity('selection', safeSelection.id);
  const pendingApproval = approvals.find((a) => a.status === 'pending');
  const canDecideApproval = can(role, 'approval.approve');

  function requestDiscountApproval() {
    if (!approvalNote.trim()) return;
    createApproval({
      type: 'discount',
      entityType: 'selection',
      entityId: safeSelection.id,
      entityLabel: `Selection — ${catalogue?.name ?? safeSelection.catalogueId} (${contact?.name ?? safeSelection.contactId})`,
      requestedById: currentUser.id,
      requesterNote: approvalNote,
      thresholdLabel: 'Discounts beyond the published offer require owner approval.',
    });
    setApprovalNote('');
  }

  function decideSelectionApproval(id: string, status: 'approved' | 'rejected') {
    decideApproval(id, status, currentUser.id, status === 'approved' ? 'Approved.' : 'Rejected.');
    setSelection({ ...safeSelection });
  }

  function recompute(next: SavedSelection) {
    next.requestedPieces = next.items.reduce((sum, line) => sum + (line.quantityPieces ?? 0), 0) || (next.items.length ? next.requestedPieces : null);
    next.requestedWeightGm = next.items.some((l) => l.quantityWeightGm != null) ? next.items.reduce((sum, line) => sum + (line.quantityWeightGm ?? 0), 0) : null;
  }

  function persist(patch: Partial<SavedSelection>) {
    const updated = updateSelection(safeSelection.id, patch) ?? safeSelection;
    setSelection({ ...updated });
  }

  function updateLine(itemId: string, patch: Partial<SelectionLine>) {
    const items = safeSelection.items.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line));
    const next = { ...safeSelection, items };
    recompute(next);
    persist({ items: next.items, requestedPieces: next.requestedPieces, requestedWeightGm: next.requestedWeightGm });
  }

  function removeLine(itemId: string) {
    const items = safeSelection.items.filter((line) => line.itemId !== itemId);
    const next = { ...safeSelection, items };
    recompute(next);
    persist({ items: next.items, requestedPieces: next.requestedPieces, requestedWeightGm: next.requestedWeightGm });
  }

  function setContact(contactId: string) {
    persist({ contactId });
  }

  function addItems() {
    navigate(scopedHref('/catalogue-orders/picker', { catalogueId: safeSelection.catalogueId, mode: 'multi', returnTo: `/catalogue-orders/selections/${safeSelection.id}` }));
  }

  function share() {
    persist({ status: 'shared', sharedAt: safeSelection.sharedAt ?? new Date().toISOString() });
    navigate(scopedHref('/catalogue-orders/share', { itemIds: safeSelection.items.map((l) => l.itemId).join(','), contactId: safeSelection.contactId }));
  }

  function convert() {
    const order = createOrderFromSelection(safeSelection, catalogue?.connectorId ?? null);
    persist({ status: 'converted', orderId: order.id });
    navigate(scopedHref(`/catalogue-orders/orders/${order.id}`));
  }

  return (
    <div className="crm-eco-selbuilder">
      <PageHeader
        breadcrumbs={[{ label: 'Selections & Carts', to: scopedHref('/catalogue-orders/selections') }, { label: isCart ? 'Cart' : 'Selection' }]}
        title={isCart ? 'Cart' : 'Saved Selection'}
        description={catalogue ? `${catalogue.name} · ${catalogue.businessMode.toUpperCase()}` : undefined}
        actions={
          <>
            {catalogue ? <SourceModeBadge mode={catalogue.sourceMode} /> : null}
            <Badge tone="neutral" appearance="outline">{selectionStatusLabel[selection.status]}</Badge>
          </>
        }
      />

      <div className="crm-eco-selbuilder__grid">
        <section className="crm-eco-selbuilder__card">
          <h2 className="crm-eco-selbuilder__section-title">Contact</h2>
          {selection.contactId ? (
            <p className="crm-eco-selbuilder__contact">{contact?.name ?? selection.contactId}</p>
          ) : (
            <Select
              label="Assign a contact"
              options={[{ value: '', label: 'Choose a contact…' }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]}
              value={selection.contactId}
              onChange={(e) => setContact(e.target.value)}
            />
          )}
          <p className="crm-eco-selbuilder__event-source">Source: {selection.eventSource}</p>

          <h2 className="crm-eco-selbuilder__section-title">Status</h2>
          <Select label="Status" options={statusOptions} value={selection.status} onChange={(e) => persist({ status: e.target.value as SelectionStatus })} />

          <h2 className="crm-eco-selbuilder__section-title">Notes</h2>
          <Textarea label="Notes" hideLabel value={selection.notes} onChange={(e) => persist({ notes: e.target.value })} rows={3} />

          <h2 className="crm-eco-selbuilder__section-title">Approvals</h2>
          {approvals.length === 0 ? (
            <p className="crm-eco-selbuilder__empty">No approval requests on this selection.</p>
          ) : (
            approvals.map((a) => (
              <div key={a.id} className="crm-eco-selbuilder__approval">
                <Badge tone={approvalStatusTone[a.status]}>{approvalStatusLabel[a.status]}</Badge>
                <p className="crm-eco-selbuilder__event-source">{a.requesterNote}</p>
                {a.status === 'pending' && canDecideApproval ? (
                  <div className="crm-eco-selbuilder__approval-actions">
                    <Button variant="secondary" size="sm" onClick={() => decideSelectionApproval(a.id, 'rejected')}>Reject</Button>
                    <Button variant="primary" size="sm" onClick={() => decideSelectionApproval(a.id, 'approved')}>Approve</Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
          {can(role, 'orderRequest.create') && !pendingApproval ? (
            <div className="crm-eco-selbuilder__approval-request">
              <Textarea label="Request a discount above the offer price" hideLabel value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} rows={2} placeholder="e.g. Customer asked for an additional 5% off…" />
              <Button variant="secondary" size="sm" disabled={!approvalNote.trim()} onClick={requestDiscountApproval}>Request approval</Button>
            </div>
          ) : null}
        </section>

        <section className="crm-eco-selbuilder__card crm-eco-selbuilder__card--wide">
          <div className="crm-eco-selbuilder__items-header">
            <h2 className="crm-eco-selbuilder__section-title">Items</h2>
            <Button variant="secondary" size="sm" iconLeft={<Plus />} onClick={addItems}>Add items</Button>
          </div>

          {selection.items.length === 0 ? (
            <p className="crm-eco-selbuilder__empty">No items yet — add items from the catalogue picker.</p>
          ) : (
            <table className="crm-eco-selbuilder__table">
              <thead><tr><th>Item</th><th>Pieces</th><th>Weight (gm)</th><th>Price</th><th></th></tr></thead>
              <tbody>
                {selection.items.map((line) => {
                  const item = findItem(line.itemId);
                  return (
                    <tr key={line.itemId}>
                      <td>{item?.title ?? line.itemId}</td>
                      <td><Input label="Pieces" hideLabel type="number" min={0} value={line.quantityPieces ?? ''} onChange={(e) => updateLine(line.itemId, { quantityPieces: e.target.value ? Number(e.target.value) : null })} /></td>
                      <td><Input label="Weight" hideLabel type="number" min={0} value={line.quantityWeightGm ?? ''} onChange={(e) => updateLine(line.itemId, { quantityWeightGm: e.target.value ? Number(e.target.value) : null })} /></td>
                      <td>{item ? <PriceDisplay price={item.price} /> : '—'}</td>
                      <td><Button variant="ghost" size="sm" onClick={() => removeLine(line.itemId)} aria-label="Remove item"><Trash2 size={14} /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <p className="crm-eco-selbuilder__totals">
            Requested: {selection.requestedPieces ?? 0} pcs{selection.requestedWeightGm != null ? ` · ${selection.requestedWeightGm} gm` : ''}
          </p>
        </section>
      </div>

      <div className="crm-eco-selbuilder__actions">
        <Button variant="secondary" disabled={selection.items.length === 0 || !selection.contactId} onClick={share}>Share</Button>
        {can(role, isCart ? 'orderRequest.create' : 'orderRequest.create') && selection.items.length > 0 && selection.status !== 'converted' ? (
          <Button variant="primary" iconRight={<ArrowRight />} onClick={convert}>
            {isCart ? 'Proceed to checkout' : 'Convert to Order Request'}
          </Button>
        ) : null}
        {selection.orderId ? (
          <Button variant="ghost" onClick={() => navigate(scopedHref(`/catalogue-orders/orders/${selection.orderId}`))}>View order</Button>
        ) : null}
      </div>
    </div>
  );
}
