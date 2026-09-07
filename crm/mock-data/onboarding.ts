import type { RoleKey } from './types';

/**
 * Onboarding / WhatsApp Connection domain (ONBOARDING_GENERATION_SPEC.md §18).
 *
 * Tenant ≠ WABA ≠ Number (CLAUDE.md skill §"Key distinctions"). A tenant owns
 * one or more WABAs; a WABA owns one or more numbers. Numbers are decorated
 * here with onboarding/readiness/billing context rather than redefining the
 * shared `WhatsAppNumber` identity fields in `types.ts` — an already-connected
 * number keeps its shared record and gains an `OnboardingNumberRecord` via
 * `linkedRegistryId`; a number still mid-setup exists only here until it goes
 * live.
 */

export type ConnectionStrategy =
  | 'coexistence'
  | 'migrate_business_app'
  | 'migrate_provider'
  | 'new_number';

export type PayerMode = 'provider_wallet' | 'direct_meta' | 'needs_attention';

export type ReadinessState = 'ready' | 'needs_attention' | 'optional' | 'not_applicable';

export type ReadinessDimension = 'connection' | 'inbox' | 'outbound' | 'billing' | 'history';

export type NumberUsageToday =
  | 'business_app'
  | 'existing_provider'
  | 'regular_whatsapp'
  | 'new_unused'
  | 'not_sure';

export type MetaCapacityState = 'available' | 'limited' | 'at_capacity';

export type NumberPurpose = 'sales' | 'support' | 'both' | 'other';

export type OnboardingStage = 'number' | 'strategy' | 'meta' | 'activate' | 'ready';

export type MetaReturnState = 'completed' | 'cancelled' | 'error' | 'permission_missing';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export type DisconnectIntent = 'fix' | 'pause' | 'stop-crm' | 'deregister' | 'move';

export type NumberLifecycleStatus =
  | 'draft'
  | 'in_setup'
  | 'live'
  | 'paused'
  | 'stopped'
  | 'deregistered';

export type HistoryChoice = 'imported' | 'reference' | 'manual' | 'skipped' | null;

/** Onboarding role model — refines the coarse shared `RoleKey` for this module only. */
export type OnboardingRole = 'owner' | 'client_admin' | 'manager' | 'agent' | 'provider_support';

export interface Tenant {
  id: string;
  billingAccountId: string;
  setupStatus: 'not_started' | 'in_progress' | 'first_number_ready';
}

export interface Waba {
  id: string;
  tenantId: string;
  payerMode: PayerMode;
  currency: string;
  creditAllocationId: string | null;
  status: 'active' | 'pending' | 'restricted';
}

export interface ReadinessIssue {
  dimension: ReadinessDimension;
  reason: string;
  fixLabel: string;
  fixTo: string;
  who: 'you' | 'previous_provider' | 'support' | 'meta';
}

export interface ReadinessSummary {
  connection: ReadinessState;
  inbox: ReadinessState;
  outbound: ReadinessState;
  billing: ReadinessState;
  history: ReadinessState;
  issues: ReadinessIssue[];
}

export type ConnectionStepStatus = 'complete' | 'in_progress' | 'warning' | 'failed' | 'pending';

export interface ConnectionProgressStep {
  id: string;
  label: string;
  status: ConnectionStepStatus;
  critical: boolean;
  technical: string;
}

export interface OnboardingNumberRecord {
  id: string;
  tenantId: string;
  wabaId: string | null;
  phone: string;
  displayName: string;
  purpose: NumberPurpose;
  usageToday: NumberUsageToday;
  strategy: ConnectionStrategy | null;
  branchId: string | null;
  teamId: string | null;
  managerUserId: string | null;
  metaCapacityState: MetaCapacityState;
  historyChoice: HistoryChoice;
  historyStart: string | null;
  billingContext: { payerMode: PayerMode; planId: string };
  connectionProgress: ConnectionProgressStep[];
  metaReturnState: MetaReturnState | null;
  linkedRegistryId: string | null;
  status: NumberLifecycleStatus;
  createdAt: string;
  /** Retained after stop/deregister so history and audit survive the action. */
  disconnectIntent: DisconnectIntent | null;
}

