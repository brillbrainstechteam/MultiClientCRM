import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ExternalLink, Phone, MessageSquare, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { useWorkspace } from '@crm/app/workspace-context';
import { findBranch, findContact, findUser } from '@crm/mock-data';
import { Badge, Banner, Button, ConfirmDialog, Drawer, ErrorState, Input, Select, Textarea, Toast } from '@crm/design-system';
import { ConnectorStateBadge, PriceDisplay } from '../components';
import {
  appendOrderTimelineEvent,
  approvalsForEntity,
  createApproval,
  decideApproval,
  findCatalogue,
  findConnector,
  findOrder,
  findReturnCase,
  updateOrder,
} from '../data';
import { hasCapability, type ApprovalType, type OrderStatus, type PaymentRequestRecord } from '../domain/types';
import {
  approvalStatusLabel,
  approvalStatusTone,
  approvalTypeLabel,
  fulfilmentStatusLabel,
  fulfilmentStatusTone,
  orderSourceLabel,
  orderStatusLabel,
  orderStatusTone,
  orderSyncStatusLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from '../catalogue-orders-labels';
import { can, isRestrictedRole } from '../permissions';

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  draft: 'confirmed',
  'pending-confirmation': 'confirmed',
  'pending-sync': 'confirmed',
  confirmed: 'processing',
  processing: 'packed',
  packed: 'dispatched',
  dispatched: 'delivered',
};

const terminalStatuses: OrderStatus[] = ['dispatched', 'delivered', 'cancelled', 'returned'];

