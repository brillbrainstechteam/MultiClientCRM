import type { SyncEvent } from '../domain/types';

/** Sync & audit trail (Requirement §X3, ECO-S26) across both connectors. */
export const syncEvents: SyncEvent[] = [
  { id: 'sync_1', connectorId: 'connector_acme_infinity', catalogueId: 'cat_aurum_festive', entityType: 'inventory', entityId: 'it_rg_1042', entityLabel: 'Kundan Halo Ring — inventory', direction: 'inbound', status: 'success', message: 'Stock and weight refreshed.', occurredAt: '2026-08-11T07:30:00+05:30', retryable: false },
  { id: 'sync_2', connectorId: 'connector_acme_infinity', catalogueId: 'cat_aurum_festive', entityType: 'order', entityId: 'order_gold_ring_request', entityLabel: 'Order Request — Kavita Desai', direction: 'outbound', status: 'retrying', message: 'ERP endpoint timed out — retry 2 of 5 scheduled.', occurredAt: '2026-08-11T08:00:00+05:30', retryable: true },
  { id: 'sync_3', connectorId: 'connector_acme_infinity', catalogueId: 'cat_aurum_festive', entityType: 'order', entityId: 'order_ring_delivered', entityLabel: 'Order — Rahul Shah', direction: 'outbound', status: 'success', message: 'Synced as ERP-SO-88213.', occurredAt: '2026-07-15T17:00:00+05:30', retryable: false },
  { id: 'sync_4', connectorId: 'connector_shopify_northline', catalogueId: 'cat_northline_apparel', entityType: 'catalogue', entityId: 'cat_northline_apparel', entityLabel: 'Northline Studio — Apparel catalogue', direction: 'inbound', status: 'success', message: 'Full catalogue sync completed — 3 products, 3 variants.', occurredAt: '2026-08-11T09:05:00+05:30', retryable: false },
  { id: 'sync_5', connectorId: 'connector_shopify_northline', catalogueId: 'cat_northline_apparel', entityType: 'order', entityId: 'order_apparel_unmatched', entityLabel: 'Order #SHOP-10260', direction: 'inbound', status: 'conflict', message: 'Checkout phone number did not match any CRM contact — manual reconciliation required.', occurredAt: '2026-08-11T08:00:00+05:30', retryable: false },
  { id: 'sync_6', connectorId: 'connector_shopify_northline', catalogueId: 'cat_northline_apparel', entityType: 'fulfilment', entityId: 'order_apparel_delivery_exception', entityLabel: 'Order #SHOP-10233 fulfilment', direction: 'inbound', status: 'error', message: 'Courier webhook reported delivery failure — 2 attempts.', occurredAt: '2026-08-09T11:30:00+05:30', retryable: false },
  { id: 'sync_7', connectorId: 'connector_acme_infinity', catalogueId: 'cat_aurum_festive', entityType: 'media', entityId: null, entityLabel: 'Media enrichment', direction: 'outbound', status: 'success', message: 'ERP does not support media — no-op by design (media.read capability is false).', occurredAt: '2026-08-01T10:00:00+05:30', retryable: false },
  { id: 'sync_8', connectorId: 'connector_shopify_northline', catalogueId: 'cat_northline_apparel', entityType: 'payment', entityId: 'order_apparel_payment_pending', entityLabel: 'Payment link — order #SHOP-10251', direction: 'inbound', status: 'error', message: 'Payment link expired before customer completed checkout.', occurredAt: '2026-08-10T22:00:00+05:30', retryable: true },
];

export function syncEventsForCatalogue(catalogueId: string): SyncEvent[] {
  return syncEvents.filter((event) => event.catalogueId === catalogueId).sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
}

export function syncEventsForConnector(connectorId: string): SyncEvent[] {
  return syncEvents.filter((event) => event.connectorId === connectorId).sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
}
