import type { PlanKey } from '@crm/app/app-session';

/**
 * Single source of truth for TalkTrack pricing. Kept deliberately flexible —
 * prices, inclusions and message rates are placeholders until real platform
 * costs are known, so change them here and every billing surface updates.
 */

export interface PlanTier {
  key: PlanKey;
  name: string;
  /** Monthly price in ₹ (0 for the trial). */
  priceMonthly: number;
  tagline: string;
  features: string[];
  /** Visually highlighted as the recommended plan. */
  recommended?: boolean;
}

export const planTiers: PlanTier[] = [
  {
    key: 'trial',
    name: 'Free trial',
    priceMonthly: 0,
    tagline: '14 days, all features',
    features: ['Every feature unlocked', '1 WhatsApp number', 'Up to 3 team members', 'No credit card required'],
  },
  {
    key: 'starter',
    name: 'Starter',
    priceMonthly: 999,
    tagline: 'For a single number and small team',
    features: ['1 WhatsApp number', 'Up to 3 agents', '1,000 free conversations / mo', 'Shared inbox & templates'],
  },
  {
    key: 'growth',
    name: 'Growth',
    priceMonthly: 2499,
    tagline: 'For growing teams running campaigns',
    features: ['Multiple WhatsApp numbers', 'Up to 10 agents', 'Campaigns & automations', 'Catalogue & orders'],
    recommended: true,
  },
  {
    key: 'advanced',
    name: 'Advanced',
    priceMonthly: 3499,
    tagline: 'For scale, API and priority support',
    features: ['Everything in Growth', 'Advanced automations', 'API access & webhooks', 'Priority support'],
  },
];

export function findPlanTier(key: PlanKey): PlanTier {
  return planTiers.find((tier) => tier.key === key) ?? planTiers[0];
}

/** Meta per-message rates in ₹ (indicative; per template delivered, Jul-2025 model). */
export const messageRates = {
  marketing: 0.88,
  utility: 0.16,
  authentication: 0.13,
} as const;

export const messageRateLabels: Record<keyof typeof messageRates, string> = {
  marketing: 'Marketing',
  utility: 'Utility',
  authentication: 'Authentication',
};

export interface WalletTransaction {
  id: string;
  at: string;
  label: string;
  amount: number; // +recharge, -spend
}

export const walletTransactions: WalletTransaction[] = [
  { id: 'wtx_1', at: '2026-08-09T10:20:00+05:30', label: 'Wallet recharge', amount: 2000 },
  { id: 'wtx_2', at: '2026-08-09T13:05:00+05:30', label: 'Festive Launch — marketing (742 msgs)', amount: -653 },
  { id: 'wtx_3', at: '2026-08-10T08:40:00+05:30', label: 'Payment Reminder — utility (318 msgs)', amount: -51 },
  { id: 'wtx_4', at: '2026-08-10T09:10:00+05:30', label: 'Login OTPs — authentication (96 msgs)', amount: -12 },
];

export interface UsageCategoryRow {
  category: keyof typeof messageRates;
  sent: number;
  cost: number;
}

/** Message usage this billing cycle by category (drives the Usage tab). */
export const usageThisCycle: { rows: UsageCategoryRow[]; freeConversationsUsed: number; freeConversationsTotal: number } = {
  rows: [
    { category: 'marketing', sent: 742, cost: Math.round(742 * messageRates.marketing) },
    { category: 'utility', sent: 318, cost: Math.round(318 * messageRates.utility) },
    { category: 'authentication', sent: 96, cost: Math.round(96 * messageRates.authentication) },
  ],
  freeConversationsUsed: 188,
  freeConversationsTotal: 1000,
};

export const RECHARGE_OPTIONS = [500, 1000, 2000, 5000];