/** ECO-S20 — Order Detail. Synced commerce 360 for a CRM order request or a synchronized external order. */
export default function OrderDetailScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();
  const [searchParams, patch] = useQueryPatch();
  const [, forceRerender] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const order = orderId ? findOrder(orderId) : undefined;

  if (!order) {
    return (
      <ErrorState
        title="Order not found"
        description="This order may have been removed, or the link is out of date."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/orders'))}>Back to Orders</Button>}
      />
    );
  }

  const safeOrder = order;
  const catalogue = findCatalogue(order.catalogueId);
  const connector = findConnector(order.connectorId);
  const contact = findContact(order.contactId);
  const owner = findUser(order.ownerId);
  const branch = findBranch(order.branchId);
  const returnCase = order.returnCaseId ? findReturnCase(order.returnCaseId) : undefined;
  const pendingApproval = approvalsForEntity('order', order.id).find((a) => a.status === 'pending');
  const returnTo = `/catalogue-orders/orders/${order.id}`;

  const drawer = searchParams.get('drawer');
  const openDrawer = (name: string) => patch({ drawer: name });
  const closeDrawer = () => patch({ drawer: null });
  const refresh = (message?: string) => {
    forceRerender((n) => n + 1);
    if (message) setToast(message);
  };

  const canEditSourceOwned = !connector || hasCapability(connector, 'orders.update');
  const canAdvance = can(role, 'orderRequest.create') && canEditSourceOwned && Boolean(nextStatus[order.status]) && !terminalStatuses.includes(order.status);
  const canCancelDirectly = can(role, 'approval.approve') && (!connector || hasCapability(connector, 'orders.cancel'));
  const canRequestCancel = can(role, 'order.requestCancel') && !canCancelDirectly;
  const cancelEligible = !['dispatched', 'delivered', 'cancelled', 'returned'].includes(order.status) && !pendingApproval;
  const returnEligible = order.fulfilment.status === 'delivered' && !order.returnCaseId;

  function advance() {
    const next = nextStatus[safeOrder.status];
    if (!next) return;
    updateOrder(safeOrder.id, { status: next });
    appendOrderTimelineEvent(safeOrder.id, { at: new Date().toISOString(), actorId: currentUser.id, actorLabel: currentUser.name, action: `Advanced to ${orderStatusLabel[next]}`, detail: '', source: 'manual' });
    refresh(`Order moved to ${orderStatusLabel[next]}.`);
  }

  function resolveReconciliation() {
    updateOrder(safeOrder.id, { status: 'confirmed', syncStatus: 'synced' });
    appendOrderTimelineEvent(safeOrder.id, { at: new Date().toISOString(), actorId: currentUser.id, actorLabel: currentUser.name, action: 'Reconciliation resolved', detail: 'Manually matched to CRM contact and confirmed.', source: 'manual' });
    refresh('Order reconciled.');
  }

  function submitCancel() {
    if (canCancelDirectly) {
      updateOrder(safeOrder.id, { status: 'cancelled' });
      appendOrderTimelineEvent(safeOrder.id, { at: new Date().toISOString(), actorId: currentUser.id, actorLabel: currentUser.name, action: 'Cancelled', detail: cancelReason, source: 'manual' });
      refresh('Order cancelled.');
    } else {
      createApproval({
        type: 'cancel',
        entityType: 'order',
        entityId: safeOrder.id,
        entityLabel: `Order — ${safeOrder.externalOrderId ?? safeOrder.id}`,
        requestedById: currentUser.id,
        requesterNote: cancelReason,
        thresholdLabel: connector ? 'External source owns this order — cancellation must be requested and acknowledged.' : 'Cancellation requires manager approval.',
      });
      appendOrderTimelineEvent(safeOrder.id, { at: new Date().toISOString(), actorId: currentUser.id, actorLabel: currentUser.name, action: 'Requested cancellation approval', detail: cancelReason, source: 'manual' });
      refresh('Cancellation requested — pending approval.');
    }
    setCancelOpen(false);
    setCancelReason('');
  }

  return (
    <div className="crm-eco-orderdetail">
      <PageHeader
        breadcrumbs={[{ label: 'Orders', to: scopedHref('/catalogue-orders/orders') }, { label: order.externalOrderId ?? order.id }]}
        title={order.externalOrderId ?? order.id}
        description={`${orderSourceLabel[order.source]}${catalogue ? ` · ${catalogue.name}` : ''} · created ${new Date(order.createdAt).toLocaleDateString('en-IN')}`}
        actions={
          <>
            <Badge tone={orderStatusTone[order.status]}>{orderStatusLabel[order.status]}</Badge>
            {connector ? <ConnectorStateBadge state={connector.state} /> : <Badge tone="neutral" appearance="outline">CRM-owned</Badge>}
          </>
        }
      />

      {order.status === 'reconciliation-required' ? (
        <Banner
          tone="danger"
          title="Reconciliation required"
          description={order.commercialNotes || 'This synced order could not be automatically matched — review and confirm the linked customer and items.'}
          actions={!isRestrictedRole(role) ? <Button variant="primary" size="sm" onClick={resolveReconciliation}>Mark reconciled</Button> : undefined}
        />
      ) : null}

      {order.syncStatus === 'pending-sync' && order.status !== 'reconciliation-required' ? (
        <Banner tone="warning" title="Pending sync" description={`Waiting to push this order to ${connector?.name ?? 'the connected source'}.`} />
      ) : null}

      {pendingApproval ? (
        <Banner
          tone="warning"
          title={`${approvalTypeLabel[pendingApproval.type]} pending approval`}
          description={pendingApproval.requesterNote || pendingApproval.thresholdLabel}
          actions={
            can(role, 'approval.approve') ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => { decideApproval(pendingApproval.id, 'rejected', currentUser.id, 'Rejected from Order Detail.'); refresh('Approval rejected.'); }}>Reject</Button>
                <Button variant="primary" size="sm" onClick={() => {
                  decideApproval(pendingApproval.id, 'approved', currentUser.id, 'Approved from Order Detail.');
                  if (pendingApproval.type === 'cancel') updateOrder(order.id, { status: 'cancelled' });
                  refresh('Approval decided.');
                }}>Approve</Button>
              </>
            ) : undefined
          }
        />
      ) : null}

      {connector && !canEditSourceOwned ? (
        <Banner tone="info" title="Source-owned order" description={`${connector.name} owns this order. Edits and status changes happen at the source — use "Open in source" below.`} />
      ) : null}

      <div className="crm-eco-orderdetail__grid">
        <section className="crm-eco-orderdetail__card">
          <h2 className="crm-eco-orderdetail__title">Customer &amp; ownership</h2>
          <dl className="crm-eco-orderdetail__deflist">
            <div><dt>Customer</dt><dd>{contact?.name ?? order.contactId}</dd></div>
            <div><dt>Owner</dt><dd>{owner?.name ?? order.ownerId}</dd></div>
            <div><dt>Branch</dt><dd>{branch?.name ?? order.branchId}</dd></div>
            {order.selectionId ? <div><dt>From selection</dt><dd><a href={scopedHref(`/catalogue-orders/selections/${order.selectionId}`)} onClick={(e) => { e.preventDefault(); navigate(scopedHref(`/catalogue-orders/selections/${order.selectionId}`)); }}>{order.selectionId}</a></dd></div> : null}
          </dl>
          <div className="crm-eco-orderdetail__actions">
            <Button variant="secondary" size="sm" iconLeft={<MessageSquare />} onClick={() => navigate(scopedHref('/inbox', { contactId: order.contactId, returnTo }))}>Message customer</Button>
            <Button variant="ghost" size="sm" iconLeft={<Phone />} onClick={() => navigate(scopedHref('/calling', { contactId: order.contactId, returnTo }))}>Call</Button>
          </div>

          <h2 className="crm-eco-orderdetail__title">Source &amp; sync</h2>
          <dl className="crm-eco-orderdetail__deflist">
            <div><dt>Source</dt><dd>{orderSourceLabel[order.source]}</dd></div>
            <div><dt>Sync status</dt><dd>{orderSyncStatusLabel[order.syncStatus]}</dd></div>
            {connector ? <div><dt>Connector</dt><dd>{connector.name}</dd></div> : null}
          </dl>
          {connector ? (
            <Button variant="ghost" size="sm" iconLeft={<ExternalLink />} onClick={() => setToast(`Would open ${order.externalOrderId ?? order.id} in ${connector.name}.`)}>
              Open in source
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref('/catalogue-orders/sync', { catalogueId: order.catalogueId }))}>View sync &amp; audit history</Button>
        </section>

        <section className="crm-eco-orderdetail__card crm-eco-orderdetail__card--wide">
          <h2 className="crm-eco-orderdetail__title">Items</h2>
          <table className="crm-eco-orderdetail__table">
            <caption>{order.confirmedSnapshot ? 'Confirmed snapshot' : 'Requested snapshot'}</caption>
            <thead><tr><th>Item</th><th>Pieces</th><th>Weight (gm)</th><th>Unit price</th><th>Line total</th></tr></thead>
            <tbody>
              {(order.confirmedSnapshot ?? order.requestedSnapshot).map((line, i) => (
                <tr key={`${line.itemId}-${i}`}>
                  <td>{line.title}</td>
                  <td>{line.quantityPieces ?? '—'}</td>
                  <td>{line.quantityWeightGm ?? '—'}</td>
                  <td><PriceDisplay price={{ mode: line.priceMode, amount: line.unitPrice, compareAtAmount: null, currency: order.commercialSummary.currency }} /></td>
                  <td>{line.lineTotal != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: order.commercialSummary.currency, maximumFractionDigits: 0 }).format(line.lineTotal) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.confirmedSnapshot && JSON.stringify(order.confirmedSnapshot) !== JSON.stringify(order.requestedSnapshot) ? (
            <p className="crm-eco-orderdetail__hint">Requested snapshot differed at order creation — confirmed values shown above are what was finally billed.</p>
          ) : null}
          <p className="crm-eco-orderdetail__totals">
            {order.commercialSummary.total != null
              ? `Total: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: order.commercialSummary.currency, maximumFractionDigits: 0 }).format(order.commercialSummary.total)}`
              : 'Total: rate-linked — final value depends on weight/rate at confirmation.'}
            {order.commercialSummary.discount ? ` · Discount ${order.commercialSummary.discount}` : ''}
          </p>
          {order.commercialNotes ? <p className="crm-eco-orderdetail__notes">{order.commercialNotes}</p> : null}
        </section>

        <section className="crm-eco-orderdetail__card">
          <h2 className="crm-eco-orderdetail__title">Payment</h2>
          <Badge tone={paymentStatusTone[order.payment.status]}>{paymentStatusLabel[order.payment.status]}</Badge>
          {order.payment.balanceDue != null ? <p className="crm-eco-orderdetail__balance">Balance due: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: order.payment.currency, maximumFractionDigits: 0 }).format(order.payment.balanceDue)}</p> : null}
          {can(role, 'payment.request') ? <Button variant="secondary" size="sm" onClick={() => openDrawer('payment')}>Manage payment</Button> : null}
        </section>

        <section className="crm-eco-orderdetail__card">
          <h2 className="crm-eco-orderdetail__title">Fulfilment</h2>
          <Badge tone={fulfilmentStatusTone[order.fulfilment.status]}>{fulfilmentStatusLabel[order.fulfilment.status]}</Badge>
          {order.fulfilment.trackingNumber ? <p className="crm-eco-orderdetail__balance">{order.fulfilment.courier} · {order.fulfilment.trackingNumber}</p> : null}
          {order.fulfilment.exceptionReason ? <p className="crm-eco-orderdetail__notes">{order.fulfilment.exceptionReason}</p> : null}
          {['delayed', 'failed', 'rto'].includes(order.fulfilment.status) ? (
            <Button variant="secondary" size="sm" iconLeft={<ShieldAlert size={14} />} onClick={() => openDrawer('fulfilment')}>Resolve exception</Button>
          ) : null}
        </section>

        <section className="crm-eco-orderdetail__card">
          <h2 className="crm-eco-orderdetail__title">Returns &amp; refund</h2>
          {returnCase ? (
            <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref(`/catalogue-orders/returns/${returnCase.id}`))}>View return / replacement</Button>
          ) : returnEligible ? (
            can(role, 'refund.request') || can(role, 'order.requestCancel') ? (
              <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref('/catalogue-orders/returns/new', { orderId: order.id }))}>Create return</Button>
            ) : <p className="crm-eco-orderdetail__hint">No return on file.</p>
          ) : (
            <p className="crm-eco-orderdetail__hint">Not yet eligible — order has not been delivered.</p>
          )}
        </section>

        <section className="crm-eco-orderdetail__card crm-eco-orderdetail__card--wide">
          <h2 className="crm-eco-orderdetail__title">Timeline &amp; audit</h2>
          <ul className="crm-eco-orderdetail__timeline">
            {[...order.timeline].reverse().map((event) => (
              <li key={event.id}>
                <span className="crm-eco-orderdetail__timeline-date">{new Date(event.at).toLocaleString('en-IN')}</span>
                <span className="crm-eco-orderdetail__timeline-action">{event.action}</span>
                <span className="crm-eco-orderdetail__timeline-detail">{event.detail}</span>
                <span className="crm-eco-orderdetail__timeline-actor">{event.actorLabel}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="crm-eco-orderdetail__footer-actions">
        {canAdvance ? <Button variant="primary" iconRight={<ArrowRight />} onClick={advance}>Advance to {orderStatusLabel[nextStatus[order.status]!]}</Button> : null}
        {connector && !canEditSourceOwned && !terminalStatuses.includes(order.status) ? <Button variant="ghost" disabled title="Owned by source connector">Advance (source-owned)</Button> : null}
        {cancelEligible && canCancelDirectly ? <Button variant="danger" onClick={() => setCancelOpen(true)}>Cancel order</Button> : null}
        {cancelEligible && canRequestCancel ? <Button variant="secondary" onClick={() => setCancelOpen(true)}>Request cancellation</Button> : null}
        {can(role, 'approval.approve') || can(role, 'order.requestCancel') ? <Button variant="ghost" onClick={() => openDrawer('approval')}>Approvals</Button> : null}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title={canCancelDirectly ? 'Cancel this order?' : 'Request cancellation'}
        tone="danger"
        message={
          <div className="crm-eco-orderdetail__cancel-form">
            <p>{canCancelDirectly ? 'This cancels the order immediately and cannot be undone.' : 'This submits a cancellation request for manager approval.'}</p>
            <Textarea label="Reason" required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} />
          </div>
        }
        confirmLabel={canCancelDirectly ? 'Cancel order' : 'Submit request'}
        onConfirm={submitCancel}
        onCancel={() => { setCancelOpen(false); setCancelReason(''); }}
      />

      {drawer === 'payment' ? <PaymentDrawer order={order} onClose={closeDrawer} onSaved={refresh} /> : null}
      {drawer === 'fulfilment' ? <FulfilmentDrawer order={order} onClose={closeDrawer} onSaved={refresh} /> : null}
      {drawer === 'approval' ? <ApprovalDrawer order={order} onClose={closeDrawer} onSaved={refresh} /> : null}

      {toast ? <Toast tone="info" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

/** ECO-S22 — Payment / Commercial Status drawer. */
function PaymentDrawer({ order, onClose, onSaved }: { order: NonNullable<ReturnType<typeof findOrder>>; onClose: () => void; onSaved: (message: string) => void }) {
  const { currentUser } = useWorkspace();
  const connector = findConnector(order.connectorId);
  const gatewayConnected = hasCapability(connector, 'paymentLinks.create');
  const { role } = useWorkspace();
  const [amount, setAmount] = useState(order.payment.balanceDue != null ? String(order.payment.balanceDue) : '');
  const [method, setMethod] = useState('Manual — UPI');
  const [reference, setReference] = useState('');

  function recordManualPayment() {
    const amt = Number(amount) || 0;
    const record: PaymentRequestRecord = { id: `preq_local_${Date.now()}`, amount: amt, currency: order.payment.currency, method: reference ? `${method} (${reference})` : method, createdAt: new Date().toISOString(), expiresAt: new Date().toISOString(), status: 'success', link: null };
    order.payment.requests.push(record);
    order.payment.status = 'success';
    order.payment.balanceDue = 0;
    order.updatedAt = new Date().toISOString();
    appendOrderTimelineEvent(order.id, { at: new Date().toISOString(), actorId: currentUser.id, actorLabel: currentUser.name, action: 'Recorded manual payment', detail: `${method} — ${amt}`, source: 'manual' });
    onSaved('Manual payment recorded.');
  }

  return (
    <Drawer open title="Payment" onClose={onClose}>
      <div className="crm-eco-orderdetail__drawer">
        <Badge tone={paymentStatusTone[order.payment.status]}>{paymentStatusLabel[order.payment.status]}</Badge>
        {order.payment.requests.length === 0 ? (
          <p className="crm-eco-orderdetail__hint">No payment requests yet.</p>
        ) : (
          <table className="crm-eco-orderdetail__table">
            <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {order.payment.requests.map((r) => (
                <tr key={r.id}>
                  <td>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: r.currency, maximumFractionDigits: 0 }).format(r.amount)}</td>
                  <td>{r.method}</td>
                  <td><Badge tone={paymentStatusTone[r.status]} appearance="outline">{paymentStatusLabel[r.status]}</Badge></td>
                  <td>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {gatewayConnected ? (
          <p className="crm-eco-orderdetail__hint">Gateway-linked payment requests are not available in this prototype connector.</p>
        ) : connector ? (
          <p className="crm-eco-orderdetail__hint">
            {connector.name} does not support creating payment links from the CRM (paymentLinks.create is off for this connector).
            {' '}{role === 'owner' ? 'Connect a payment gateway in Settings → Commerce.' : 'Ask an admin to connect a payment provider.'}
          </p>
        ) : order.payment.balanceDue && order.payment.balanceDue > 0 && can(role, 'payment.request') ? (
          <div className="crm-eco-orderdetail__drawer-form">
            <p className="crm-eco-orderdetail__hint">No connected gateway for this CRM-managed checkout — record a manually confirmed payment instead. This is clearly labelled as manual, never shown as provider-confirmed.</p>
            <Input label="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Select label="Method" options={[{ value: 'Manual — UPI', label: 'Manual — UPI' }, { value: 'Manual — Bank transfer', label: 'Manual — Bank transfer' }, { value: 'Manual — Cash', label: 'Manual — Cash' }]} value={method} onChange={(e) => setMethod(e.target.value)} />
            <Input label="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
            <Button variant="primary" disabled={!amount} onClick={recordManualPayment}>Record manual payment</Button>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}

/** ECO-S23 — Delivery / Fulfilment Exception drawer. */
function FulfilmentDrawer({ order, onClose, onSaved }: { order: NonNullable<ReturnType<typeof findOrder>>; onClose: () => void; onSaved: (message: string) => void }) {
  const { currentUser } = useWorkspace();
  const connector = findConnector(order.connectorId);
  const canUpdateDirectly = !connector || hasCapability(connector, 'fulfilment.update');
  const [note, setNote] = useState('');

  function act(action: 'Reattempt delivery' | 'Hold shipment' | 'Return to origin' | 'Escalated to fulfilment team', newStatus?: OrderStatus) {
    if (canUpdateDirectly && newStatus) order.fulfilment.status = 'processing';
    appendOrderTimelineEvent(order.id, { at: new Date().toISOString(), actorId: currentUser.id, actorLabel: currentUser.name, action: canUpdateDirectly ? action : `${action} (requested from source)`, detail: note, source: 'manual' });
    order.updatedAt = new Date().toISOString();
    onSaved(`${action} recorded — customer will be notified.`);
  }

  return (
    <Drawer open title="Delivery / fulfilment exception" onClose={onClose}>
      <div className="crm-eco-orderdetail__drawer">
        <Badge tone={fulfilmentStatusTone[order.fulfilment.status]}>{fulfilmentStatusLabel[order.fulfilment.status]}</Badge>
        <dl className="crm-eco-orderdetail__deflist">
          <div><dt>Courier</dt><dd>{order.fulfilment.courier ?? '—'}</dd></div>
          <div><dt>Tracking</dt><dd>{order.fulfilment.trackingNumber ?? '—'}</dd></div>
          <div><dt>Expected delivery</dt><dd>{order.fulfilment.expectedDeliveryAt ? new Date(order.fulfilment.expectedDeliveryAt).toLocaleDateString('en-IN') : '—'}</dd></div>
          <div><dt>Reason</dt><dd>{order.fulfilment.exceptionReason ?? '—'}</dd></div>
        </dl>
        {!canUpdateDirectly ? <p className="crm-eco-orderdetail__hint">{connector?.name} owns fulfilment status — actions below are logged as requests to the source, not direct updates.</p> : null}
        <Textarea label="Note to customer / source" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        <div className="crm-eco-orderdetail__drawer-actions">
          <Button variant="secondary" size="sm" onClick={() => act('Reattempt delivery', 'processing')}>Reattempt</Button>
          <Button variant="secondary" size="sm" onClick={() => act('Hold shipment')}>Hold</Button>
          <Button variant="secondary" size="sm" onClick={() => act('Return to origin')}>Return to origin</Button>
          <Button variant="ghost" size="sm" onClick={() => act('Escalated to fulfilment team')}>Escalate</Button>
        </div>
      </div>
    </Drawer>
  );
}

/** ECO-S27 — Approval / Controlled Action drawer. */
function ApprovalDrawer({ order, onClose, onSaved }: { order: NonNullable<ReturnType<typeof findOrder>>; onClose: () => void; onSaved: (message: string) => void }) {
  const { role, currentUser } = useWorkspace();
  const approvals = approvalsForEntity('order', order.id);
  const [type, setType] = useState<ApprovalType>('discount');
  const [note, setNote] = useState('');

  function submit() {
    createApproval({
      type,
      entityType: 'order',
      entityId: order.id,
      entityLabel: `Order — ${order.externalOrderId ?? order.id}`,
      requestedById: currentUser.id,
      requesterNote: note,
      thresholdLabel: `${approvalTypeLabel[type]} requires approval above your authority.`,
    });
    onSaved('Approval requested.');
    setNote('');
  }

  return (
    <Drawer open title="Approvals" onClose={onClose}>
      <div className="crm-eco-orderdetail__drawer">
        {approvals.length === 0 ? <p className="crm-eco-orderdetail__hint">No approval requests for this order.</p> : (
          <ul className="crm-eco-orderdetail__approval-list">
            {approvals.map((a) => (
              <li key={a.id}>
                <div className="crm-eco-orderdetail__approval-row">
                  <Badge tone="neutral" appearance="outline">{approvalTypeLabel[a.type]}</Badge>
                  <Badge tone={approvalStatusTone[a.status]}>{approvalStatusLabel[a.status]}</Badge>
                </div>
                <p className="crm-eco-orderdetail__hint">{a.requesterNote}</p>
                {a.status === 'pending' && can(role, 'approval.approve') ? (
                  <div className="crm-eco-orderdetail__drawer-actions">
                    <Button variant="secondary" size="sm" onClick={() => { decideApproval(a.id, 'rejected', currentUser.id, 'Rejected.'); onSaved('Rejected.'); }}>Reject</Button>
                    <Button variant="primary" size="sm" onClick={() => {
                      decideApproval(a.id, 'approved', currentUser.id, 'Approved.');
                      if (a.type === 'cancel') updateOrder(order.id, { status: 'cancelled' });
                      onSaved('Approved.');
                    }}>Approve</Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {can(role, 'order.requestCancel') ? (
          <div className="crm-eco-orderdetail__drawer-form">
            <h3 className="crm-eco-orderdetail__title">Request a controlled action</h3>
            <Select label="Type" options={[{ value: 'discount', label: 'Discount' }, { value: 'cancel', label: 'Cancellation' }, { value: 'refund', label: 'Refund' }, { value: 'price-override', label: 'Price override' }]} value={type} onChange={(e) => setType(e.target.value as ApprovalType)} />
            <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            <Button variant="secondary" disabled={!note.trim()} onClick={submit}>Submit for approval</Button>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
