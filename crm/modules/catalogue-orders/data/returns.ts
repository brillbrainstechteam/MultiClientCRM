import type { ReturnCase, ReturnLine, ReturnType } from '../domain/types';

/**
 * Return / replacement / refund fixtures (Requirement §AB). Spans gateway vs
 * manual refund (AB4 "distinguish provider refund vs manually recorded"),
 * a received-quantity mismatch, an unavailable-replacement fallback, and an
 * ineligible request rejected before the order was even delivered.
 */
export const returnCases: ReturnCase[] = [
  {
    id: 'return_apparel_gateway',
    orderId: 'order_apparel_delivered',
    contactId: 'contact_imran_qureshi',
    type: 'return',
    items: [{ itemId: 'it_ap_ank_ind', variantId: 'var_ank_ind_s', quantity: 1, reason: 'Size too small' }],
    reasonNotes: 'Customer requests full refund — will reorder in size M separately.',
    evidenceUrls: ['https://cdn.northline.test/returns/return_apparel_gateway_1.jpg'],
    eligibility: 'eligible',
    status: 'collected',
    collectionScheduledAt: '2026-08-06T12:00:00+05:30',
    replacementOrderId: null,
    refundMethod: 'gateway',
    refundAmount: 2199,
    refundStatus: 'processing',
    ownerId: 'user_meera',
    timeline: [
      { id: 'ret_apparel_1', at: '2026-08-03T10:00:00+05:30', actorId: null, actorLabel: 'Imran Qureshi', action: 'Requested return', detail: 'Reported via Inbox conversation.', source: 'manual' },
      { id: 'ret_apparel_2', at: '2026-08-04T09:00:00+05:30', actorId: 'user_meera', actorLabel: 'Meera Nair', action: 'Approved', detail: 'Within 7-day return window.', source: 'manual' },
      { id: 'ret_apparel_3', at: '2026-08-06T12:00:00+05:30', actorId: null, actorLabel: 'Delhivery webhook', action: 'Collected', detail: 'Pickup completed.', source: 'integration' },
    ],
    createdAt: '2026-08-03T10:00:00+05:30',
    updatedAt: '2026-08-06T12:00:00+05:30',
  },
  {
    id: 'return_decor_manual',
    orderId: 'order_decor_delivered',
    contactId: 'contact_rohit_malhotra',
    type: 'return',
    items: [{ itemId: 'it_tw_stone_set', variantId: null, quantity: 1, reason: 'Two plates arrived cracked' }],
    reasonNotes: 'Customer returned the full set but only 14 of 16 pieces were received back.',
    evidenceUrls: ['https://cdn.northline.test/returns/return_decor_manual_1.jpg', 'https://cdn.northline.test/returns/return_decor_manual_2.jpg'],
    eligibility: 'eligible',
    status: 'received-mismatch',
    collectionScheduledAt: '2026-07-27T11:00:00+05:30',
    replacementOrderId: null,
    refundMethod: 'manual',
    refundAmount: 6499,
    refundStatus: 'manual-confirmation-required',
    ownerId: 'user_anita',
    timeline: [
      { id: 'ret_decor_1', at: '2026-07-25T09:00:00+05:30', actorId: null, actorLabel: 'Rohit Malhotra', action: 'Requested return', detail: 'Reported breakage with photos.', source: 'manual' },
      { id: 'ret_decor_2', at: '2026-07-25T14:00:00+05:30', actorId: 'user_anita', actorLabel: 'Anita Sharma', action: 'Approved', detail: '', source: 'manual' },
      { id: 'ret_decor_3', at: '2026-07-28T10:00:00+05:30', actorId: 'user_anita', actorLabel: 'Anita Sharma', action: 'Received — quantity mismatch', detail: '14 of 16 pieces received; following up with courier for remainder.', source: 'manual' },
    ],
    createdAt: '2026-07-25T09:00:00+05:30',
    updatedAt: '2026-07-28T10:00:00+05:30',
  },
  {
    id: 'return_ring_replacement',
    orderId: 'order_ring_delivered',
    contactId: 'contact_rahul_shah',
    type: 'replacement',
    items: [{ itemId: 'it_rg_2050', variantId: null, quantity: 1, reason: 'Size adjustment needed' }],
    reasonNotes: 'Replacement in size 14 not currently in stock at any branch — offering refund as an alternative while customer decides.',
    evidenceUrls: [],
    eligibility: 'eligible',
    status: 'approved',
    collectionScheduledAt: null,
    replacementOrderId: null,
    refundMethod: null,
    refundAmount: null,
    refundStatus: null,
    ownerId: 'user_meera',
    timeline: [
      { id: 'ret_ring_1', at: '2026-07-18T10:00:00+05:30', actorId: null, actorLabel: 'Rahul Shah', action: 'Requested replacement', detail: 'Ring runs small — needs size 14.', source: 'manual' },
      { id: 'ret_ring_2', at: '2026-07-19T09:00:00+05:30', actorId: 'user_meera', actorLabel: 'Meera Nair', action: 'Approved', detail: 'Checked ERP stock — size 14 unavailable, offered refund alternative.', source: 'manual' },
    ],
    createdAt: '2026-07-18T10:00:00+05:30',
    updatedAt: '2026-07-19T09:00:00+05:30',
  },
  {
    id: 'return_decor_ineligible',
    orderId: 'order_decor_checkout',
    contactId: 'contact_sneha_iyer',
    type: 'return',
    items: [{ itemId: 'it_va_cer_tall', variantId: null, quantity: 1, reason: 'Wrong colour expected' }],
    reasonNotes: 'Order not yet delivered — return window has not started.',
    evidenceUrls: [],
    eligibility: 'ineligible',
    status: 'rejected',
    collectionScheduledAt: null,
    replacementOrderId: null,
    refundMethod: null,
    refundAmount: null,
    refundStatus: null,
    ownerId: 'user_karan',
    timeline: [{ id: 'ret_decor_ineligible_1', at: '2026-08-11T09:30:00+05:30', actorId: 'user_karan', actorLabel: 'Karan Mehta', action: 'Rejected', detail: 'Order still in transit — asked customer to wait for delivery or contact support after receipt.', source: 'manual' }],
    createdAt: '2026-08-11T09:15:00+05:30',
    updatedAt: '2026-08-11T09:30:00+05:30',
  },
];

