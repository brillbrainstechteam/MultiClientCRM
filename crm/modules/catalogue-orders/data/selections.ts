import type { SavedSelection } from '../domain/types';

/**
 * Saved Selections (B2B, Requirement §L2) and Carts (B2C, Requirement §Z)
 * share one shape — `intent` decides which UI language is used. Statuses
 * deliberately span the full lifecycle so every state in §AH5 is reachable.
 */
export const selections: SavedSelection[] = [
  {
    id: 'sel_rahul_shared',
    intent: 'selection',
    catalogueId: 'cat_aurum_festive',
    contactId: 'contact_rahul_shah',
    conversationId: 'conv_rahul_shah_01',
    ownerId: 'user_meera',
    branchId: 'branch_delhi',
    eventSource: 'WhatsApp enquiry',
    items: [{ itemId: 'it_rg_2050', variantId: null, quantityPieces: 1, quantityWeightGm: 3.9, priceAtSelection: 142000, notes: '' }],
    requestedPieces: 1,
    requestedWeightGm: 3.9,
    notes: 'Wants gift-boxed for anniversary next week.',
    status: 'shared',
    sharedAt: '2026-08-09T18:00:00+05:30',
    lastCustomerResponseAt: null,
    orderId: null,
    createdAt: '2026-08-09T17:40:00+05:30',
    updatedAt: '2026-08-09T18:00:00+05:30',
    audit: [{ id: 'aud_sel_rahul_1', at: '2026-08-09T18:00:00+05:30', actorId: 'user_meera', actorLabel: 'Meera Nair', action: 'Shared on WhatsApp', detail: '1 design shared via wa_delhi_sales.', source: 'manual' }],
  },
  {
    id: 'sel_kavita_converted',
    intent: 'selection',
    catalogueId: 'cat_aurum_festive',
    contactId: 'contact_kavita_desai',
    conversationId: 'conv_kavita_desai_01',
    ownerId: 'user_vikram',
    branchId: 'branch_delhi',
    eventSource: 'Exhibition — Delhi Trade Fair',
    items: [
      { itemId: 'it_rg_1042', variantId: null, quantityPieces: 2, quantityWeightGm: 9.6, priceAtSelection: null, notes: 'Matching pair for daughters.' },
      { itemId: 'it_nk_201', variantId: null, quantityPieces: 1, quantityWeightGm: 22.4, priceAtSelection: null, notes: '' },
    ],
    requestedPieces: 3,
    requestedWeightGm: 32,
    notes: 'Confirmed at trade fair booth — converted same day.',
    status: 'converted',
    sharedAt: '2026-08-06T12:00:00+05:30',
    lastCustomerResponseAt: '2026-08-06T15:30:00+05:30',
    orderId: 'order_gold_ring_request',
    createdAt: '2026-08-06T11:00:00+05:30',
    updatedAt: '2026-08-06T15:45:00+05:30',
    audit: [
      { id: 'aud_sel_kavita_1', at: '2026-08-06T15:30:00+05:30', actorId: null, actorLabel: 'Kavita Desai', action: 'Confirmed selection', detail: 'Customer confirmed all 3 pieces.', source: 'manual' },
      { id: 'aud_sel_kavita_2', at: '2026-08-06T15:45:00+05:30', actorId: 'user_vikram', actorLabel: 'Vikram Rao', action: 'Converted to Order Request', detail: 'Created order_gold_ring_request.', source: 'manual' },
    ],
  },
  {
    id: 'sel_ananya_review',
    intent: 'selection',
    catalogueId: 'cat_aurum_lightweight',
    contactId: 'contact_ananya_reddy',
    conversationId: 'conv_ananya_reddy_01',
    ownerId: 'user_meera',
    branchId: 'branch_delhi',
    eventSource: 'WhatsApp enquiry',
    items: [{ itemId: 'it_rg_777', variantId: null, quantityPieces: 1, quantityWeightGm: 3.2, priceAtSelection: null, notes: '' }],
    requestedPieces: 1,
    requestedWeightGm: 3.2,
    notes: 'Asked for rate-linked quote before confirming.',
    status: 'customer-reviewing',
    sharedAt: '2026-08-10T10:00:00+05:30',
    lastCustomerResponseAt: null,
    orderId: null,
    createdAt: '2026-08-10T09:45:00+05:30',
    updatedAt: '2026-08-10T10:00:00+05:30',
    audit: [],
  },
  {
    id: 'sel_deepa_revised',
    intent: 'selection',
    catalogueId: 'cat_aurum_lightweight',
    contactId: 'contact_deepa_krishnan',
    conversationId: 'conv_deepa_krishnan_01',
    ownerId: 'user_meera',
    branchId: 'branch_delhi',
    eventSource: 'Referral',
    items: [{ itemId: 'it_pd_220', variantId: null, quantityPieces: 2, quantityWeightGm: 5.2, priceAtSelection: 3200, notes: 'One for herself, one as a gift.' }],
    requestedPieces: 2,
    requestedWeightGm: 5.2,
    notes: 'Originally shortlisted 3 pieces — dropped the earrings after price-on-request.',
    status: 'revised',
    sharedAt: '2026-08-08T09:00:00+05:30',
    lastCustomerResponseAt: '2026-08-08T19:00:00+05:30',
    orderId: null,
    createdAt: '2026-08-07T16:00:00+05:30',
    updatedAt: '2026-08-08T19:00:00+05:30',
    audit: [{ id: 'aud_sel_deepa_1', at: '2026-08-08T19:00:00+05:30', actorId: 'user_meera', actorLabel: 'Meera Nair', action: 'Revised selection', detail: 'Removed ER-410 at customer request.', source: 'manual' }],
  },
  {
    id: 'sel_arjun_draft',
    intent: 'selection',
    catalogueId: 'cat_aurum_festive',
    contactId: 'contact_arjun_verma',
    conversationId: null,
    ownerId: 'user_meera',
    branchId: 'branch_delhi',
    eventSource: 'Manual',
    items: [],
    requestedPieces: null,
    requestedWeightGm: null,
    notes: '',
    status: 'draft',
    sharedAt: null,
    lastCustomerResponseAt: null,
    orderId: null,
    createdAt: '2026-08-11T08:30:00+05:30',
    updatedAt: '2026-08-11T08:30:00+05:30',
    audit: [],
  },
  {
    id: 'sel_sameer_lost',
    intent: 'selection',
    catalogueId: 'cat_aurum_festive',
    contactId: 'contact_sameer_joshi',
    conversationId: 'conv_sameer_joshi_01',
    ownerId: 'user_vikram',
    branchId: 'branch_delhi',
    eventSource: 'WhatsApp enquiry',
    items: [{ itemId: 'it_bn_110', variantId: null, quantityPieces: 1, quantityWeightGm: 9.6, priceAtSelection: 68500, notes: '' }],
    requestedPieces: 1,
    requestedWeightGm: 9.6,
    notes: 'Purchased from a competitor showroom instead.',
    status: 'closed-lost',
    sharedAt: '2026-07-25T11:00:00+05:30',
    lastCustomerResponseAt: '2026-07-29T09:00:00+05:30',
    orderId: null,
    createdAt: '2026-07-24T10:00:00+05:30',
    updatedAt: '2026-07-29T09:00:00+05:30',
    audit: [{ id: 'aud_sel_sameer_1', at: '2026-07-29T09:00:00+05:30', actorId: 'user_vikram', actorLabel: 'Vikram Rao', action: 'Marked closed / lost', detail: 'Customer purchased elsewhere.', source: 'manual' }],
  },
  {
    id: 'cart_sneha_decor',
    intent: 'cart',
    catalogueId: 'cat_home_decor',
    contactId: 'contact_sneha_iyer',
    conversationId: 'conv_sneha_iyer_01',
    ownerId: 'user_karan',
    branchId: 'branch_mumbai',
    eventSource: 'Website form',
    items: [
      { itemId: 'it_va_cer_tall', variantId: null, quantityPieces: 1, quantityWeightGm: null, priceAtSelection: 1899, notes: '' },
      { itemId: 'it_wa_canvas_trp', variantId: null, quantityPieces: 1, quantityWeightGm: null, priceAtSelection: 4499, notes: '' },
    ],
    requestedPieces: 2,
    requestedWeightGm: null,
    notes: '',
    status: 'converted',
    sharedAt: null,
    lastCustomerResponseAt: '2026-08-10T14:00:00+05:30',
    orderId: 'order_decor_checkout',
    createdAt: '2026-08-10T13:30:00+05:30',
    updatedAt: '2026-08-10T14:05:00+05:30',
    audit: [{ id: 'aud_cart_sneha_1', at: '2026-08-10T14:05:00+05:30', actorId: null, actorLabel: 'Sneha Iyer', action: 'Checked out', detail: 'Converted to order_decor_checkout via CRM prototype checkout.', source: 'manual' }],
  },
  {
    id: 'cart_farhan_abandoned',
    intent: 'cart',
    catalogueId: 'cat_northline_apparel',
    contactId: 'contact_farhan_ali',
    conversationId: 'conv_farhan_ali_01',
    ownerId: 'user_karan',
    branchId: 'branch_mumbai',
    eventSource: 'WhatsApp catalogue browse',
    items: [{ itemId: 'it_ap_ank_ind', variantId: 'var_ank_ind_m', quantityPieces: 1, quantityWeightGm: null, priceAtSelection: 2199, notes: '' }],
    requestedPieces: 1,
    requestedWeightGm: null,
    notes: '',
    status: 'abandoned',
    sharedAt: null,
    lastCustomerResponseAt: '2026-08-08T20:15:00+05:30',
    orderId: null,
    createdAt: '2026-08-08T19:50:00+05:30',
    updatedAt: '2026-08-08T20:15:00+05:30',
    audit: [],
  },
];