export interface Plan {
  id: string;
  name: string;
  billingCycle: 'monthly' | 'annual';
  includedUsers: number;
  includedNumbers: number;
  additionalNumberPolicy: string;
  subtotal: number;
  taxes: number;
  total: number;
  currency: string;
}

export interface Subscription {
  planId: string;
  status: 'trialing' | 'active' | 'past_due';
  cycle: 'monthly' | 'annual';
  renewalDate: string;
}

export interface NumberAddOn {
  id: string;
  quantity: number;
  status: 'active' | 'pending' | 'cancelled';
}

export interface MessagingWallet {
  tenantId: string;
  paidBalance: number;
  promoBalance: number;
  currency: string;
  autoTopupConfig: { enabled: boolean; threshold: number; amount: number };
  lowBalanceThreshold: number;
}

export type WalletTransactionType =
  | 'TOP_UP'
  | 'PROMO_CREDIT'
  | 'META_USAGE'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'AUTO_TOPUP';

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  numberId?: string;
  reference: string;
  timestamp: string;
}

export interface Payment {
  id: string;
  status: PaymentStatus;
  idempotencyKey: string;
  gatewayReference: string;
  amount: number;
  numberId: string;
  createdAt: string;
}

export interface OnboardingSession {
  tenantId: string;
  numberId: string | null;
  stage: OnboardingStage;
  step: string;
  completedSteps: string[];
  blocker: string | null;
  selectedStrategy: ConnectionStrategy | null;
  providerReturnState: MetaReturnState | null;
}

/* ------------------------------------------------------------------------- */
/* Deterministic fixtures                                                     */
/* ------------------------------------------------------------------------- */

export const tenant: Tenant = {
  id: 'tenant_northline',
  billingAccountId: 'billing_northline',
  setupStatus: 'first_number_ready',
};

export const wabas: Waba[] = [
  {
    id: 'waba_northline_primary',
    tenantId: tenant.id,
    payerMode: 'provider_wallet',
    currency: 'INR',
    creditAllocationId: 'credit_001',
    status: 'active',
  },
  {
    id: 'waba_northline_service',
    tenantId: tenant.id,
    payerMode: 'direct_meta',
    currency: 'INR',
    creditAllocationId: null,
    status: 'restricted',
  },
];

export const plans: Plan[] = [
  {
    id: 'plan_growth',
    name: 'Growth',
    billingCycle: 'monthly',
    includedUsers: 10,
    includedNumbers: 3,
    additionalNumberPolicy: '₹999 / month per additional WhatsApp number',
    subtotal: 4999,
    taxes: 899.82,
    total: 5898.82,
    currency: 'INR',
  },
  {
    id: 'plan_starter',
    name: 'Starter',
    billingCycle: 'monthly',
    includedUsers: 3,
    includedNumbers: 1,
    additionalNumberPolicy: '₹1,299 / month per additional WhatsApp number',
    subtotal: 1999,
    taxes: 359.82,
    total: 2358.82,
    currency: 'INR',
  },
];

export const subscription: Subscription = {
  planId: 'plan_growth',
  status: 'active',
  cycle: 'monthly',
  renewalDate: '2026-09-01',
};

export const numberAddOns: NumberAddOn[] = [{ id: 'addon_northline_1', quantity: 1, status: 'active' }];

export const messagingWallet: MessagingWallet = {
  tenantId: tenant.id,
  paidBalance: 1250.5,
  promoBalance: 300,
  currency: 'INR',
  autoTopupConfig: { enabled: false, threshold: 200, amount: 1000 },
  lowBalanceThreshold: 300,
};

