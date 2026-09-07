import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Images,
  PackageX,
  PlugZap,
  RefreshCcw,
  RotateCcw,
  Undo2,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { findContact } from '@crm/mock-data';
import { AttentionCard, Badge, KpiCard } from '@crm/design-system';
import { catalogues, importJobs, inventoryPositions, items, orders, returnCases, selections } from '../data';
import { orderStatusLabel, orderStatusTone } from '../catalogue-orders-labels';
import { can } from '../permissions';

/** ECO-S01 — Commerce Overview. Action-oriented centre, not a Reports duplicate (Requirement §AC). */
export default function CommerceOverviewScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, branchId } = useWorkspace();
  const [searchParams] = useSearchParams();

  const inScope = <T extends { branchId?: string }>(list: T[]) => list.filter((x) => branchId === 'all' || !x.branchId || x.branchId === branchId);

  const scopedOrders = useMemo(() => inScope(orders), [branchId]);
  const scopedSelections = useMemo(() => inScope(selections), [branchId]);
  const scopedCatalogues = useMemo(() => catalogues.filter((c) => branchId === 'all' || c.branchIds.includes(branchId)), [branchId]);
  const scopedInventory = useMemo(() => inScope(inventoryPositions), [branchId]);
  const scopedItems = useMemo(() => (branchId === 'all' ? items : items.filter((i) => i.branchVisibility.includes(branchId))), [branchId]);
  const scopedReturns = useMemo(() => returnCases.filter((r) => { const o = orders.find((ord) => ord.id === r.orderId); return branchId === 'all' || o?.branchId === branchId; }), [branchId]);

  const staleCatalogues = scopedCatalogues.filter((c) => ['disconnected', 'auth-failed', 'stale', 'permanent-error', 'mapping-required', 'retry-queued'].includes(c.sourceStatus));
  const failedImports = importJobs.filter((j) => (j.status === 'failed' || j.status === 'partial-success') && scopedCatalogues.some((c) => c.id === j.catalogueId));
  const missingMedia = scopedItems.filter((i) => i.status === 'active' && i.media.length === 0);
  const outOfStock = scopedInventory.filter((p) => !p.madeToOrder && p.primaryQuantity === 0);
  const selectionsFollowUp = scopedSelections.filter((s) => ['shared', 'customer-reviewing', 'revised'].includes(s.status));
  const pendingSyncOrders = scopedOrders.filter((o) => o.syncStatus === 'pending-sync' || o.status === 'reconciliation-required');
  const paymentExceptions = scopedOrders.filter((o) => o.payment.status === 'failed' || o.payment.status === 'expired');
  const deliveryExceptions = scopedOrders.filter((o) => ['delayed', 'failed', 'rto'].includes(o.fulfilment.status));
  const returnsNeedingAction = scopedReturns.filter((r) => r.status === 'requested' || r.refundStatus === 'pending' || r.refundStatus === 'manual-confirmation-required');

  const openOrders = scopedOrders.filter((o) => !['delivered', 'cancelled', 'returned'].includes(o.status)).length;
  const paymentsCollected = scopedOrders
    .filter((o) => o.payment.status === 'success' || o.payment.status === 'partial')
    .reduce((sum, o) => sum + (o.commercialSummary.total ?? 0), 0);

  const recentActivity = useMemo(
    () =>
      scopedOrders
        .flatMap((o) => o.timeline.map((event) => ({ event, order: o })))
        .sort((a, b) => (a.event.at < b.event.at ? 1 : -1))
        .slice(0, 8),
    [scopedOrders],
  );

  // ECO-F01 — dashboard "Orders & payments" widget deep-links land here and drill through to the filtered destination.
  // Contacts → Customer 360 "Orders" related card (Requirement §S/§AG) also lands here with
  // `contactId`/`returnTo` — Orders is the fullest contact-scoped commerce view (order requests +
  // synced orders), so it's the sensible landing surface for a customer's commerce history.
  const legacyStatus = searchParams.get('status');
  const legacySource = searchParams.get('source');
  const legacyTab = searchParams.get('tab');
  const contactId = searchParams.get('contactId');
  const returnTo = searchParams.get('returnTo');
  const legacyRedirect: { path: string; extra: Record<string, string> } | null = legacyStatus === 'delayed' ? { path: '/catalogue-orders/orders', extra: { queue: 'delivery-exception' } }
    : legacySource === 'low-stock' ? { path: '/catalogue-orders/inventory', extra: { state: 'out-of-stock' } }
    : legacyTab === 'payments' ? { path: '/catalogue-orders/orders', extra: { queue: 'payment-pending' } }
    : contactId ? { path: '/catalogue-orders/orders', extra: { contactId, ...(returnTo ? { returnTo } : {}) } }
    : null;

  useEffect(() => {
    if (legacyRedirect) navigate(scopedHref(legacyRedirect.path, legacyRedirect.extra), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyStatus, legacySource, legacyTab, contactId]);

  if (legacyRedirect) return null;

  return (
    <div className="crm-eco-overview">
      <PageHeader
        title="Commerce Overview"
        description="Catalogue, order and exception activity that needs attention right now."
      />

      <div className="crm-eco-overview__kpis">
        <KpiCard label="Open orders" value={openOrders} icon={<Wallet />} />
        <KpiCard label="Delivery exceptions" value={deliveryExceptions.length} icon={<PackageX />} />
        <KpiCard label="Return & exception cases" value={returnsNeedingAction.length} icon={<Undo2 />} />
        {can(role, 'price.view') ? (
          <KpiCard label="Collected (scoped)" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paymentsCollected)} icon={<Wallet />} emphasis="gold" />
        ) : null}
      </div>

      <div className="crm-eco-overview__attention">
        {staleCatalogues.length > 0 ? (
          <AttentionCard title="Catalogue source needs attention" count={staleCatalogues.length} description="Disconnected, stale or auth-failed catalogue sources." icon={<PlugZap />} tone="danger" to={scopedHref('/catalogue-orders/catalogues')} />
        ) : null}
        {failedImports.length > 0 && can(role, 'catalogue.import') ? (
          <AttentionCard
            title="Import needs review"
            count={failedImports.length}
            description="Failed or partial-success bulk imports."
            icon={<AlertTriangle />}
            tone="warn"
            to={scopedHref(`/catalogue-orders/catalogues/${failedImports[0].catalogueId}/import`, { step: 'result', jobId: failedImports[0].id })}
          />
        ) : null}
        {missingMedia.length > 0 && can(role, 'catalogue.manageMedia') ? (
          <AttentionCard title="Items missing media" count={missingMedia.length} description="Active items with no images or video yet." icon={<Images />} tone="neutral" to={scopedHref('/catalogue-orders/catalogues')} />
        ) : null}
        {outOfStock.length > 0 ? (
          <AttentionCard title="Out of stock" count={outOfStock.length} description="Positions at zero quantity and not made-to-order." icon={<PackageX />} tone="warn" to={scopedHref('/catalogue-orders/inventory', { state: 'out-of-stock' })} />
        ) : null}
        {selectionsFollowUp.length > 0 ? (
          <AttentionCard title="Selections need follow-up" count={selectionsFollowUp.length} description="Shared, revised or under customer review." icon={<RefreshCcw />} tone="neutral" to={scopedHref('/catalogue-orders/selections')} />
        ) : null}
        {pendingSyncOrders.length > 0 ? (
          <AttentionCard title="Orders awaiting sync" count={pendingSyncOrders.length} description="Pending push to the connected source, or unresolved reconciliation." icon={<RotateCcw />} tone="danger" to={scopedHref('/catalogue-orders/orders', { queue: 'pending-sync' })} />
        ) : null}
        {paymentExceptions.length > 0 && can(role, 'payment.request') ? (
          <AttentionCard title="Payment exceptions" count={paymentExceptions.length} description="Failed or expired payment requests." icon={<Wallet />} tone="danger" to={scopedHref('/catalogue-orders/orders', { queue: 'payment-pending' })} />
        ) : null}
        {deliveryExceptions.length > 0 ? (
          <AttentionCard title="Delivery exceptions" count={deliveryExceptions.length} description="Delayed, failed or return-to-origin shipments." icon={<PackageX />} tone="danger" to={scopedHref('/catalogue-orders/orders', { queue: 'delivery-exception' })} />
        ) : null}
        {returnsNeedingAction.length > 0 ? (
          <AttentionCard title="Returns & refunds need action" count={returnsNeedingAction.length} description="Awaiting approval/rejection or a refund decision." icon={<Undo2 />} tone="warn" to={scopedHref('/catalogue-orders/returns', { queue: 'needs-decision' })} />
        ) : null}
        {staleCatalogues.length + failedImports.length + missingMedia.length + outOfStock.length + selectionsFollowUp.length + pendingSyncOrders.length + paymentExceptions.length + deliveryExceptions.length + returnsNeedingAction.length === 0 ? (
          <p className="crm-eco-overview__all-clear">Nothing needs attention right now.</p>
        ) : null}
      </div>

      <section className="crm-eco-overview__activity">
        <h2 className="crm-eco-overview__section-title">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <p className="crm-eco-overview__all-clear">No recent order activity in scope.</p>
        ) : (
          <ul className="crm-eco-overview__activity-list">
            {recentActivity.map(({ event, order }) => (
              <li key={event.id}>
                <button type="button" className="crm-eco-overview__activity-row" onClick={() => navigate(scopedHref(`/catalogue-orders/orders/${order.id}`))}>
                  <span className="crm-eco-overview__activity-date">{new Date(event.at).toLocaleString('en-IN')}</span>
                  <span className="crm-eco-overview__activity-action">{event.action}</span>
                  <span className="crm-eco-overview__activity-contact">{findContact(order.contactId)?.name ?? order.contactId}</span>
                  <Badge tone={orderStatusTone[order.status]} appearance="outline">{orderStatusLabel[order.status]}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
