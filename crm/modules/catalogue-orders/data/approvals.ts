import type { ApprovalRequest } from '../domain/types';

/** Controlled-action approvals (Requirement §AB2/AB4, ECO-S27). */
export const approvalRequests: ApprovalRequest[] = [
  {
    id: 'apr_cancel_bangle',
    type: 'cancel',
    entityType: 'order',
    entityId: 'order_bangle_cancelled',
    entityLabel: 'Order Request — Everyday Twist Bangle (Arjun Verma)',
    requestedById: 'user_meera',
    requesterNote: 'Customer changed mind before ERP push.',
    thresholdLabel: 'Any cancellation before ERP sync requires manager approval.',
    approverId: 'user_vikram',
    status: 'approved',
    decidedAt: '2026-08-03T17:30:00+05:30',
    decisionNote: 'Approved — no payment collected yet.',
    createdAt: '2026-08-03T16:00:00+05:30',
  },
  {
    id: 'apr_discount_ring',
    type: 'discount',
    entityType: 'selection',
    entityId: 'sel_rahul_shared',
    entityLabel: 'Selection — Solitaire Halo Ring (Rahul Shah)',
    requestedById: 'user_meera',
    requesterNote: 'Customer asked for an additional 5% off the festive offer price.',
    thresholdLabel: 'Discounts beyond the published offer require owner approval.',
    approverId: null,
    status: 'pending',
    decidedAt: null,
    decisionNote: null,
    createdAt: '2026-08-10T11:00:00+05:30',
  },
  {
    id: 'apr_refund_decor',
    type: 'refund',
    entityType: 'return',
    entityId: 'return_decor_manual',
    entityLabel: 'Return — Stoneware Dinner Set (Rohit Malhotra)',
    requestedById: 'user_anita',
    requesterNote: 'Manual refund of ₹6,499 pending finance confirmation — quantity mismatch on received items.',
    thresholdLabel: 'Manual refunds over ₹5,000 require finance sign-off.',
    approverId: null,
    status: 'pending',
    decidedAt: null,
    decisionNote: null,
    createdAt: '2026-07-28T10:15:00+05:30',
  },
];

export function findApproval(id: string): ApprovalRequest | undefined {
  return approvalRequests.find((approval) => approval.id === id);
}

export function approvalsForEntity(entityType: ApprovalRequest['entityType'], entityId: string): ApprovalRequest[] {
  return approvalRequests.filter((approval) => approval.entityType === entityType && approval.entityId === entityId);
}

let approvalSeq = 0;

export function createApproval(input: Omit<ApprovalRequest, 'id' | 'status' | 'approverId' | 'decidedAt' | 'decisionNote' | 'createdAt'>): ApprovalRequest {
  approvalSeq += 1;
  const approval: ApprovalRequest = {
    id: `apr_draft_${approvalSeq}`,
    status: 'pending',
    approverId: null,
    decidedAt: null,
    decisionNote: null,
    createdAt: new Date().toISOString(),
    ...input,
  };
  approvalRequests.push(approval);
  return approval;
}

export function decideApproval(id: string, status: 'approved' | 'rejected' | 'withdrawn', approverId: string, decisionNote: string): ApprovalRequest | undefined {
  const approval = findApproval(id);
  if (!approval) return undefined;
  approval.status = status;
  approval.approverId = approverId;
  approval.decidedAt = new Date().toISOString();
  approval.decisionNote = decisionNote;
  return approval;
}