export const walletTransactions: WalletTransaction[] = [
  { id: 'wtx_1', type: 'TOP_UP', amount: 2000, reference: 'Manual top-up — UPI', timestamp: '2026-07-20T09:12:00+05:30' },
  { id: 'wtx_2', type: 'PROMO_CREDIT', amount: 500, reference: 'Welcome credit', timestamp: '2026-07-01T10:00:00+05:30' },
  { id: 'wtx_3', type: 'META_USAGE', amount: -412.5, numberId: 'wa_delhi_sales', reference: 'Meta conversation charges — Jul 21–27', timestamp: '2026-07-27T23:59:00+05:30' },
  { id: 'wtx_4', type: 'META_USAGE', amount: -337, numberId: 'wa_delhi_support', reference: 'Meta conversation charges — Jul 21–27', timestamp: '2026-07-27T23:59:00+05:30' },
  { id: 'wtx_5', type: 'PROMO_CREDIT', amount: -200, reference: 'Promo balance consumed first (FIFO)', timestamp: '2026-07-27T23:59:00+05:30' },
];

export const payments: Payment[] = [
  { id: 'pay_1', status: 'success', idempotencyKey: 'idem_pay_1', gatewayReference: 'gw_ref_88213', amount: 5898.82, numberId: 'wa_delhi_sales', createdAt: '2025-03-01T11:00:00+05:30' },
  { id: 'pay_2', status: 'failed', idempotencyKey: 'idem_pay_2', gatewayReference: 'gw_ref_90441', amount: 999, numberId: 'wa_chennai_migrate', createdAt: '2026-08-09T16:20:00+05:30' },
];

/** Business & Number → Readiness questionnaire outcomes surfaced per number. */
export function connectionProgressFor(scenario: 'complete' | 'webhook_issue' | 'not_started'): ConnectionProgressStep[] {
  const steps: { id: string; label: string; critical: boolean; technical: string }[] = [
    { id: 'account', label: 'Account connected', critical: true, technical: 'System user token issued; business_management scope granted.' },
    { id: 'number', label: 'Number registered', critical: true, technical: 'Cloud API phone number registered; two-step PIN set.' },
    { id: 'messages', label: 'Messages connected', critical: true, technical: 'Cloud API messaging endpoint verified with a test send.' },
    { id: 'webhooks', label: 'Receiving updates connected', critical: true, technical: 'Webhook subscription confirmed for messages and status callbacks.' },
    { id: 'profile', label: 'Business information synced', critical: false, technical: 'Business profile (about, category, logo) pulled from Meta.' },
    { id: 'templates', label: 'Templates checked', critical: false, technical: 'Existing approved templates imported for reuse.' },
    { id: 'test', label: 'Connection test', critical: true, technical: 'End-to-end test message delivered and read receipt received.' },
  ];

  if (scenario === 'complete') {
    return steps.map((step) => ({ ...step, status: 'complete' as const }));
  }
  if (scenario === 'webhook_issue') {
    return steps.map((step) => {
      if (step.id === 'account' || step.id === 'number' || step.id === 'messages') {
        return { ...step, status: 'complete' as const };
      }
      if (step.id === 'webhooks') {
        return { ...step, status: 'failed' as const };
      }
      return { ...step, status: 'pending' as const };
    });
  }
  return steps.map((step) => ({ ...step, status: 'pending' as const }));
}

