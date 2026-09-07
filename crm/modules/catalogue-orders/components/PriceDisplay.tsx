import { Badge } from '@crm/design-system';
import type { Price } from '../domain/types';

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

/**
 * Requirement §G1 — Price on Request / Dynamic must never render a fabricated
 * checkout price. This is the one place price text is composed.
 */
export function PriceDisplay({ price }: { price: Price }) {
  if (price.mode === 'price-on-request') {
    return <span className="crm-eco-price crm-eco-price--muted">Price on request</span>;
  }
  if (price.mode === 'dynamic') {
    return <span className="crm-eco-price crm-eco-price--muted">Rate-linked — ask for today's quote</span>;
  }
  if (price.amount === null) {
    return <span className="crm-eco-price crm-eco-price--muted">—</span>;
  }
  if (price.mode === 'offer' && price.compareAtAmount) {
    return (
      <span className="crm-eco-price">
        {formatAmount(price.amount, price.currency)}{' '}
        <span className="crm-eco-price__compare">{formatAmount(price.compareAtAmount, price.currency)}</span>{' '}
        <Badge tone="success" appearance="soft">Offer</Badge>
      </span>
    );
  }
  return <span className="crm-eco-price">{formatAmount(price.amount, price.currency)}</span>;
}
