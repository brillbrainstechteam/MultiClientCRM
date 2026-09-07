import { branches, whatsappNumbers } from './workspace';
import type { WhatsAppNumber } from './types';

/**
 * Per-branch and per-number operational metrics for the redesigned Dashboard.
 *
 * Base figures are a 7-day window and are chosen so the branch rows sum to the
 * existing workspace aggregates (businessSnapshot.newLeads = 148,
 * inboxSnapshot.pendingReply = 19, overdue = 8, orders/converted = 36). The
 * date filter scales every figure through `periodMultiplier`, so changing the
 * range changes the numbers everywhere without new hardcoded values per range.
 */

export type DateRange = 'today' | '7d' | '30d' | 'this-month';

export interface BranchMetric {
  branchId: string;
  newEnquiries: number;
  pendingReplies: number;
  overdueFollowups: number;
  converted: number;
  unassigned: number;
  /** Same four figures a comparison period earlier, for delta arrows. */
  previous: {
    newEnquiries: number;
    pendingReplies: number;
    overdueFollowups: number;
    converted: number;
  };
}

/** 7-day base metrics per branch. Rows sum to the existing workspace totals. */
export const branchMetrics: BranchMetric[] = [
  {
    branchId: 'branch_delhi',
    newEnquiries: 82,
    pendingReplies: 11,
    overdueFollowups: 5,
    converted: 21,
    unassigned: 8,
    previous: { newEnquiries: 74, pendingReplies: 13, overdueFollowups: 4, converted: 16 },
  },
  {
    branchId: 'branch_mumbai',
    newEnquiries: 44,
    pendingReplies: 6,
    overdueFollowups: 2,
    converted: 11,
    unassigned: 3,
    previous: { newEnquiries: 40, pendingReplies: 7, overdueFollowups: 1, converted: 9 },
  },
  {
    branchId: 'branch_bengaluru',
    newEnquiries: 22,
    pendingReplies: 2,
    overdueFollowups: 1,
    converted: 4,
    unassigned: 1,
    previous: { newEnquiries: 22, pendingReplies: 2, overdueFollowups: 1, converted: 3 },
  },
];

export interface NumberMetric {
  whatsappNumberId: string;
  awaitingReply: number;
  overdueFollowups: number;
}

export const numberMetrics: NumberMetric[] = [
  { whatsappNumberId: 'wa_delhi_sales', awaitingReply: 7, overdueFollowups: 3 },
  { whatsappNumberId: 'wa_delhi_support', awaitingReply: 4, overdueFollowups: 2 },
  { whatsappNumberId: 'wa_mumbai_sales', awaitingReply: 6, overdueFollowups: 2 },
  { whatsappNumberId: 'wa_bengaluru_service', awaitingReply: 2, overdueFollowups: 1 },
];

/** Deterministic personal metrics per user (Executive/agent dashboard). */
export interface PersonalMetric {
  userId: string;
  assignedEnquiries: number;
  pendingReplies: number;
  followupsDue: number;
  overdue: number;
  converted: number;
  previous: { assignedEnquiries: number; pendingReplies: number; overdue: number; converted: number };
}

export const personalMetrics: PersonalMetric[] = [
  {
    userId: 'user_meera',
    assignedEnquiries: 28,
    pendingReplies: 9,
    followupsDue: 6,
    overdue: 3,
    converted: 7,
    previous: { assignedEnquiries: 24, pendingReplies: 11, overdue: 2, converted: 5 },
  },
  {
    userId: 'user_rohan',
    assignedEnquiries: 31,
    pendingReplies: 12,
    followupsDue: 7,
    overdue: 4,
    converted: 6,
    previous: { assignedEnquiries: 27, pendingReplies: 10, overdue: 3, converted: 6 },
  },
];

/** Scaling factor applied to base (7-day) figures for the selected range. */
export function periodMultiplier(range: DateRange): number {
  switch (range) {
    case 'today':
      return 0.16;
    case '30d':
      return 4.3;
    case 'this-month':
      return 4;
    case '7d':
    default:
      return 1;
  }
}

export function findBranchMetric(branchId: string): BranchMetric | undefined {
  return branchMetrics.find((metric) => metric.branchId === branchId);
}

export function findNumberMetric(numberId: string): NumberMetric | undefined {
  return numberMetrics.find((metric) => metric.whatsappNumberId === numberId);
}

export function findPersonalMetric(userId: string): PersonalMetric | undefined {
  return personalMetrics.find((metric) => metric.userId === userId);
}

export function numbersForBranch(branchId: string): WhatsAppNumber[] {
  return whatsappNumbers.filter((number) => number.branchId === branchId);
}

export const dateRangeLabels: Record<DateRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  'this-month': 'This month',
};

export const branchName = (branchId: string): string =>
  branches.find((branch) => branch.id === branchId)?.name ?? branchId;