export const onboardingNumbers: OnboardingNumberRecord[] = [
  {
    id: 'wa_delhi_sales',
    tenantId: tenant.id,
    wabaId: 'waba_northline_primary',
    phone: '+91 98110 20001',
    displayName: 'Northline Sales — Delhi',
    purpose: 'sales',
    usageToday: 'business_app',
    strategy: 'coexistence',
    branchId: 'branch_delhi',
    teamId: 'team_delhi_sales',
    managerUserId: 'user_vikram',
    metaCapacityState: 'available',
    historyChoice: 'imported',
    historyStart: '2025-03-01',
    billingContext: { payerMode: 'provider_wallet', planId: 'plan_growth' },
    connectionProgress: connectionProgressFor('complete'),
    metaReturnState: 'completed',
    linkedRegistryId: 'wa_delhi_sales',
    status: 'live',
    createdAt: '2025-03-01T10:30:00+05:30',
    disconnectIntent: null,
  },
  {
    id: 'wa_delhi_support',
    tenantId: tenant.id,
    wabaId: 'waba_northline_primary',
    phone: '+91 98110 20002',
    displayName: 'Northline Support — Delhi',
    purpose: 'support',
    usageToday: 'business_app',
    strategy: 'coexistence',
    branchId: 'branch_delhi',
    teamId: 'team_delhi_support',
    managerUserId: 'user_vikram',
    metaCapacityState: 'available',
    historyChoice: 'reference',
    historyStart: '2025-03-01',
    billingContext: { payerMode: 'provider_wallet', planId: 'plan_growth' },
    connectionProgress: connectionProgressFor('complete'),
    metaReturnState: 'completed',
    linkedRegistryId: 'wa_delhi_support',
    status: 'live',
    createdAt: '2025-03-02T09:00:00+05:30',
    disconnectIntent: null,
  },
  {
    id: 'wa_mumbai_sales',
    tenantId: tenant.id,
    wabaId: 'waba_northline_primary',
    phone: '+91 98200 30011',
    displayName: 'Northline Sales — Mumbai',
    purpose: 'sales',
    usageToday: 'existing_provider',
    strategy: 'migrate_provider',
    branchId: 'branch_mumbai',
    teamId: 'team_mumbai_sales',
    managerUserId: 'user_vikram',
    metaCapacityState: 'limited',
    historyChoice: 'manual',
    historyStart: '2025-05-14',
    billingContext: { payerMode: 'provider_wallet', planId: 'plan_growth' },
    connectionProgress: connectionProgressFor('complete'),
    metaReturnState: 'completed',
    linkedRegistryId: 'wa_mumbai_sales',
    status: 'live',
    createdAt: '2025-05-14T14:00:00+05:30',
    disconnectIntent: null,
  },
  {
    id: 'wa_bengaluru_service',
    tenantId: tenant.id,
    wabaId: 'waba_northline_service',
    phone: '+91 96860 40021',
    displayName: 'Northline Service — Bengaluru',
    purpose: 'support',
    usageToday: 'business_app',
    strategy: 'migrate_business_app',
    branchId: 'branch_bengaluru',
    teamId: null,
    managerUserId: 'user_anita',
    metaCapacityState: 'at_capacity',
    historyChoice: 'skipped',
    historyStart: null,
    billingContext: { payerMode: 'direct_meta', planId: 'plan_growth' },
    connectionProgress: connectionProgressFor('webhook_issue'),
    metaReturnState: 'error',
    linkedRegistryId: 'wa_bengaluru_service',
    status: 'paused',
    createdAt: '2025-11-02T12:00:00+05:30',
    disconnectIntent: 'pause',
  },
  {
    id: 'wa_jaipur_pending',
    tenantId: tenant.id,
    wabaId: 'waba_northline_primary',
    phone: '+91 98290 55011',
    displayName: 'Northline Sales — Jaipur',
    purpose: 'sales',
    usageToday: 'existing_provider',
    strategy: 'migrate_provider',
    branchId: 'branch_delhi',
    teamId: null,
    managerUserId: null,
    metaCapacityState: 'available',
    historyChoice: null,
    historyStart: null,
    billingContext: { payerMode: 'provider_wallet', planId: 'plan_growth' },
    connectionProgress: connectionProgressFor('webhook_issue'),
    metaReturnState: 'completed',
    linkedRegistryId: null,
    status: 'in_setup',
    createdAt: '2026-08-05T11:00:00+05:30',
    disconnectIntent: null,
  },
  {
    id: 'wa_pune_new',
    tenantId: tenant.id,
    wabaId: null,
    phone: '',
    displayName: 'Northline — Pune (new number)',
    purpose: 'sales',
    usageToday: 'not_sure',
    strategy: null,
    branchId: 'branch_mumbai',
    teamId: null,
    managerUserId: null,
    metaCapacityState: 'available',
    historyChoice: null,
    historyStart: null,
    billingContext: { payerMode: 'needs_attention', planId: 'plan_growth' },
    connectionProgress: connectionProgressFor('not_started'),
    metaReturnState: null,
    linkedRegistryId: null,
    status: 'draft',
    createdAt: '2026-08-10T15:00:00+05:30',
    disconnectIntent: null,
  },
  {
    id: 'wa_chennai_migrate',
    tenantId: tenant.id,
    wabaId: 'waba_northline_primary',
    phone: '+91 90030 66021',
    displayName: 'Northline Sales — Chennai',
    purpose: 'sales',
    usageToday: 'existing_provider',
    strategy: 'migrate_provider',
    branchId: 'branch_delhi',
    teamId: 'team_delhi_sales',
    managerUserId: 'user_vikram',
    metaCapacityState: 'available',
    historyChoice: null,
    historyStart: null,
    billingContext: { payerMode: 'provider_wallet', planId: 'plan_growth' },
    connectionProgress: connectionProgressFor('complete'),
    metaReturnState: 'completed',
    linkedRegistryId: null,
    status: 'in_setup',
    createdAt: '2026-08-08T09:30:00+05:30',
    disconnectIntent: null,
  },
  {
    id: 'wa_kolkata_ready',
    tenantId: tenant.id,
    wabaId: 'waba_northline_primary',
    phone: '+91 98300 77031',
    displayName: 'Northline Sales — Kolkata',
    purpose: 'sales',
    usageToday: 'new_unused',
    strategy: 'new_number',
    branchId: 'branch_delhi',
    teamId: 'team_delhi_sales',
    managerUserId: 'user_vikram',
    metaCapacityState: 'available',
    historyChoice: null,
    historyStart: null,
    billingContext: { payerMode: 'provider_wallet', planId: 'plan_growth' },
    connectionProgress: connectionProgressFor('complete'),
    metaReturnState: 'completed',
    linkedRegistryId: null,
    status: 'in_setup',
    createdAt: '2026-08-09T10:00:00+05:30',
    disconnectIntent: null,
  },
  {
    id: 'wa_hyderabad_stopped',
    tenantId: tenant.id,
    wabaId: 'waba_northline_primary',
    phone: '+91 90000 88041',
    displayName: 'Northline Sales — Hyderabad',
    purpose: 'sales',
    usageToday: 'business_app',
    strategy: 'coexistence',
    branchId: 'branch_bengaluru',
    teamId: null,
    managerUserId: null,
    metaCapacityState: 'available',
    historyChoice: 'imported',
    historyStart: '2025-06-01',
    billingContext: { payerMode: 'provider_wallet', planId: 'plan_growth' },
    connectionProgress: connectionProgressFor('complete'),
    metaReturnState: 'completed',
    linkedRegistryId: null,
    status: 'stopped',
    createdAt: '2025-06-01T08:00:00+05:30',
    disconnectIntent: 'stop-crm',
  },
];

