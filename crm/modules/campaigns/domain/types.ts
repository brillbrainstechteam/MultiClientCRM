/**
 * Campaigns domain model (CODE_FIRST_ADAPTER.md "Campaign domain model").
 *
 * Kept module-local — considerably richer than the cross-module `Campaign`
 * stub `mock-data/types.ts` exposes to Dashboard's summary widget. This file
 * is the source of truth for everything Campaigns itself renders.
 */

export type CampaignStatus = 'draft' | 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled';

export type CampaignType = 'one-time' | 'follow-up' | 'recurring' | 'trigger' | 'api';

/** `partial` = live and progressing with some failures; `interrupted` = processing stopped unexpectedly. */
export type ProcessingHealth = 'normal' | 'partial' | 'interrupted';

export type AudienceSourceKind = 'segment' | 'filter' | 'contacts' | 'upload' | 'result-audience';

export interface AudienceSourceRef {
  id: string;
  kind: AudienceSourceKind;
  label: string;
  count: number;
  /** Set when kind is `result-audience` (retarget/follow-up lineage). */
  sourceCampaignId?: string;
  resultType?: RecipientStatus;
}

export type AudienceExclusionKind = 'segment' | 'filter' | 'contacts' | 'previous-recipients';

export interface AudienceExclusionRef {
  id: string;
  kind: AudienceExclusionKind;
  label: string;
  count: number;
}

/**
 * Authoritative audience waterfall (CLAUDE.md §Audience calculation rule /
 * CODE_FIRST_ADAPTER.md §5). Every stage is tracked separately — never a
 * single opaque `excluded` figure.
 */
export interface AudienceBreakdown {
  includedRaw: number;
  duplicatesRemoved: number;
  manualExclusions: number;
  consentIneligible: number;
  invalidContactData: number;
  /** Provisional until CAM-S06 finalises variable mappings. */
  invalidPersonalisation: number;
  finalEligible: number;
}

export type PersonalisationSourceType =
  | 'contact-field'
  | 'custom-field'
  | 'tag'
  | 'lead-stage'
  | 'city'
  | 'company'
  | 'customer-attribute'
  | 'fixed-value'
  | 'dynamic-link'
  | 'media'
  | 'document';

export interface VariableMapping {
  variableIndex: number;
  placeholder: string;
  description: string;
  sourceType: PersonalisationSourceType;
  sourceField?: string;
  fixedValue?: string;
  fallbackValue: string;
  missingCount: number;
  invalidFormatCount: number;
}

export type RecipientStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'replied'
  | 'failed'
  | 'excluded';

export type RecipientFailureCategory = 'permanent' | 'retryable';

export interface RecipientRecord {
  id: string;
  contactId: string;
  name: string;
  mobile: string;
  status: RecipientStatus;
  failureReason?: string;
  failureCategory?: RecipientFailureCategory;
  excludedReason?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  repliedAt?: string;
}

export interface CampaignAnalytics {
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  clicksAvailable: boolean;
  clicks: number | null;
  conversionsAvailable: boolean;
  conversions: number | null;
  costPerResultAvailable: boolean;
  costPerResult: number | null;
  currency: string;
  unavailableNote?: string;
}

export interface CampaignSpend {
  estimateAvailable: boolean;
  estimatedCost: number | null;
  actualAvailable: boolean;
  actualSpend: number | null;
  currency: string;
  note?: string;
}

export interface CampaignAuditEvent {
  id: string;
  at: string;
  actorId: string | null;
  action: string;
  detail?: string;
}

export interface CampaignProgress {
  totalEligible: number;
  processed: number;
  remaining: number;
  sent: number;
  deliveredAvailable: boolean;
  delivered: number | null;
  failed: number;
  health: ProcessingHealth;
  interruptedReason?: string;
  interruptedDetail?: string;
  nextAction?: string;
  lastUpdateAt?: string;
}

export type BuilderStepId = 'setup' | 'template' | 'audience' | 'personalisation' | 'review';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  isArchived: boolean;

  creatorId: string;
  branchId: string;
  createdAt: string;
  updatedAt: string;

  /** Sender scope — a WhatsApp phone number (`mock-data` `WhatsAppNumber.id`), not a WABA. */
  whatsappNumberId: string | null;
  templateId: string | null;
  templateLocale: string | null;

  includedSources: AudienceSourceRef[];
  excludedSources: AudienceExclusionRef[];
  audience: AudienceBreakdown;
  /** Present once a schedule/send has captured a candidate snapshot. */
  audienceSnapshotAt?: string;

  variableMappings: VariableMapping[];

  scheduledAt: string | null;
  timezone: string | null;

  progress: CampaignProgress | null;
  recipients: RecipientRecord[];
  analytics: CampaignAnalytics | null;
  spend: CampaignSpend;

  auditEvents: CampaignAuditEvent[];

  /** Follow-up/retarget/duplicate lineage. */
  sourceCampaignId?: string;
  sourceResultType?: RecipientStatus;

  /** Draft builder bookkeeping — where a resumed draft should reopen. */
  draftLastStep?: BuilderStepId;

  cancelledReason?: string;
  cancelledAt?: string;

  conversionTrackingConfigured: boolean;
}

/** Derived list-view helper — a Completed campaign can stay Completed while archived. */
export function isVisibleInOperationalViews(campaign: Campaign): boolean {
  return !campaign.isArchived;
}
