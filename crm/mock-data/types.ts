/**
 * Shared domain model for the whole prototype (04_SHARED_COMPONENTS_AND_DOMAIN_MODEL.md).
 *
 * Modules reference these types — they must never redefine a customer, user or
 * WhatsApp number locally. Only entities needed by the global shell are given
 * mock records today; the remaining types exist so later modules extend rather
 * than reinvent them.
 */

export type ModuleKey =
  | 'dashboard'
  | 'contacts'
  | 'inbox'
  | 'calling'
  | 'templates'
  | 'campaigns'
  | 'automation'
  | 'catalogue-orders'
  | 'team-access'
  | 'ai-assistance'
  | 'reports'
  | 'settings'
  | 'billing';

/** Coarse role model driving what the shell exposes. Refined per module later. */
export type RoleKey = 'owner' | 'manager' | 'agent';

export interface Branch {
  id: string;
  name: string;
  city: string;
}

export type WhatsAppConnectionStatus = 'connected' | 'degraded' | 'disconnected';
export type WhatsAppQualityRating = 'high' | 'medium' | 'low' | 'unrated';

export interface WhatsAppNumber {
  id: string;
  displayNumber: string;
  displayName: string;
  brand: string;
  branchId: string;
  department: string;
  connectionStatus: WhatsAppConnectionStatus;
  qualityRating: WhatsAppQualityRating;
  messagingLimit: string;
  /** Roles allowed to select this number in the scope bar. */
  permittedRoles: RoleKey[];
}

export interface Workspace {
  id: string;
  name: string;
  legalName: string;
  plan: 'starter' | 'growth' | 'enterprise';
  enabledModules: ModuleKey[];
  branchIds: string[];
  whatsappNumberIds: string[];
}

export type UserAvailability = 'available' | 'busy' | 'away' | 'offline';

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: RoleKey;
  roleLabel: string;
  teamId: string;
  branchId: string;
  permittedWhatsAppNumberIds: string[];
  availability: UserAvailability;
}

export interface Team {
  id: string;
  name: string;
  branchId: string;
}

export type ContactStage = 'new' | 'engaged' | 'qualified' | 'customer' | 'dormant';
export type ConsentState = 'opted-in' | 'opted-out' | 'pending';
export type SalesTier = 'platinum' | 'gold' | 'silver' | 'standard';

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  /** E.164 normalised mobile — the canonical WhatsApp identity key. */
  mobile: string;
  email: string | null;
  city: string;
  ownerId: string;
  stage: ContactStage;
  tags: string[];
  source: string;
  consent: ConsentState;
  salesTier: SalesTier;
  branchId: string;
  primaryWhatsAppNumberId: string;
  createdAt: string;
  lastActivityAt: string;
}

/* ------------------------------------------------------------------------- */
/* Types declared for cross-module coherence. Mock records arrive with their  */
/* owning module's batch — do not populate them speculatively.                */
/* ------------------------------------------------------------------------- */

export type ConversationStatus = 'open' | 'pending' | 'resolved';

export interface Conversation {
  id: string;
  contactId: string;
  whatsappNumberId: string;
  assigneeId: string | null;
  status: ConversationStatus;
  unreadCount: number;
  replyStatus: 'awaiting-customer' | 'awaiting-agent' | 'none';
  responseWindowState: 'open' | 'closing-soon' | 'expired';
  lastMessageAt: string;
}

export interface CallTask {
  id: string;
  contactId: string;
  assigneeId: string | null;
  dueAt: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed';
  outcome: string | null;
  priority: 'low' | 'medium' | 'high';
}

export interface Template {
  id: string;
  name: string;
  category: 'marketing' | 'utility' | 'authentication';
  language: string;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected' | 'paused';
  structure: { header?: string; body: string; footer?: string; buttons?: string[] };
}

/**
 * Company entity kept separate from Contact per prototype default 2.2: a
 * Contact may reference a Company and be flagged its primary contact.
 */
export interface Company {
  id: string;
  name: string;
  city: string;
  segment: string;
  branchId: string;
  primaryContactId: string | null;
}