export function findOnboardingNumber(id: string): OnboardingNumberRecord | undefined {
  return onboardingNumbers.find((number) => number.id === id);
}

/** First number that has not gone live yet, in creation order — Setup Home resume target. */
export function firstIncompleteNumber(): OnboardingNumberRecord | undefined {
  return [...onboardingNumbers]
    .filter((number) => number.status === 'draft' || number.status === 'in_setup')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
}

/* ------------------------------------------------------------------------- */
/* Sessions — deterministic Setup Home / resume fixtures                      */
/* ------------------------------------------------------------------------- */

export const onboardingSessions: Record<string, OnboardingSession> = {
  wa_pune_new: {
    tenantId: tenant.id,
    numberId: 'wa_pune_new',
    stage: 'number',
    step: 'basics',
    completedSteps: [],
    blocker: null,
    selectedStrategy: null,
    providerReturnState: null,
  },
  wa_jaipur_pending: {
    tenantId: tenant.id,
    numberId: 'wa_jaipur_pending',
    stage: 'meta',
    step: 'progress',
    completedSteps: ['basics', 'readiness', 'strategy', 'preflight', 'external', 'return', 'review'],
    blocker: 'webhook_setup_issue',
    selectedStrategy: 'migrate_provider',
    providerReturnState: 'completed',
  },
  wa_chennai_migrate: {
    tenantId: tenant.id,
    numberId: 'wa_chennai_migrate',
    stage: 'activate',
    step: 'payment',
    completedSteps: ['basics', 'readiness', 'strategy', 'preflight', 'external', 'return', 'review', 'progress', 'plan'],
    blocker: 'payment_failed',
    selectedStrategy: 'migrate_provider',
    providerReturnState: 'completed',
  },
  wa_kolkata_ready: {
    tenantId: tenant.id,
    numberId: 'wa_kolkata_ready',
    stage: 'ready',
    step: 'summary',
    completedSteps: ['basics', 'readiness', 'strategy', 'preflight', 'external', 'return', 'review', 'progress', 'plan', 'payment', 'team'],
    blocker: null,
    selectedStrategy: 'new_number',
    providerReturnState: 'completed',
  },
};

