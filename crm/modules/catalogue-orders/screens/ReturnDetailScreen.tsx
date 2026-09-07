import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { findContact, findUser } from '@crm/mock-data';
import { Badge, Banner, Button, ErrorState, Input, Select, Textarea } from '@crm/design-system';
import { approvalsForEntity, createApproval, createReturnCase, decideApproval, findConnector, findOrder, findReturnCase, updateOrder, updateReturnCase } from '../data';
import { hasCapability, type ReturnCase, type ReturnLine, type ReturnStatus, type ReturnType as ReturnCaseType } from '../domain/types';
import { approvalStatusLabel, approvalStatusTone } from '../catalogue-orders-labels';
import { orderSourceLabel, refundStatusLabel, refundStatusTone, returnStatusLabel, returnStatusTone, returnTypeLabel } from '../catalogue-orders-labels';
import { can, isRestrictedRole } from '../permissions';

const typeOptions: { value: ReturnCaseType; label: string }[] = [
  { value: 'return', label: 'Return' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'refund-only', label: 'Refund only' },
];

/** ECO-S25 — Return / Replacement Detail. Handles both "record request" (new) and stage tracking (existing case). */
export default function ReturnDetailScreen() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { currentUser } = useWorkspace();
  const [searchParams] = useSearchParams();
  const [, forceRerender] = useState(0);
  const refresh = () => forceRerender((n) => n + 1);

  const existing = returnId ? findReturnCase(returnId) : undefined;

  if (returnId && !existing) {
    return (
      <ErrorState
        title="Case not found"
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/returns'))}>Back to Returns &amp; Exceptions</Button>}
      />
    );
  }

  if (existing) {
    return <ExistingCase returnCase={existing} onChange={refresh} />;
  }

  const orderId = searchParams.get('orderId');
  const order = orderId ? findOrder(orderId) : undefined;

  if (!order) {
    return (
      <ErrorState
        title="Choose an order to record a return against"
        description="Open Returns & Exceptions from an eligible order's detail page to record a return, replacement or refund-only request."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/orders'))}>Back to Orders</Button>}
      />
    );
  }

  return <NewCaseForm order={order} ownerId={currentUser.id} ownerLabel={currentUser.name} />;
}

function NewCaseForm({ order, ownerId, ownerLabel }: { order: NonNullable<ReturnType<typeof findOrder>>; ownerId: string; ownerLabel: string }) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const contact = findContact(order.contactId);
  const lines = order.confirmedSnapshot ?? order.requestedSnapshot;

  const [type, setType] = useState<ReturnCaseType>('return');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(lines.length === 1 ? [lines[0].itemId] : []);
  const [reasonNotes, setReasonNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const eligible = order.fulfilment.status === 'delivered';

  function toggleItem(itemId: string) {
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  }

  function submit(overrideIneligible: boolean) {
    const items: ReturnLine[] = lines
      .filter((l) => selectedItemIds.includes(l.itemId))
      .map((l) => ({ itemId: l.itemId, variantId: l.variantId, quantity: l.quantityPieces ?? 1, reason: reasonNotes }));
    const returnCase = createReturnCase({
      orderId: order.id,
      contactId: order.contactId,
      type,
      items,
      reasonNotes,
      ownerId,
      ownerLabel,
      eligibility: eligible ? 'eligible' : overrideIneligible ? 'override' : 'ineligible',
    });
    if (evidenceUrl.trim()) returnCase.evidenceUrls.push(evidenceUrl.trim());
    navigate(scopedHref(`/catalogue-orders/returns/${returnCase.id}`));
  }

  return (
    <div className="crm-eco-returndetail">
      <PageHeader
        breadcrumbs={[{ label: 'Returns & Exceptions', to: scopedHref('/catalogue-orders/returns') }, { label: 'Record request' }]}
        title="Record return / replacement request"
        description={`Order ${order.externalOrderId ?? order.id} · ${contact?.name ?? order.contactId}`}
      />

      {!eligible ? (
        <Banner tone="warning" title="Not yet eligible" description="This order has not been marked delivered — the default return window has not started. An authorised override can still record the request." />
      ) : null}

      <div className="crm-eco-returndetail__card">
        <Select label="Type" options={typeOptions} value={type} onChange={(e) => setType(e.target.value as ReturnCaseType)} />

        <h2 className="crm-eco-returndetail__title">Items</h2>
        <ul className="crm-eco-returndetail__item-picklist">
          {lines.map((l) => (
            <li key={l.itemId}>
              <label>
                <input type="checkbox" checked={selectedItemIds.includes(l.itemId)} onChange={() => toggleItem(l.itemId)} />
                {l.title} {l.quantityPieces ? `× ${l.quantityPieces}` : ''}
              </label>
            </li>
          ))}
        </ul>

        <Textarea label="Reason" required value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} rows={3} placeholder="Why is the customer requesting this?" />
        <Input label="Evidence URL (optional)" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Photo/video link shared by the customer" />
      </div>

      <div className="crm-eco-returndetail__actions">
        <Button variant="secondary" onClick={() => navigate(scopedHref(`/catalogue-orders/orders/${order.id}`))}>Cancel</Button>
        {eligible ? (
          <Button variant="primary" disabled={selectedItemIds.length === 0 || !reasonNotes.trim()} onClick={() => submit(false)}>Create request</Button>
        ) : (
          <>
            <Button variant="secondary" disabled={selectedItemIds.length === 0 || !reasonNotes.trim()} onClick={() => submit(false)}>Reject as ineligible</Button>
            <Button variant="primary" disabled={selectedItemIds.length === 0 || !reasonNotes.trim()} onClick={() => submit(true)}>Override &amp; create request</Button>
          </>
        )}
      </div>
    </div>
  );
}