/** Boolean joiner for adjacent conditions inside a group. */
export type ConditionJoiner = 'and' | 'or';

/** Field-appropriate operators used by the Segment Builder (CON-S06). */
export type ConditionOperator =
  | 'is'
  | 'is-not'
  | 'contains'
  | 'does-not-contain'
  | 'starts-with'
  | 'is-empty'
  | 'has-any-value'
  | 'greater-than'
  | 'less-than'
  | 'in-last-days';

export interface SegmentCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface SegmentConditionGroup {
  id: string;
  /** How conditions combine inside this group. */
  joiner: ConditionJoiner;
  conditions: SegmentCondition[];
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  type: 'dynamic' | 'snapshot';
  scope: { branchId?: string; whatsappNumberId?: string };
  /** Human-readable one-line summaries of the conditions (list/detail views). */
  conditions: string[];
  /** Structured groups joined by `groupJoiner` (builder + live match count). */
  conditionGroups?: SegmentConditionGroup[];
  groupJoiner?: ConditionJoiner;
  count: number;
  ownerId: string;
  updatedAt: string;
  usedByCampaignIds: string[];
}

export type ImportMethod = 'csv' | 'sheets' | 'intelligent' | 'google' | 'mobile' | 'vcf';

/**
 * Zone-based routing config. Contacts are assigned to a geographical zone from
 * their city/state, and each zone maps to one or more team members. City rules
 * take priority over state rules (e.g. Gurugram → Delhi NCR even though Haryana
 * as a state → North).
 */
export interface Zone {
  id: string;
  name: string;
  active: boolean;
  /** State-level rules — matched when no city rule applies. */
  states: string[];
  /** City-level rules — take priority over state rules. */
  cities: string[];
  /** Team members that own contacts in this zone. */
  memberUserIds: string[];
  /** Primary owner when several members share the zone. */
  primaryOwnerId: string | null;
}

export type ImportJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'partial-success'
  | 'failed';

export interface ImportJob {
  id: string;
  method: ImportMethod;
  fileName: string | null;
  status: ImportJobStatus;
  startedByUserId: string;
  branchId: string;
  sourceTag: string;
  duplicatePolicy: 'skip' | 'update' | 'create';
  createdAt: string;
  counts: { added: number; updated: number; skipped: number; rejected: number; total: number };
  /** Contacts imported but left with an unresolved zone/owner (§7/§8). */
  zoneExceptions?: number;
}

export type ActivityKind =
  | 'whatsapp'
  | 'call'
  | 'note'
  | 'stage-change'
  | 'assignment'
  | 'consent'
  | 'order'
  | 'import'
  | 'system';

export interface ActivityItem {
  id: string;
  contactId: string;
  kind: ActivityKind;
  summary: string;
  detail?: string;
  actorId: string | null;
  at: string;
}

export type DuplicateMatchStrength = 'strong' | 'possible';

/** A pair/cluster of contacts flagged as the same customer (CON-S11). */
export interface DuplicateCluster {
  id: string;
  matchStrength: DuplicateMatchStrength;
  matchReason: string;
  contactIds: string[];
  suggestedPrimaryId: string;
}

export interface Campaign {
  id: string;
  name: string;
  whatsappNumberId: string;
  templateId: string;
  segmentIds: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';
  schedule: string | null;
  performance: { sent: number; delivered: number; read: number; replied: number };
}

export interface Automation {
  id: string;
  name: string;
  status: 'draft' | 'live' | 'paused';
  trigger: string;
  stepCount: number;
  ownerId: string;
  scope: { branchId?: string; whatsappNumberId?: string };
}

/* ------------------------------------------------------------------------- */
/* Dashboard domain (DASHBOARD_GENERATION_SPEC.md). Dashboard summarises and  */
/* deep-links into the modules above — these types model only what the       */
/* Dashboard surfaces itself, not full owning-module records.                 */
/* ------------------------------------------------------------------------- */