/* ------------------------------------------------------------------------- */
/* Resolvers                                                                  */
/* ------------------------------------------------------------------------- */

export interface ReadinessInputs {
  connectionCriticalDone: boolean;
  connectionHasWarning: boolean;
  inboxTeamAssigned: boolean;
  billingPlanActive: boolean;
  billingPaymentStatus: PaymentStatus | null;
  billingPayerMode: PayerMode;
  walletBalance: number;
  historyChoice: HistoryChoice;
}

/**
 * The one place readiness across the five dimensions is computed
 * (CODE_FIRST_ADAPTER.md §4) — screens read this instead of deriving their own
 * ready/needs-attention logic.
 */
export function resolveReadiness(inputs: ReadinessInputs): ReadinessSummary {
  const connection: ReadinessState = inputs.connectionCriticalDone ? 'ready' : 'needs_attention';
  const inbox: ReadinessState = !inputs.connectionCriticalDone
    ? 'not_applicable'
    : inputs.inboxTeamAssigned
      ? 'ready'
      : 'needs_attention';
  const billing: ReadinessState =
    inputs.billingPlanActive && inputs.billingPaymentStatus !== 'failed' ? 'ready' : 'needs_attention';
  const outbound: ReadinessState = !inputs.connectionCriticalDone
    ? 'not_applicable'
    : inputs.billingPayerMode === 'direct_meta'
      ? 'ready'
      : billing === 'ready' && inputs.walletBalance > 0
        ? 'ready'
        : 'needs_attention';
  const history: ReadinessState =
    inputs.historyChoice && inputs.historyChoice !== 'skipped' ? 'ready' : 'optional';

  const issues: ReadinessIssue[] = [];
  if (connection === 'needs_attention') {
    issues.push({
      dimension: 'connection',
      reason: 'Meta connection has an unresolved technical issue.',
      fixLabel: 'Resume connection',
      fixTo: '/setup/connect?stage=meta&step=progress',
      who: 'support',
    });
  }
  if (inbox === 'needs_attention') {
    issues.push({
      dimension: 'inbox',
      reason: 'No one has been assigned to handle this number yet.',
      fixLabel: 'Assign team',
      fixTo: '/setup/connect?stage=activate&step=team',
      who: 'you',
    });
  }
  if (billing === 'needs_attention') {
    issues.push({
      dimension: 'billing',
      reason:
        inputs.billingPaymentStatus === 'failed'
          ? 'The last plan payment failed.'
          : 'Plan activation has not completed yet.',
      fixLabel: 'Review billing',
      fixTo: '/setup/connect?stage=activate&step=payment',
      who: 'you',
    });
  }
  if (outbound === 'needs_attention') {
    issues.push({
      dimension: 'outbound',
      reason: inputs.walletBalance <= 0 ? 'Messaging balance is empty.' : 'Outbound messaging is not funded yet.',
      fixLabel: 'Add messaging balance',
      fixTo: '/billing?tab=messaging-balance',
      who: 'you',
    });
  }

  return { connection, inbox, outbound, billing, history, issues };
}