const nextStageStatus: Partial<Record<ReturnStatus, ReturnStatus>> = {
  requested: 'approved',
  approved: 'collection-scheduled',
  'collection-scheduled': 'collected',
  collected: 'received',
  'received-mismatch': 'received',
};

const stageActionLabel: Partial<Record<ReturnStatus, string>> = {
  requested: 'Approve',
  approved: 'Schedule collection',
  'collection-scheduled': 'Mark collected',
  collected: 'Mark received',
  'received-mismatch': 'Resolve mismatch',
};

function ExistingCase({ returnCase, onChange }: { returnCase: ReturnCase; onChange: () => void }) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const [mismatchNote, setMismatchNote] = useState('');
  const [manualRefundNote, setManualRefundNote] = useState('');
  const [approvalNote, setApprovalNote] = useState('');

  const order = findOrder(returnCase.orderId);
  const contact = findContact(returnCase.contactId);
  const owner = findUser(returnCase.ownerId);
  const connector = order ? findConnector(order.connectorId) : undefined;
  const canOperate = !isRestrictedRole(role);
  const canDecide = can(role, 'approval.approve');
  const canRefund = can(role, 'refund.request');

  const refundApprovals = approvalsForEntity('return', returnCase.id);
  const pendingRefundApproval = refundApprovals.find((a) => a.status === 'pending');
  const refundApproved = refundApprovals.some((a) => a.status === 'approved');

  function requestRefundApproval() {
    createApproval({
      type: 'refund',
      entityType: 'return',
      entityId: returnCase.id,
      entityLabel: `Return — ${returnCase.id}`,
      requestedById: currentUser.id,
      requesterNote: approvalNote || `Manual refund for ${returnCase.id} pending finance sign-off.`,
      thresholdLabel: 'Manual refunds over ₹5,000 require finance sign-off.',
    });
    setApprovalNote('');
    onChange();
  }

  function decideRefundApproval(status: 'approved' | 'rejected') {
    if (!pendingRefundApproval) return;
    decideApproval(pendingRefundApproval.id, status, currentUser.id, status === 'approved' ? 'Approved by finance.' : 'Rejected.');
    onChange();
  }

  function log(action: string, detail: string) {
    returnCase.timeline.push({ id: `ret_${returnCase.id}_${returnCase.timeline.length + 1}`, at: new Date().toISOString(), actorId: currentUser.id, actorLabel: currentUser.name, action, detail, source: 'manual' });
  }

  function advanceStage() {
    // 'collected' branches to received/received-mismatch via the explicit buttons below, not this generic action.
    const next = nextStageStatus[returnCase.status];
    if (!next || returnCase.status === 'collected') return;
    const patch: Partial<ReturnCase> = { status: next };
    if (next === 'collection-scheduled') patch.collectionScheduledAt = new Date(Date.now() + 3 * 86400000).toISOString();
    updateReturnCase(returnCase.id, patch);
    log(stageActionLabel[returnCase.status] ?? 'Advanced', '');
    onChange();
  }

  function markReceived(mismatch: boolean) {
    updateReturnCase(returnCase.id, { status: mismatch ? 'received-mismatch' : 'received' });
    log(mismatch ? 'Received — quantity/condition mismatch' : 'Received', mismatchNote);
    setMismatchOpen(false);
    setMismatchNote('');
    onChange();
  }

  function reject() {
    updateReturnCase(returnCase.id, { status: 'rejected' });
    log('Rejected', rejectReason);
    setRejectOpen(false);
    setRejectReason('');
    onChange();
  }

  function shipReplacement() {
    updateReturnCase(returnCase.id, { status: 'replacement-shipped' });
    log('Replacement shipped', 'Replacement dispatched to customer.');
    onChange();
  }

  function replacementUnavailable() {
    updateReturnCase(returnCase.id, { type: 'refund-only' });
    log('Replacement unavailable', 'Converted to refund-only — offering refund alternative to customer.');
    onChange();
  }

  function initiateRefund() {
    const gatewayCapable = order?.connectorId ? hasCapability(connector, 'refunds.initiate') : false;
    const amount = order?.commercialSummary.total ?? null;
    updateReturnCase(returnCase.id, {
      refundMethod: gatewayCapable ? 'gateway' : 'manual',
      refundAmount: amount,
      refundStatus: gatewayCapable ? 'processing' : connector ? 'unsupported-by-connector' : 'manual-confirmation-required',
    });
    log('Refund initiated', gatewayCapable ? 'Gateway refund submitted.' : connector ? `${connector.name} does not support refunds.initiate — recording manual refund instead.` : 'Manual refund — no connected gateway for this catalogue.');
    onChange();
  }

  function confirmManualRefund() {
    updateReturnCase(returnCase.id, { refundStatus: 'success' });
    if (order) updateOrder(order.id, { payment: { ...order.payment, status: 'refunded' } });
    log('Manual refund confirmed', manualRefundNote || 'Confirmed by finance.');
    setManualRefundNote('');
    onChange();
  }

  function closeCase() {
    updateReturnCase(returnCase.id, { status: 'closed' });
    log('Closed', '');
    onChange();
  }

  const canClose = ['replacement-shipped', 'rejected'].includes(returnCase.status) || (returnCase.status === 'received' && returnCase.refundStatus === 'success') || (returnCase.type === 'refund-only' && returnCase.refundStatus === 'success');
  const canShowRefundAction = canRefund && !returnCase.refundStatus && (returnCase.type === 'refund-only' ? returnCase.status === 'approved' || returnCase.status === 'requested' : returnCase.status === 'received' || returnCase.status === 'received-mismatch');

  return (
    <div className="crm-eco-returndetail">
      <PageHeader
        breadcrumbs={[{ label: 'Returns & Exceptions', to: scopedHref('/catalogue-orders/returns') }, { label: returnCase.id }]}
        title={returnTypeLabel[returnCase.type]}
        description={order ? `${orderSourceLabel[order.source]} · Order ${order.externalOrderId ?? order.id} · ${contact?.name ?? returnCase.contactId}` : returnCase.contactId}
        actions={
          <>
            <Badge tone={returnStatusTone[returnCase.status]}>{returnStatusLabel[returnCase.status]}</Badge>
            {returnCase.refundStatus ? <Badge tone={refundStatusTone[returnCase.refundStatus]} appearance="outline">{refundStatusLabel[returnCase.refundStatus]}</Badge> : null}
          </>
        }
      />

      {returnCase.eligibility !== 'eligible' ? (
        <Banner tone={returnCase.eligibility === 'override' ? 'info' : 'warning'} title={returnCase.eligibility === 'override' ? 'Recorded via authorised override' : 'Ineligible request'} description={returnCase.reasonNotes} />
      ) : null}

      <div className="crm-eco-returndetail__grid">
        <section className="crm-eco-returndetail__card">
          <h2 className="crm-eco-returndetail__title">Request</h2>
          <ul className="crm-eco-returndetail__items">
            {returnCase.items.map((item, i) => <li key={i}>{item.itemId} × {item.quantity} — {item.reason}</li>)}
          </ul>
          <p className="crm-eco-returndetail__notes">{returnCase.reasonNotes}</p>
          {returnCase.evidenceUrls.length > 0 ? (
            <ul className="crm-eco-returndetail__evidence">
              {returnCase.evidenceUrls.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>)}
            </ul>
          ) : <p className="crm-eco-returndetail__hint">No evidence attached.</p>}
          <p className="crm-eco-returndetail__hint">Owner: {owner?.name ?? returnCase.ownerId}</p>
        </section>

        <section className="crm-eco-returndetail__card">
          <h2 className="crm-eco-returndetail__title">Refund</h2>
          {returnCase.refundMethod ? (
            <dl className="crm-eco-returndetail__deflist">
              <div><dt>Method</dt><dd>{returnCase.refundMethod === 'gateway' ? 'Gateway' : 'Manual'}</dd></div>
              <div><dt>Amount</dt><dd>{returnCase.refundAmount != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(returnCase.refundAmount) : '—'}</dd></div>
            </dl>
          ) : <p className="crm-eco-returndetail__hint">No refund initiated yet.</p>}
          {canShowRefundAction ? <Button variant="secondary" size="sm" onClick={initiateRefund}>Initiate refund</Button> : null}
          {returnCase.refundStatus === 'manual-confirmation-required' ? (
            <div className="crm-eco-returndetail__drawer-form">
              {pendingRefundApproval ? (
                <>
                  <Badge tone={approvalStatusTone[pendingRefundApproval.status]}>{approvalStatusLabel[pendingRefundApproval.status]} — {pendingRefundApproval.thresholdLabel}</Badge>
                  {canDecide ? (
                    <div className="crm-eco-orderdetail__drawer-actions">
                      <Button variant="secondary" size="sm" onClick={() => decideRefundApproval('rejected')}>Reject</Button>
                      <Button variant="primary" size="sm" onClick={() => decideRefundApproval('approved')}>Approve</Button>
                    </div>
                  ) : (
                    <p className="crm-eco-returndetail__hint">Awaiting finance approval before this manual refund can be confirmed.</p>
                  )}
                </>
              ) : refundApproved ? (
                <Badge tone="success">Approved by finance</Badge>
              ) : canRefund ? (
                <>
                  <p className="crm-eco-returndetail__hint">Manual refunds require finance sign-off before confirmation (ECO-S27).</p>
                  <Textarea label="Approval note" hideLabel value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} rows={2} placeholder="Why this refund needs sign-off…" />
                  <Button variant="secondary" size="sm" onClick={requestRefundApproval}>Request approval</Button>
                </>
              ) : null}
              {refundApproved && canRefund ? (
                <>
                  <Textarea label="Confirmation note" hideLabel value={manualRefundNote} onChange={(e) => setManualRefundNote(e.target.value)} rows={2} placeholder="Bank transfer reference, confirmed by…" />
                  <Button variant="primary" size="sm" onClick={confirmManualRefund}>Confirm manual refund</Button>
                </>
              ) : null}
            </div>
          ) : null}
          {returnCase.refundStatus === 'unsupported-by-connector' ? <p className="crm-eco-returndetail__hint">{connector?.name} does not support refunds.initiate — record the refund manually once completed outside the CRM.</p> : null}
        </section>

        <section className="crm-eco-returndetail__card crm-eco-returndetail__card--wide">
          <h2 className="crm-eco-returndetail__title">Timeline</h2>
          <ul className="crm-eco-returndetail__timeline">
            {[...returnCase.timeline].reverse().map((event) => (
              <li key={event.id}>
                <span>{new Date(event.at).toLocaleString('en-IN')}</span>
                <span className="crm-eco-returndetail__timeline-action">{event.action}</span>
                <span>{event.detail}</span>
                <span>{event.actorLabel}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="crm-eco-returndetail__actions">
        {order ? <Button variant="ghost" onClick={() => navigate(scopedHref(`/catalogue-orders/orders/${order.id}`))}>View order</Button> : null}

        {returnCase.status === 'requested' && canDecide ? (
          <>
            <Button variant="secondary" onClick={() => setRejectOpen((v) => !v)}>Reject</Button>
            <Button variant="primary" onClick={advanceStage}>Approve</Button>
          </>
        ) : null}
        {rejectOpen ? (
          <div className="crm-eco-returndetail__inline-form">
            <Textarea label="Rejection reason" required value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
            <Button variant="danger" size="sm" disabled={!rejectReason.trim()} onClick={reject}>Confirm reject</Button>
          </div>
        ) : null}

        {['approved', 'collection-scheduled'].includes(returnCase.status) && canOperate ? (
          <Button variant="secondary" onClick={advanceStage}>{stageActionLabel[returnCase.status]}</Button>
        ) : null}

        {returnCase.status === 'collected' && canOperate ? (
          <>
            <Button variant="secondary" onClick={() => markReceived(false)}>Mark received</Button>
            <Button variant="secondary" onClick={() => setMismatchOpen((v) => !v)}>Mark received — mismatch</Button>
          </>
        ) : null}
        {mismatchOpen ? (
          <div className="crm-eco-returndetail__inline-form">
            <Textarea label="Mismatch note" required value={mismatchNote} onChange={(e) => setMismatchNote(e.target.value)} rows={2} placeholder="e.g. 14 of 16 pieces received" />
            <Button variant="secondary" size="sm" disabled={!mismatchNote.trim()} onClick={() => markReceived(true)}>Confirm mismatch</Button>
          </div>
        ) : null}
        {returnCase.status === 'received-mismatch' && canOperate ? <Button variant="secondary" onClick={advanceStage}>Resolve mismatch — received</Button> : null}

        {['received', 'received-mismatch'].includes(returnCase.status) && returnCase.type === 'replacement' && canOperate ? (
          <>
            <Button variant="primary" onClick={shipReplacement}>Ship replacement</Button>
            <Button variant="ghost" onClick={replacementUnavailable}>Replacement unavailable — offer refund</Button>
          </>
        ) : null}

        {canClose && canOperate ? <Button variant="secondary" onClick={closeCase}>Close case</Button> : null}
      </div>
    </div>
  );
}