/** Mirrors design-system `Severity` — mock-data stays independent of the UI layer. */
export type DashboardSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertCategory =
  | 'inbox'
  | 'whatsapp'
  | 'orders'
  | 'payments'
  | 'campaign'
  | 'automation'
  | 'team';

export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

/** DASH-S02/S03 — an attention item surfaced from an owning module. */
export interface DashboardAlert {
  id: string;
  severity: DashboardSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  /** Number shown on the Attention card/row (record count, or 1 for a single affected entity). */
  count: number;
  /** Human label for the affected record/entity (e.g. a number, a campaign). */
  affectedEntity: string;
  branchId?: string;
  whatsappNumberId?: string;
  ownerId?: string;
  detectedAt: string;
  status: AlertStatus;
  /** Critical infrastructure alerts persist even if a dismiss is attempted. */
  dismissible: boolean;
  /** Informational alerts must not offer a false "Resolve" CTA. */
  resolvable: boolean;
  businessImpact: string;
  recommendedAction: string;
  ctaLabel: string;
  ctaTo: string;
}

export type SetupStepStatus = 'complete' | 'incomplete' | 'blocked';

/** DASH-S04 — one row of workspace setup. */
export interface SetupStep {
  id: string;
  label: string;
  status: SetupStepStatus;
  blockedReason?: string;
  to: string;
}

export type WorkloadStatus = 'normal' | 'overloaded' | 'inactive';

/** DASH-S01/§8 Team widget — one user's current operational load. */
export interface TeamWorkloadRow {
  userId: string;
  openCount: number;
  overdueCount: number;
  unassignedOwnedCount: number;
  status: WorkloadStatus;
}

/** DASH-S01 Automation health widget row. */
export interface AutomationHealthRow {
  automationId: string;
  stuckCount: number;
  stuckSinceHours: number;
  integrationOk: boolean;
}

/** DASH-S12/S13 — AI-generated business insight with mandatory evidence. */
export interface AiInsightItem {
  id: string;
  title: string;
  changeStatement: string;
  possibleDrivers: string[];
  affectedArea: string;
  evidence: { label: string; value: string }[];
  recommendation: string;
  actionLabel: string;
  actionTo: string;
  confidence: 'low' | 'medium' | 'high';
}

/** DASH-S11 — one row of workspace activity. */
export interface ActivityFeedItem {
  id: string;
  actorId: string | null;
  entityLabel: string;
  entityTo: string;
  module: ModuleKey;
  summary: string;
  status?: string;
  at: string;
}

/** DASH-S01 Continue Work widget — a draft/pending item the user can resume. */
export interface ContinueWorkItem {
  id: string;
  module: ModuleKey;
  title: string;
  status: string;
  updatedAt: string;
  to: string;
  /** Which acting user this draft belongs to (own-work filtering for agents). */
  ownerId: string;
}

/** DASH-S01 Usage/Plan warning — owner/admin visibility only. */
export interface UsageWarning {
  id: string;
  severity: DashboardSeverity;
  message: string;
  ctaLabel: string;
  ctaTo: string;
}

/** DASH-S01 Orders & Payments widget — commerce is optional per workspace. */
export interface CommerceSnapshot {
  openOrders: number;
  delayedOrders: number;
  lowStockCount: number;
  paymentsCollectedLabel: string;
  paymentsPendingLabel: string;
}

/** DASH-S01 Trends widget — current vs previous period, presentation only. */
export interface TrendSeries {
  id: string;
  label: string;
  unit: string;
  points: number[];
  currentTotal: number;
  previousTotal: number;
}

/** DASH-S01 §7 row 6 — Inbox side of the WhatsApp Health + Inbox widget. */
export interface InboxSnapshot {
  unread: number;
  pendingReply: number;
  unassigned: number;
  slaBreach: number;
}

/** DASH-S01 header business snapshot for the selected period. */
export interface BusinessSnapshot {
  newLeads: number;
  newLeadsDelta: number;
  openConversations: number;
  openConversationsDelta: number;
  orders: number;
  ordersDelta: number;
  paymentsCollectedLabel: string;
}