/** Builds the readiness summary directly from a fixture number's current state. */
export function readinessForNumber(number: OnboardingNumberRecord): ReadinessSummary {
  const connectionCriticalDone = number.connectionProgress
    .filter((step) => step.critical)
    .every((step) => step.status === 'complete');
  const connectionHasWarning = number.connectionProgress.some((step) => step.status === 'warning');
  const payment = payments.find((p) => p.numberId === number.id);
  const billingPlanActive = number.status === 'live' || number.status === 'in_setup' ? true : false;

  return resolveReadiness({
    connectionCriticalDone,
    connectionHasWarning,
    inboxTeamAssigned: Boolean(number.teamId && number.managerUserId),
    billingPlanActive: number.status === 'draft' ? false : billingPlanActive,
    billingPaymentStatus: payment ? payment.status : number.status === 'live' ? 'success' : null,
    billingPayerMode: number.billingContext.payerMode,
    walletBalance: messagingWallet.paidBalance + messagingWallet.promoBalance,
    historyChoice: number.historyChoice,
  });
}

export interface CapacityInputs {
  connectedCount: number;
  planIncludedNumbers: number;
  numberAddOnEntitlement: number;
  currentMetaNumberCapacity: number;
}

export interface CapacityResult {
  canAdd: boolean;
  commercialBlocker: boolean;
  metaBlocker: boolean;
  explanation: string;
}

/** The one place plan-vs-Meta-capacity is compared (CODE_FIRST_ADAPTER.md §5). */
export function resolveCapacity(inputs: CapacityInputs): CapacityResult {
  const commercialBlocker = inputs.connectedCount >= inputs.planIncludedNumbers + inputs.numberAddOnEntitlement;
  const metaBlocker = inputs.connectedCount >= inputs.currentMetaNumberCapacity;
  const canAdd = !commercialBlocker && !metaBlocker;

  let explanation = 'Your plan and Meta both have room for another WhatsApp number.';
  if (commercialBlocker && metaBlocker) {
    explanation =
      'Your CRM plan allowance and Meta phone-number capacity are both full. Upgrade your plan and request more Meta capacity to add another number.';
  } else if (commercialBlocker) {
    explanation = 'Your CRM plan does not include another number yet. Add a number add-on or upgrade your plan.';
  } else if (metaBlocker) {
    explanation =
      'Meta has not allocated more phone-number capacity to this account yet. This is independent of your CRM plan and is resolved with Meta or your BSP.';
  }
  return { canAdd, commercialBlocker, metaBlocker, explanation };
}

export function currentCapacity(): CapacityResult {
  const plan = plans.find((p) => p.id === subscription.planId) ?? plans[0];
  const addOnQty = numberAddOns
    .filter((addOn) => addOn.status === 'active')
    .reduce((sum, addOn) => sum + addOn.quantity, 0);
  const connectedCount = onboardingNumbers.filter((n) => n.status === 'live' || n.status === 'paused').length;
  return resolveCapacity({
    connectedCount,
    planIncludedNumbers: plan.includedNumbers,
    numberAddOnEntitlement: addOnQty,
    currentMetaNumberCapacity: 5,
  });
}

/* ------------------------------------------------------------------------- */
/* Onboarding role model                                                      */
/* ------------------------------------------------------------------------- */

export const onboardingRoleLabels: Record<OnboardingRole, string> = {
  owner: 'Owner / Super Admin',
  client_admin: 'Client Admin',
  manager: 'Manager / Lead',
  agent: 'Agent',
  provider_support: 'Provider Support',
};

/** Maps the shell's coarse `RoleKey` to the richer onboarding role for the prototype. */
export function onboardingRoleFor(role: RoleKey): OnboardingRole {
  if (role === 'owner') return 'owner';
  if (role === 'manager') return 'manager';
  return 'agent';
}