export function findReturnCase(id: string): ReturnCase | undefined {
  return returnCases.find((returnCase) => returnCase.id === id);
}

export function returnCasesForOrder(orderId: string): ReturnCase[] {
  return returnCases.filter((returnCase) => returnCase.orderId === orderId);
}

let returnSeq = 0;

/** ECO-F17 "Record request" step — starts a return/replacement/refund-only case as `requested`. */
export function createReturnCase(input: {
  orderId: string;
  contactId: string;
  type: ReturnType;
  items: ReturnLine[];
  reasonNotes: string;
  ownerId: string;
  ownerLabel: string;
  eligibility: ReturnCase['eligibility'];
}): ReturnCase {
  returnSeq += 1;
  const now = new Date().toISOString();
  const returnCase: ReturnCase = {
    id: `return_draft_${returnSeq}`,
    orderId: input.orderId,
    contactId: input.contactId,
    type: input.type,
    items: input.items,
    reasonNotes: input.reasonNotes,
    evidenceUrls: [],
    eligibility: input.eligibility,
    status: input.eligibility === 'ineligible' ? 'rejected' : 'requested',
    collectionScheduledAt: null,
    replacementOrderId: null,
    refundMethod: null,
    refundAmount: null,
    refundStatus: null,
    ownerId: input.ownerId,
    timeline: [
      {
        id: `ret_draft_${returnSeq}_1`,
        at: now,
        actorId: input.ownerId,
        actorLabel: input.ownerLabel,
        action: input.eligibility === 'ineligible' ? 'Rejected — ineligible' : 'Requested return',
        detail: input.reasonNotes,
        source: 'manual',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  returnCases.push(returnCase);
  return returnCase;
}

export function updateReturnCase(id: string, patch: Partial<ReturnCase>): ReturnCase | undefined {
  const returnCase = findReturnCase(id);
  if (!returnCase) return undefined;
  Object.assign(returnCase, patch, { updatedAt: new Date().toISOString() });
  return returnCase;
}
