import type { AuditEvent, Order, OrderLine, PriceMode } from '../domain/types';

/**
 * Order fixtures unify CRM order requests and synchronized external orders
 * (Requirement §Y2). `source` + `syncStatus` say which; `connectorId` +
 * the connector's capability flags (`data/connectors.ts`) say what the UI
 * may edit versus must route to "Open in source".
 */
export const orders: Order[] = [
  {
    id: 'order_gold_ring_request',
    source: 'crm-request',
    connectorId: 'connector_acme_infinity',
    externalOrderId: null,
    catalogueId: 'cat_aurum_festive',
    contactId: 'contact_kavita_desai',
    selectionId: 'sel_kavita_converted',
    branchId: 'branch_delhi',
    ownerId: 'user_vikram',
    status: 'confirmed',
    syncStatus: 'pending-sync',
    requestedSnapshot: [
      { itemId: 'it_rg_1042', variantId: null, title: 'Kundan Halo Ring', quantityPieces: 2, quantityWeightGm: 9.6, priceMode: 'dynamic', unitPrice: null, lineTotal: null },
      { itemId: 'it_nk_201', variantId: null, title: 'Temple Motif Necklace', quantityPieces: 1, quantityWeightGm: 22.4, priceMode: 'price-on-request', unitPrice: null, lineTotal: null },
    ],
    confirmedSnapshot: null,
    commercialSummary: { subtotal: null, discount: 0, tax: 0, total: null, currency: 'INR' },
    commercialNotes: 'Awaiting ERP order number and final rate-linked pricing before invoicing.',
    payment: { status: 'not-requested', balanceDue: null, currency: 'INR', requests: [] },
    fulfilment: { status: 'not-started', courier: null, trackingNumber: null, trackingUrl: null, expectedDeliveryAt: null, exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: null,
    timeline: [
      { id: 'ord_gold_ring_1', at: '2026-08-06T15:45:00+05:30', actorId: 'user_vikram', actorLabel: 'Vikram Rao', action: 'Created Order Request', detail: 'Converted from sel_kavita_converted.', source: 'manual' },
      { id: 'ord_gold_ring_2', at: '2026-08-06T15:46:00+05:30', actorId: null, actorLabel: 'Acme Infinity connector', action: 'Queued for sync', detail: 'Push to ERP pending — retry scheduled.', source: 'integration' },
    ],
    createdAt: '2026-08-06T15:45:00+05:30',
    updatedAt: '2026-08-06T15:46:00+05:30',
  },
  {
    id: 'order_apparel_synced',
    source: 'external-sync',
    connectorId: 'connector_shopify_northline',
    externalOrderId: '#SHOP-10245',
    catalogueId: 'cat_northline_apparel',
    contactId: 'contact_priya_menon',
    selectionId: null,
    branchId: 'branch_mumbai',
    ownerId: 'user_karan',
    status: 'processing',
    syncStatus: 'synced',
    requestedSnapshot: [{ itemId: 'it_ap_sar_mrn', variantId: null, title: 'Banarasi Silk Saree — Maroon', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 8999, lineTotal: 8999 }],
    confirmedSnapshot: [{ itemId: 'it_ap_sar_mrn', variantId: null, title: 'Banarasi Silk Saree — Maroon', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 8999, lineTotal: 8999 }],
    commercialSummary: { subtotal: 8999, discount: 0, tax: 0, total: 8999, currency: 'INR' },
    commercialNotes: '',
    payment: { status: 'success', balanceDue: 0, currency: 'INR', requests: [{ id: 'preq_apparel_synced', amount: 8999, currency: 'INR', method: 'Shopify Checkout', createdAt: '2026-08-09T12:00:00+05:30', expiresAt: '2026-08-09T12:00:00+05:30', status: 'success', link: null }] },
    fulfilment: { status: 'processing', courier: null, trackingNumber: null, trackingUrl: null, expectedDeliveryAt: '2026-08-13T18:00:00+05:30', exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: null,
    timeline: [{ id: 'ord_apparel_synced_1', at: '2026-08-09T12:00:00+05:30', actorId: null, actorLabel: 'Shopify webhook', action: 'Order synced', detail: 'Received via webhook, payment captured.', source: 'integration' }],
    createdAt: '2026-08-09T12:00:00+05:30',
    updatedAt: '2026-08-09T12:05:00+05:30',
  },
  {
    id: 'order_apparel_payment_pending',
    source: 'external-sync',
    connectorId: 'connector_shopify_northline',
    externalOrderId: '#SHOP-10251',
    catalogueId: 'cat_northline_apparel',
    contactId: 'contact_ananya_reddy',
    selectionId: null,
    branchId: 'branch_delhi',
    ownerId: 'user_meera',
    status: 'pending-confirmation',
    syncStatus: 'synced',
    requestedSnapshot: [{ itemId: 'it_ap_ank_ind', variantId: 'var_ank_ind_m', title: 'Anarkali Straight Kurta — Indigo (M)', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 2199, lineTotal: 2199 }],
    confirmedSnapshot: null,
    commercialSummary: { subtotal: 2199, discount: 0, tax: 0, total: 2199, currency: 'INR' },
    commercialNotes: '',
    payment: {
      status: 'expired',
      balanceDue: 2199,
      currency: 'INR',
      requests: [{ id: 'preq_apparel_pending', amount: 2199, currency: 'INR', method: 'UPI payment link', createdAt: '2026-08-10T10:00:00+05:30', expiresAt: '2026-08-10T22:00:00+05:30', status: 'expired', link: 'https://pay.northline.example/req/preq_apparel_pending' }],
    },
    fulfilment: { status: 'not-started', courier: null, trackingNumber: null, trackingUrl: null, expectedDeliveryAt: null, exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: null,
    timeline: [{ id: 'ord_apparel_pending_1', at: '2026-08-10T22:00:00+05:30', actorId: null, actorLabel: 'Payment gateway', action: 'Payment link expired', detail: 'Customer did not complete payment within 12 hours.', source: 'integration' }],
    createdAt: '2026-08-10T10:00:00+05:30',
    updatedAt: '2026-08-10T22:00:00+05:30',
  },
  {
    id: 'order_apparel_delivery_exception',
    source: 'external-sync',
    connectorId: 'connector_shopify_northline',
    externalOrderId: '#SHOP-10233',
    catalogueId: 'cat_northline_apparel',
    contactId: 'contact_neha_gupta',
    selectionId: null,
    branchId: 'branch_bengaluru',
    ownerId: 'user_anita',
    status: 'processing',
    syncStatus: 'synced',
    requestedSnapshot: [{ itemId: 'it_ap_kur_wht', variantId: null, title: 'Straight Kurta — White', quantityPieces: 2, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 1599, lineTotal: 3198 }],
    confirmedSnapshot: [{ itemId: 'it_ap_kur_wht', variantId: null, title: 'Straight Kurta — White', quantityPieces: 2, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 1599, lineTotal: 3198 }],
    commercialSummary: { subtotal: 3198, discount: 0, tax: 0, total: 3198, currency: 'INR' },
    commercialNotes: '',
    payment: { status: 'success', balanceDue: 0, currency: 'INR', requests: [{ id: 'preq_apparel_delay', amount: 3198, currency: 'INR', method: 'Shopify Checkout', createdAt: '2026-08-04T09:00:00+05:30', expiresAt: '2026-08-04T09:00:00+05:30', status: 'success', link: null }] },
    fulfilment: {
      status: 'delayed',
      courier: 'BlueDart',
      trackingNumber: 'BD99213456',
      trackingUrl: 'https://track.bluedart.example/BD99213456',
      expectedDeliveryAt: '2026-08-08T18:00:00+05:30',
      exceptionReason: 'Customer unreachable at delivery address — 2 failed attempts.',
      exceptionOwnerId: 'user_karan',
    },
    returnCaseId: null,
    timeline: [
      { id: 'ord_apparel_delay_1', at: '2026-08-08T11:00:00+05:30', actorId: null, actorLabel: 'BlueDart webhook', action: 'Delivery attempt failed', detail: 'Attempt 1 — customer unreachable.', source: 'integration' },
      { id: 'ord_apparel_delay_2', at: '2026-08-09T11:30:00+05:30', actorId: null, actorLabel: 'BlueDart webhook', action: 'Delivery attempt failed', detail: 'Attempt 2 — customer unreachable.', source: 'integration' },
    ],
    createdAt: '2026-08-04T09:00:00+05:30',
    updatedAt: '2026-08-09T11:30:00+05:30',
  },
  {
    id: 'order_apparel_unmatched',
    source: 'external-sync',
    connectorId: 'connector_shopify_northline',
    externalOrderId: '#SHOP-10260',
    catalogueId: 'cat_northline_apparel',
    contactId: 'contact_sameer_joshi',
    selectionId: null,
    branchId: 'branch_mumbai',
    ownerId: 'user_vikram',
    status: 'reconciliation-required',
    syncStatus: 'reconciliation-required',
    requestedSnapshot: [{ itemId: 'it_ap_sar_mrn', variantId: null, title: 'Banarasi Silk Saree — Maroon', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 8999, lineTotal: 8999 }],
    confirmedSnapshot: null,
    commercialSummary: { subtotal: 8999, discount: 0, tax: 0, total: 8999, currency: 'INR' },
    commercialNotes: 'Checkout phone number did not match any CRM contact — linked manually pending confirmation.',
    payment: { status: 'pending', balanceDue: 8999, currency: 'INR', requests: [] },
    fulfilment: { status: 'not-started', courier: null, trackingNumber: null, trackingUrl: null, expectedDeliveryAt: null, exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: null,
    timeline: [{ id: 'ord_apparel_unmatched_1', at: '2026-08-11T08:00:00+05:30', actorId: null, actorLabel: 'Shopify webhook', action: 'Order received — unmatched customer', detail: 'Checkout phone +919900011223 had no CRM match; linked to contact_sameer_joshi by Vikram Rao pending verification.', source: 'integration' }],
    createdAt: '2026-08-11T08:00:00+05:30',
    updatedAt: '2026-08-11T08:10:00+05:30',
  },
  {
    id: 'order_decor_checkout',
    source: 'crm-managed-checkout',
    connectorId: null,
    externalOrderId: null,
    catalogueId: 'cat_home_decor',
    contactId: 'contact_sneha_iyer',
    selectionId: 'cart_sneha_decor',
    branchId: 'branch_mumbai',
    ownerId: 'user_karan',
    status: 'confirmed',
    syncStatus: 'not-applicable',
    requestedSnapshot: [
      { itemId: 'it_va_cer_tall', variantId: null, title: 'Tall Ceramic Vase — Matte Clay', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 1899, lineTotal: 1899 },
      { itemId: 'it_wa_canvas_trp', variantId: null, title: 'Monsoon Canvas Triptych — Framed', quantityPieces: 1, quantityWeightGm: null, priceMode: 'offer', unitPrice: 4499, lineTotal: 4499 },
    ],
    confirmedSnapshot: [
      { itemId: 'it_va_cer_tall', variantId: null, title: 'Tall Ceramic Vase — Matte Clay', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 1899, lineTotal: 1899 },
      { itemId: 'it_wa_canvas_trp', variantId: null, title: 'Monsoon Canvas Triptych — Framed', quantityPieces: 1, quantityWeightGm: null, priceMode: 'offer', unitPrice: 4499, lineTotal: 4499 },
    ],
    commercialSummary: { subtotal: 6398, discount: 0, tax: 0, total: 6398, currency: 'INR' },
    commercialNotes: 'CRM-managed prototype checkout — no connected storefront for this catalogue.',
    payment: { status: 'success', balanceDue: 0, currency: 'INR', requests: [{ id: 'preq_decor_checkout', amount: 6398, currency: 'INR', method: 'Manual — UPI', createdAt: '2026-08-10T14:00:00+05:30', expiresAt: '2026-08-11T14:00:00+05:30', status: 'success', link: null }] },
    fulfilment: { status: 'packed', courier: null, trackingNumber: null, trackingUrl: null, expectedDeliveryAt: '2026-08-13T18:00:00+05:30', exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: null,
    timeline: [{ id: 'ord_decor_checkout_1', at: '2026-08-10T14:05:00+05:30', actorId: 'user_karan', actorLabel: 'Karan Mehta', action: 'Order created', detail: 'Converted from cart_sneha_decor via CRM prototype checkout.', source: 'manual' }],
    createdAt: '2026-08-10T14:05:00+05:30',
    updatedAt: '2026-08-11T09:00:00+05:30',
  },
  {
    id: 'order_bangle_cancelled',
    source: 'crm-request',
    connectorId: 'connector_acme_infinity',
    externalOrderId: null,
    catalogueId: 'cat_aurum_festive',
    contactId: 'contact_arjun_verma',
    selectionId: null,
    branchId: 'branch_delhi',
    ownerId: 'user_meera',
    status: 'cancelled',
    syncStatus: 'not-applicable',
    requestedSnapshot: [{ itemId: 'it_bn_110', variantId: null, title: 'Everyday Twist Bangle', quantityPieces: 1, quantityWeightGm: 9.6, priceMode: 'fixed', unitPrice: 68500, lineTotal: 68500 }],
    confirmedSnapshot: null,
    commercialSummary: { subtotal: 68500, discount: 0, tax: 0, total: 68500, currency: 'INR' },
    commercialNotes: 'Customer changed mind before ERP push — cancelled with manager approval.',
    payment: { status: 'not-requested', balanceDue: null, currency: 'INR', requests: [] },
    fulfilment: { status: 'not-started', courier: null, trackingNumber: null, trackingUrl: null, expectedDeliveryAt: null, exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: null,
    timeline: [
      { id: 'ord_bangle_cancel_1', at: '2026-08-03T10:00:00+05:30', actorId: 'user_meera', actorLabel: 'Meera Nair', action: 'Created Order Request', detail: '', source: 'manual' },
      { id: 'ord_bangle_cancel_2', at: '2026-08-03T16:00:00+05:30', actorId: 'user_meera', actorLabel: 'Meera Nair', action: 'Requested cancellation approval', detail: 'Customer changed mind.', source: 'manual' },
      { id: 'ord_bangle_cancel_3', at: '2026-08-03T17:30:00+05:30', actorId: 'user_vikram', actorLabel: 'Vikram Rao', action: 'Approved cancellation', detail: 'apr_cancel_bangle approved.', source: 'approval' },
    ],
    createdAt: '2026-08-03T10:00:00+05:30',
    updatedAt: '2026-08-03T17:30:00+05:30',
  },
  {
    id: 'order_apparel_delivered',
    source: 'external-sync',
    connectorId: 'connector_shopify_northline',
    externalOrderId: '#SHOP-10190',
    catalogueId: 'cat_northline_apparel',
    contactId: 'contact_imran_qureshi',
    selectionId: null,
    branchId: 'branch_delhi',
    ownerId: 'user_meera',
    status: 'delivered',
    syncStatus: 'synced',
    requestedSnapshot: [{ itemId: 'it_ap_ank_ind', variantId: 'var_ank_ind_s', title: 'Anarkali Straight Kurta — Indigo (S)', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 2199, lineTotal: 2199 }],
    confirmedSnapshot: [{ itemId: 'it_ap_ank_ind', variantId: 'var_ank_ind_s', title: 'Anarkali Straight Kurta — Indigo (S)', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 2199, lineTotal: 2199 }],
    commercialSummary: { subtotal: 2199, discount: 0, tax: 0, total: 2199, currency: 'INR' },
    commercialNotes: '',
    payment: { status: 'success', balanceDue: 0, currency: 'INR', requests: [{ id: 'preq_apparel_delivered', amount: 2199, currency: 'INR', method: 'Shopify Checkout', createdAt: '2026-07-28T09:00:00+05:30', expiresAt: '2026-07-28T09:00:00+05:30', status: 'success', link: null }] },
    fulfilment: { status: 'delivered', courier: 'Delhivery', trackingNumber: 'DL772341', trackingUrl: 'https://track.delhivery.example/DL772341', expectedDeliveryAt: '2026-08-01T18:00:00+05:30', exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: 'return_apparel_gateway',
    timeline: [{ id: 'ord_apparel_delivered_1', at: '2026-08-01T17:20:00+05:30', actorId: null, actorLabel: 'Delhivery webhook', action: 'Delivered', detail: 'Signed by recipient.', source: 'integration' }],
    createdAt: '2026-07-28T09:00:00+05:30',
    updatedAt: '2026-08-01T17:20:00+05:30',
  },
  {
    id: 'order_decor_delivered',
    source: 'crm-managed-checkout',
    connectorId: null,
    externalOrderId: null,
    catalogueId: 'cat_home_decor',
    contactId: 'contact_rohit_malhotra',
    selectionId: null,
    branchId: 'branch_bengaluru',
    ownerId: 'user_anita',
    status: 'delivered',
    syncStatus: 'not-applicable',
    requestedSnapshot: [{ itemId: 'it_tw_stone_set', variantId: null, title: 'Stoneware Dinner Set (16-piece)', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 6499, lineTotal: 6499 }],
    confirmedSnapshot: [{ itemId: 'it_tw_stone_set', variantId: null, title: 'Stoneware Dinner Set (16-piece)', quantityPieces: 1, quantityWeightGm: null, priceMode: 'fixed', unitPrice: 6499, lineTotal: 6499 }],
    commercialSummary: { subtotal: 6499, discount: 0, tax: 0, total: 6499, currency: 'INR' },
    commercialNotes: '',
    payment: { status: 'success', balanceDue: 0, currency: 'INR', requests: [{ id: 'preq_decor_delivered', amount: 6499, currency: 'INR', method: 'Manual — Bank transfer', createdAt: '2026-07-20T10:00:00+05:30', expiresAt: '2026-07-21T10:00:00+05:30', status: 'success', link: null }] },
    fulfilment: { status: 'delivered', courier: 'Local courier', trackingNumber: null, trackingUrl: null, expectedDeliveryAt: '2026-07-24T18:00:00+05:30', exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: 'return_decor_manual',
    timeline: [{ id: 'ord_decor_delivered_1', at: '2026-07-24T16:00:00+05:30', actorId: 'user_anita', actorLabel: 'Anita Sharma', action: 'Marked delivered', detail: 'Recorded manually — no courier integration for local deliveries.', source: 'manual' }],
    createdAt: '2026-07-20T10:00:00+05:30',
    updatedAt: '2026-07-24T16:00:00+05:30',
  },
  {
    id: 'order_ring_delivered',
    source: 'crm-request',
    connectorId: 'connector_acme_infinity',
    externalOrderId: 'ERP-SO-88213',
    catalogueId: 'cat_aurum_festive',
    contactId: 'contact_rahul_shah',
    selectionId: null,
    branchId: 'branch_delhi',
    ownerId: 'user_meera',
    status: 'delivered',
    syncStatus: 'synced',
    requestedSnapshot: [{ itemId: 'it_rg_2050', variantId: null, title: 'Solitaire Halo Ring', quantityPieces: 1, quantityWeightGm: 3.9, priceMode: 'offer', unitPrice: 142000, lineTotal: 142000 }],
    confirmedSnapshot: [{ itemId: 'it_rg_2050', variantId: null, title: 'Solitaire Halo Ring', quantityPieces: 1, quantityWeightGm: 3.9, priceMode: 'offer', unitPrice: 142000, lineTotal: 142000 }],
    commercialSummary: { subtotal: 142000, discount: 16000, tax: 0, total: 142000, currency: 'INR' },
    commercialNotes: '',
    payment: { status: 'success', balanceDue: 0, currency: 'INR', requests: [{ id: 'preq_ring_delivered', amount: 142000, currency: 'INR', method: 'Manual — Bank transfer', createdAt: '2026-07-10T10:00:00+05:30', expiresAt: '2026-07-11T10:00:00+05:30', status: 'success', link: null }] },
    fulfilment: { status: 'delivered', courier: 'Branch handover', trackingNumber: null, trackingUrl: null, expectedDeliveryAt: '2026-07-15T18:00:00+05:30', exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: 'return_ring_replacement',
    timeline: [{ id: 'ord_ring_delivered_1', at: '2026-07-15T17:00:00+05:30', actorId: 'user_meera', actorLabel: 'Meera Nair', action: 'Handed over at branch', detail: 'Synced back to ERP as ERP-SO-88213.', source: 'integration' }],
    createdAt: '2026-07-08T11:00:00+05:30',
    updatedAt: '2026-07-15T17:00:00+05:30',
  },
];

export function findOrder(id: string): Order | undefined {
  return orders.find((order) => order.id === id);
}

export function ordersForContact(contactId: string): Order[] {
  return orders.filter((order) => order.contactId === contactId);
}

export function ordersForCatalogue(catalogueId: string): Order[] {
  return orders.filter((order) => order.catalogueId === catalogueId);
}

/** Central mutation point so every screen edit lands in `updatedAt` consistently. */
export function updateOrder(id: string, patch: Partial<Order>): Order | undefined {
  const order = findOrder(id);
  if (!order) return undefined;
  Object.assign(order, patch, { updatedAt: new Date().toISOString() });
  return order;
}

export function appendOrderTimelineEvent(id: string, event: Omit<AuditEvent, 'id'>): Order | undefined {
  const order = findOrder(id);
  if (!order) return undefined;
  order.timeline.push({ id: `ord_${id}_${order.timeline.length + 1}`, ...event });
  order.updatedAt = new Date().toISOString();
  return order;
}

let orderSeq = 0;

/**
 * Converts a Saved Selection (B2B) or Cart (B2C) into an Order — the join
 * point between §3.7's two business-mode chains. B2B lands as `crm-request`
 * (pending sync to whatever connector the catalogue uses); B2C lands as
 * `crm-managed-checkout` when there's no connected storefront to hand off to.
 */
export function createOrderFromSelection(selection: {
  id: string;
  intent: 'selection' | 'cart';
  catalogueId: string;
  contactId: string;
  branchId: string;
  ownerId: string;
  items: { itemId: string; variantId: string | null; quantityPieces: number | null; quantityWeightGm: number | null; priceAtSelection: number | null }[];
}, connectorId: string | null): Order {
  orderSeq += 1;
  const now = new Date().toISOString();
  const requestedSnapshot: OrderLine[] = selection.items.map((line) => ({
    itemId: line.itemId,
    variantId: line.variantId,
    title: line.itemId,
    quantityPieces: line.quantityPieces,
    quantityWeightGm: line.quantityWeightGm,
    priceMode: line.priceAtSelection != null ? 'fixed' : 'dynamic',
    unitPrice: line.priceAtSelection,
    lineTotal: line.priceAtSelection != null && line.quantityPieces != null ? line.priceAtSelection * line.quantityPieces : null,
  }));
  const subtotal = requestedSnapshot.every((l) => l.lineTotal != null) ? requestedSnapshot.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0) : null;
  const order: Order = {
    id: `order_draft_${++orderSeq}`,
    source: selection.intent === 'cart' ? 'crm-managed-checkout' : 'crm-request',
    connectorId,
    externalOrderId: null,
    catalogueId: selection.catalogueId,
    contactId: selection.contactId,
    selectionId: selection.id,
    branchId: selection.branchId,
    ownerId: selection.ownerId,
    status: selection.intent === 'cart' ? 'confirmed' : 'pending-confirmation',
    syncStatus: connectorId ? 'pending-sync' : 'not-applicable',
    requestedSnapshot,
    confirmedSnapshot: selection.intent === 'cart' ? requestedSnapshot : null,
    commercialSummary: { subtotal, discount: 0, tax: 0, total: subtotal, currency: 'INR' },
    commercialNotes: '',
    payment: { status: 'not-requested', balanceDue: subtotal, currency: 'INR', requests: [] },
    fulfilment: { status: 'not-started', courier: null, trackingNumber: null, trackingUrl: null, expectedDeliveryAt: null, exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: null,
    timeline: [{ id: `ord_draft_${orderSeq}_1`, at: now, actorId: selection.ownerId, actorLabel: 'You', action: selection.intent === 'cart' ? 'Order created from cart' : 'Created Order Request', detail: `Converted from ${selection.id}.`, source: 'manual' }],
    createdAt: now,
    updatedAt: now,
  };
  orders.push(order);
  return order;
}

/**
 * ECO-S21 "Create Order Request" — B2B/connector-aware manual creation
 * without a preceding Saved Selection (Requirement §Y1, Original F10). Lands
 * `pending-confirmation` rather than `confirmed`: a manually built B2B
 * request still needs the customer/ERP to confirm final quantity, weight and
 * rate before it becomes a firm order (§L "Customer confirmation rule").
 */
export function createManualOrderRequest(input: {
  catalogueId: string;
  contactId: string;
  branchId: string;
  ownerId: string;
  ownerLabel: string;
  connectorId: string | null;
  lines: { itemId: string; title: string; quantityPieces: number | null; quantityWeightGm: number | null; priceMode: PriceMode; unitPrice: number | null }[];
  commercialNotes: string;
}): Order {
  orderSeq += 1;
  const now = new Date().toISOString();
  const requestedSnapshot: OrderLine[] = input.lines.map((line) => ({
    itemId: line.itemId,
    variantId: null,
    title: line.title,
    quantityPieces: line.quantityPieces,
    quantityWeightGm: line.quantityWeightGm,
    priceMode: line.priceMode,
    unitPrice: line.unitPrice,
    lineTotal: line.unitPrice != null && line.quantityPieces != null ? line.unitPrice * line.quantityPieces : null,
  }));
  const subtotal = requestedSnapshot.length > 0 && requestedSnapshot.every((l) => l.lineTotal != null) ? requestedSnapshot.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0) : null;
  const order: Order = {
    id: `order_draft_${++orderSeq}`,
    source: 'crm-request',
    connectorId: input.connectorId,
    externalOrderId: null,
    catalogueId: input.catalogueId,
    contactId: input.contactId,
    selectionId: null,
    branchId: input.branchId,
    ownerId: input.ownerId,
    status: 'pending-confirmation',
    syncStatus: input.connectorId ? 'pending-sync' : 'not-applicable',
    requestedSnapshot,
    confirmedSnapshot: null,
    commercialSummary: { subtotal, discount: 0, tax: 0, total: subtotal, currency: 'INR' },
    commercialNotes: input.commercialNotes,
    payment: { status: 'not-requested', balanceDue: subtotal, currency: 'INR', requests: [] },
    fulfilment: { status: 'not-started', courier: null, trackingNumber: null, trackingUrl: null, expectedDeliveryAt: null, exceptionReason: null, exceptionOwnerId: null },
    returnCaseId: null,
    timeline: [{ id: `ord_draft_${orderSeq}_1`, at: now, actorId: input.ownerId, actorLabel: input.ownerLabel, action: 'Created Order Request', detail: 'Created manually, awaiting customer/ERP confirmation.', source: 'manual' }],
    createdAt: now,
    updatedAt: now,
  };
  orders.push(order);
  return order;
}