/* ------------------------------------------------------------------------- */
/* Provider Admin — separate support/appendix shell (SKILL.md "Provider       */
/* Admin"). Deterministic technical fixtures only; never customer            */
/* conversation/business data (least privilege).                             */
/* ------------------------------------------------------------------------- */

export type ProviderOnboardingStage = 'not_started' | 'in_progress' | 'blocked' | 'live';

export interface ProviderClientSummary {
  tenantId: string;
  businessName: string;
  planName: string;
  onboardingStage: ProviderOnboardingStage;
  numbersConnected: number;
  numbersInSetup: number;
  payerMode: PayerMode;
  paymentStatus: PaymentStatus | 'not_applicable';
  walletBalance: number | null;
  lastActivity: string;
  blocker: string | null;
  technicalNotes: string;
}

export const providerClients: ProviderClientSummary[] = [
  {
    tenantId: 'tenant_northline',
    businessName: 'Northline Retail',
    planName: 'Growth',
    onboardingStage: 'in_progress',
    numbersConnected: 4,
    numbersInSetup: 3,
    payerMode: 'provider_wallet',
    paymentStatus: 'failed',
    walletBalance: 1550.5,
    lastActivity: '2026-08-10T15:00:00+05:30',
    blocker: 'webhook_setup_issue',
    technicalNotes: 'Webhook subscription for the Jaipur number failed to confirm — retry recommended.',
  },
  {
    tenantId: 'tenant_kavya',
    businessName: 'Kavya Interiors',
    planName: 'Starter',
    onboardingStage: 'live',
    numbersConnected: 1,
    numbersInSetup: 0,
    payerMode: 'direct_meta',
    paymentStatus: 'success',
    walletBalance: null,
    lastActivity: '2026-08-09T11:20:00+05:30',
    blocker: null,
    technicalNotes: 'No open issues.',
  },
  {
    tenantId: 'tenant_urbanfit',
    businessName: 'UrbanFit Gym',
    planName: 'Growth',
    onboardingStage: 'blocked',
    numbersConnected: 0,
    numbersInSetup: 1,
    payerMode: 'provider_wallet',
    paymentStatus: 'failed',
    walletBalance: 0,
    lastActivity: '2026-08-08T09:00:00+05:30',
    blocker: 'payment_failed',
    technicalNotes: 'Plan payment failed twice — card expired. Client notified by email.',
  },
  {
    tenantId: 'tenant_greenleaf',
    businessName: 'GreenLeaf Organics',
    planName: 'Starter',
    onboardingStage: 'not_started',
    numbersConnected: 0,
    numbersInSetup: 0,
    payerMode: 'needs_attention',
    paymentStatus: 'not_applicable',
    walletBalance: null,
    lastActivity: '2026-07-30T10:00:00+05:30',
    blocker: null,
    technicalNotes: 'Signed up but has not started Guided Setup yet.',
  },
];

export function findProviderClient(tenantId: string): ProviderClientSummary | undefined {
  return providerClients.find((client) => client.tenantId === tenantId);
}

export type PlatformMetricStatus = 'operational' | 'degraded' | 'down';

export interface PlatformReadinessMetric {
  id: string;
  label: string;
  status: PlatformMetricStatus;
  detail: string;
}

export const platformReadiness: PlatformReadinessMetric[] = [
  { id: 'graph_api', label: 'Meta Graph API', status: 'operational', detail: 'All calls within normal latency over the last 24 hours.' },
  { id: 'webhooks', label: 'Webhook delivery', status: 'degraded', detail: '2 client webhook subscriptions failed to confirm in the last 24 hours.' },
  { id: 'templates', label: 'Template review queue', status: 'operational', detail: 'Average Meta review time 3.2 hours.' },
  { id: 'capacity', label: 'Shared number capacity pool', status: 'operational', detail: 'Meta phone-number capacity pool at 62% utilisation across clients.' },
  { id: 'embedded_signup', label: 'Embedded Signup availability', status: 'operational', detail: 'No reported failures for new client sign-ups today.' },
];
