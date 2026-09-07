import type { ConnectorCapability } from '../domain/types';

/**
 * Connector capability fixtures (Requirement §X). The UI must adapt to these
 * flags rather than assume any capability — e.g. `orders.update: false` on
 * `connector_shopify_northline` is why Order Detail shows "Open in source"
 * instead of an editable form for apparel orders.
 */
export const connectors: ConnectorCapability[] = [
  {
    id: 'connector_acme_infinity',
    name: 'Acme Infinity ERP',
    class: 'erp',
    state: 'connected',
    capabilities: {
      'products.read': true,
      'products.write': false,
      'inventory.read': true,
      'inventory.write': false,
      'pricing.read': true,
      'pricing.write': false,
      'orders.read': true,
      'orders.create': true,
      'orders.update': false,
      'orders.cancel': false,
      'payments.read': false,
      'paymentLinks.create': false,
      'fulfilment.read': true,
      'fulfilment.update': false,
      'returns.read': false,
      'returns.create': true,
      'refunds.read': false,
      'refunds.initiate': false,
      'media.read': false,
      webhooks: false,
      polling: true,
      fileImport: false,
    },
    lastSuccessfulSyncAt: '2026-08-11T07:30:00+05:30',
    staleAsOfLabel: null,
    errorMessage: null,
  },
  {
    id: 'connector_shopify_northline',
    name: 'Shopify — Northline Studio',
    class: 'shopify',
    state: 'connected',
    capabilities: {
      'products.read': true,
      'products.write': true,
      'inventory.read': true,
      'inventory.write': false,
      'pricing.read': true,
      'pricing.write': false,
      'customers.read': true,
      'customers.write': false,
      'orders.read': true,
      'orders.create': false,
      'orders.update': false,
      'orders.cancel': false,
      'payments.read': true,
      'paymentLinks.create': false,
      'fulfilment.read': true,
      'fulfilment.update': false,
      'returns.read': true,
      'returns.create': true,
      'refunds.read': true,
      'refunds.initiate': false,
      'media.read': true,
      webhooks: true,
      polling: false,
      fileImport: false,
    },
    lastSuccessfulSyncAt: '2026-08-11T09:05:00+05:30',
    staleAsOfLabel: null,
    errorMessage: null,
  },
];

export function findConnector(id: string | null): ConnectorCapability | undefined {
  if (!id) return undefined;
  return connectors.find((connector) => connector.id === id);
}