export function findSelection(id: string): SavedSelection | undefined {
  return selections.find((selection) => selection.id === id);
}

export function selectionsForContact(contactId: string): SavedSelection[] {
  return selections.filter((selection) => selection.contactId === contactId);
}

let selectionSeq = 0;

export type NewSelectionInput = Pick<SavedSelection, 'intent' | 'catalogueId' | 'contactId' | 'conversationId' | 'ownerId' | 'branchId' | 'eventSource'>;

export function createSelection(input: NewSelectionInput): SavedSelection {
  selectionSeq += 1;
  const now = new Date().toISOString();
  const selection: SavedSelection = {
    id: `${input.intent === 'cart' ? 'cart' : 'sel'}_draft_${selectionSeq}`,
    ...input,
    items: [],
    requestedPieces: null,
    requestedWeightGm: null,
    notes: '',
    status: 'draft',
    sharedAt: null,
    lastCustomerResponseAt: null,
    orderId: null,
    createdAt: now,
    updatedAt: now,
    audit: [],
  };
  selections.push(selection);
  return selection;
}

export function updateSelection(id: string, patch: Partial<SavedSelection>): SavedSelection | undefined {
  const index = selections.findIndex((selection) => selection.id === id);
  if (index === -1) return undefined;
  selections[index] = { ...selections[index], ...patch, updatedAt: new Date().toISOString() };
  return selections[index];
}
