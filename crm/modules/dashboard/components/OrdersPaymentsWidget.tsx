import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { WidgetShell } from '@crm/design-system';
import type { CommerceSnapshot } from '@crm/mock-data';

export interface OrdersPaymentsWidgetProps {
  snapshot: CommerceSnapshot;
  /** `operational` hides collected/pending payment amounts. */
  level: 'full' | 'operational';
}

/** DASH-S01 §7 row 8 (orders half) — fulfilment, delayed, low stock, payments. */
export function OrdersPaymentsWidget({ snapshot, level }: OrdersPaymentsWidgetProps) {
  const scopedHref = useScopedHref();

  return (
    <WidgetShell
      title="Orders & payments"
      icon={<ShoppingBag />}
      footerTo={scopedHref('/catalogue-orders')}
      footerLabel="Open Catalogue & Orders"
    >
      <div className="crm-dash-metric-row">
        <Link to={scopedHref('/catalogue-orders')} className="crm-dash-metric">
          <span className="crm-dash-metric__value">{snapshot.openOrders}</span>
          <span className="crm-dash-metric__label">Open orders</span>
        </Link>
        <Link to={scopedHref('/catalogue-orders', { status: 'delayed' })} className="crm-dash-metric">
          <span className="crm-dash-metric__value">{snapshot.delayedOrders}</span>
          <span className="crm-dash-metric__label">Delayed</span>
        </Link>
        <Link to={scopedHref('/catalogue-orders', { source: 'low-stock' })} className="crm-dash-metric">
          <span className="crm-dash-metric__value">{snapshot.lowStockCount}</span>
          <span className="crm-dash-metric__label">Low stock</span>
        </Link>
        {level === 'full' ? (
          <Link to={scopedHref('/catalogue-orders', { tab: 'payments' })} className="crm-dash-metric">
            <span className="crm-dash-metric__value">{snapshot.paymentsCollectedLabel}</span>
            <span className="crm-dash-metric__label">Collected</span>
          </Link>
        ) : null}
      </div>
    </WidgetShell>
  );
}
