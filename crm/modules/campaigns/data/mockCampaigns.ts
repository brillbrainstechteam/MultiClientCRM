import { contacts } from '@crm/mock-data';
import { calculateAudienceBreakdown } from '../domain/audienceCalculation';
import type {
  AudienceExclusionRef,
  AudienceSourceRef,
  Campaign,
  RecipientRecord,
  RecipientStatus,
  VariableMapping,
} from '../domain/types';

/**
 * Deterministic campaign fixtures (BATCHES.md Batch 0 "Representative
 * campaign fixtures"). `camp_festive_launch`, `camp_monsoon_restock` and
 * `camp_new_arrivals` are pre-existing forward references from
 * `mock-data/dashboard.ts` (Dashboard's Campaign Summary widget, alerts, AI
 * insight and Continue Work item) — kept identical here so those links
 * resolve to real, coherent campaigns instead of a 404.
 */

const pool = contacts;

function recipient(
  index: number,
  status: RecipientStatus,
  extra: Partial<RecipientRecord> = {},
): RecipientRecord {
  const contact = pool[index % pool.length];
  return {
    id: `rec_${contact.id}_${index}`,
    contactId: contact.id,
    name: contact.name,
    mobile: contact.mobile,
    status,
    ...extra,
  };
}

function emptyDraftAudience() {
  return calculateAudienceBreakdown({
    includedSources: [],
    excludedSources: [],
    duplicatesRemoved: 0,
    consentIneligible: 0,
    invalidContactData: 0,
    invalidPersonalisation: 0,
  });
}

function standardVariable(overrides: Partial<VariableMapping> = {}): VariableMapping {
  return {
    variableIndex: 1,
    placeholder: '{{1}}',
    description: 'Customer first name',
    sourceType: 'contact-field',
    sourceField: 'name',
    fallbackValue: 'there',
    missingCount: 0,
    invalidFormatCount: 0,
    ...overrides,
  };
}

/* ------------------------------------------------------------------------- */
/* 1. Draft — resumable from Dashboard's Continue Work widget                 */
/* ------------------------------------------------------------------------- */

const draftFestiveRound2Sources: AudienceSourceRef[] = [
  {
    id: 'src_festive_delivered_no_reply',
    kind: 'result-audience',
    label: 'Festive Launch — delivered, no reply',
    count: 1245,
    sourceCampaignId: 'camp_festive_launch',
    resultType: 'delivered',
  },
];

const draftFestiveRound2: Campaign = {
  id: 'cam_draft_festive_r2',
  name: 'Festive Launch — Round 2',
  type: 'follow-up',
  status: 'draft',
  isArchived: false,
  creatorId: 'user_anita',
  branchId: 'branch_delhi',
  createdAt: '2026-08-09T18:10:00+05:30',
  updatedAt: '2026-08-09T18:40:00+05:30',
  whatsappNumberId: 'wa_delhi_sales',
  templateId: 'tmpl_festive_launch',
  templateLocale: 'en_US',
  includedSources: draftFestiveRound2Sources,
  excludedSources: [],
  audience: calculateAudienceBreakdown({
    includedSources: draftFestiveRound2Sources,
    excludedSources: [],
    duplicatesRemoved: 0,
    consentIneligible: 14,
    invalidContactData: 6,
    invalidPersonalisation: 0,
  }),
  variableMappings: [],
  scheduledAt: null,
  timezone: null,
  progress: null,
  recipients: [],
  analytics: null,
  spend: { estimateAvailable: true, estimatedCost: 3082.5, actualAvailable: false, actualSpend: null, currency: 'INR' },
  auditEvents: [
    {
      id: 'evt_draft_r2_created',
      at: '2026-08-09T18:10:00+05:30',
      actorId: 'user_anita',
      action: 'Draft created',
      detail: 'Started as a follow-up from Festive Launch — targeting recipients who received the message but did not reply.',
    },
  ],
  sourceCampaignId: 'camp_festive_launch',
  sourceResultType: 'delivered',
  draftLastStep: 'audience',
  conversionTrackingConfigured: false,
};

/* ------------------------------------------------------------------------- */
/* 1b. Draft — resumed with an invalidated template selection (BATCHES.md    */
/*     Batch 2 "invalidated-template resume state")                          */
/* ------------------------------------------------------------------------- */

const draftTemplateInvalidated: Campaign = {
  id: 'cam_draft_template_invalidated',
  name: 'Welcome Series Refresh',
  type: 'one-time',
  status: 'draft',
  isArchived: false,
  creatorId: 'user_anita',
  branchId: 'branch_delhi',
  createdAt: '2026-07-05T10:00:00+05:30',
  updatedAt: '2026-07-05T10:20:00+05:30',
  whatsappNumberId: 'wa_delhi_sales',
  templateId: 'tmpl_old_welcome_flow_gate',
  templateLocale: 'en_US',
  includedSources: [],
  excludedSources: [],
  audience: emptyDraftAudience(),
  variableMappings: [],
  scheduledAt: null,
  timezone: null,
  progress: null,
  recipients: [],
  analytics: null,
  spend: { estimateAvailable: false, estimatedCost: null, actualAvailable: false, actualSpend: null, currency: 'INR' },
  auditEvents: [
    {
      id: 'evt_draft_tmpl_invalid_created',
      at: '2026-07-05T10:00:00+05:30',
      actorId: 'user_anita',
      action: 'Draft created',
      detail: 'Template was disabled by Meta after this draft was saved — resuming reveals the invalidated selection on the Template step.',
    },
  ],
  draftLastStep: 'template',
  conversionTrackingConfigured: false,
};

/* ------------------------------------------------------------------------- */
/* 1c. Draft — resumed with a disconnected sender (BATCHES.md Batch 2        */
/*     "disconnected-sender resume state")                                   */
/* ------------------------------------------------------------------------- */

const draftSenderDisconnected: Campaign = {
  id: 'cam_draft_sender_disconnected',
  name: 'Service Reminder — Round 2',
  type: 'one-time',
  status: 'draft',
  isArchived: false,
  creatorId: 'user_anita',
  branchId: 'branch_bengaluru',
  createdAt: '2026-08-01T09:00:00+05:30',
  updatedAt: '2026-08-01T09:10:00+05:30',
  whatsappNumberId: 'wa_bengaluru_service',
  templateId: null,
  templateLocale: null,
  includedSources: [],
  excludedSources: [],
  audience: emptyDraftAudience(),
  variableMappings: [],
  scheduledAt: null,
  timezone: null,
  progress: null,
  recipients: [],
  analytics: null,
  spend: { estimateAvailable: false, estimatedCost: null, actualAvailable: false, actualSpend: null, currency: 'INR' },
  auditEvents: [
    {
      id: 'evt_draft_sender_disc_created',
      at: '2026-08-01T09:00:00+05:30',
      actorId: 'user_anita',
      action: 'Draft created',
      detail: 'Northline Service — Bengaluru has since disconnected — resuming reveals the blocked sender on the Setup step.',
    },
  ],
  draftLastStep: 'setup',
  conversionTrackingConfigured: false,
};

/* ------------------------------------------------------------------------- */
/* 2. Scheduled — camp_new_arrivals (Dashboard Campaign Summary widget row)   */
/* ------------------------------------------------------------------------- */

const newArrivalsSources: AudienceSourceRef[] = [
  { id: 'src_new_arrivals_filter', kind: 'filter', label: 'City is Mumbai AND Stage is Engaged or Qualified', count: 640 },
];
const newArrivalsExclusions: AudienceExclusionRef[] = [
  { id: 'excl_new_arrivals_vip', kind: 'contacts', label: 'Manually excluded (VIP embargo list)', count: 8 },
];

const campNewArrivals: Campaign = {
  id: 'camp_new_arrivals',
  name: 'New Arrivals Teaser',
  type: 'one-time',
  status: 'scheduled',
  isArchived: false,
  creatorId: 'user_karan',
  branchId: 'branch_mumbai',
  createdAt: '2026-08-05T11:00:00+05:30',
  updatedAt: '2026-08-09T09:30:00+05:30',
  whatsappNumberId: 'wa_mumbai_sales',
  templateId: 'tmpl_new_arrivals',
  templateLocale: 'en_US',
  includedSources: newArrivalsSources,
  excludedSources: newArrivalsExclusions,
  audience: calculateAudienceBreakdown({
    includedSources: newArrivalsSources,
    excludedSources: newArrivalsExclusions,
    duplicatesRemoved: 22,
    consentIneligible: 34,
    invalidContactData: 9,
    invalidPersonalisation: 3,
  }),
  audienceSnapshotAt: '2026-08-09T09:30:00+05:30',
  variableMappings: [standardVariable()],
  scheduledAt: '2026-08-12T09:00:00+05:30',
  timezone: 'Asia/Kolkata',
  progress: null,
  recipients: [],
  analytics: null,
  spend: { estimateAvailable: true, estimatedCost: 890.0, actualAvailable: false, actualSpend: null, currency: 'INR' },
  auditEvents: [
    { id: 'evt_new_arrivals_created', at: '2026-08-05T11:00:00+05:30', actorId: 'user_karan', action: 'Draft created' },
    { id: 'evt_new_arrivals_scheduled', at: '2026-08-09T09:30:00+05:30', actorId: 'user_karan', action: 'Scheduled', detail: 'Scheduled for 12 Aug 2026, 9:00 AM IST.' },
  ],
  conversionTrackingConfigured: false,
};

/* ------------------------------------------------------------------------- */
/* 3. Live + partial-processing + failed-recipient — camp_festive_launch      */
/* ------------------------------------------------------------------------- */

const festiveSources: AudienceSourceRef[] = [
  { id: 'src_festive_segment', kind: 'segment', label: 'Festive 2026 audience (snapshot)', count: 342 },
  { id: 'src_festive_filter', kind: 'filter', label: 'Tag includes festive-2026 (all branches)', count: 1998 },
];
const festiveExclusions: AudienceExclusionRef[] = [
  { id: 'excl_festive_recent', kind: 'previous-recipients', label: 'Messaged in the last 7 days', count: 60 },
];

const festiveRecipients: RecipientRecord[] = [
  recipient(0, 'replied', { sentAt: '2026-08-09T10:05:00+05:30', deliveredAt: '2026-08-09T10:06:00+05:30', readAt: '2026-08-09T11:20:00+05:30', repliedAt: '2026-08-09T11:22:00+05:30' }),
  recipient(1, 'read', { sentAt: '2026-08-09T10:05:00+05:30', deliveredAt: '2026-08-09T10:06:00+05:30', readAt: '2026-08-09T14:02:00+05:30' }),
  recipient(2, 'delivered', { sentAt: '2026-08-09T10:06:00+05:30', deliveredAt: '2026-08-09T10:07:00+05:30' }),
  recipient(3, 'sent', { sentAt: '2026-08-09T10:06:00+05:30' }),
  recipient(4, 'delivered', { sentAt: '2026-08-09T10:07:00+05:30', deliveredAt: '2026-08-09T10:08:00+05:30' }),
  recipient(5, 'replied', { sentAt: '2026-08-09T10:07:00+05:30', deliveredAt: '2026-08-09T10:08:00+05:30', readAt: '2026-08-09T12:40:00+05:30', repliedAt: '2026-08-09T12:44:00+05:30' }),
  recipient(6, 'failed', { failureReason: 'Number is invalid or no longer on WhatsApp.', failureCategory: 'permanent' }),
  recipient(7, 'failed', { failureReason: 'Message blocked by recipient.', failureCategory: 'permanent' }),
  recipient(8, 'failed', { failureReason: 'Temporary delivery error from WhatsApp — can be retried.', failureCategory: 'retryable' }),
  recipient(9, 'read', { sentAt: '2026-08-09T10:08:00+05:30', deliveredAt: '2026-08-09T10:09:00+05:30', readAt: '2026-08-09T16:10:00+05:30' }),
  recipient(10, 'queued', {}),
  recipient(11, 'excluded', { excludedReason: 'Opted out after the audience snapshot was taken.' }),
];

const campFestiveLaunch: Campaign = {
  id: 'camp_festive_launch',
  name: 'Festive Launch',
  type: 'one-time',
  status: 'live',
  isArchived: false,
  creatorId: 'user_anita',
  branchId: 'branch_delhi',
  createdAt: '2026-08-06T09:00:00+05:30',
  updatedAt: '2026-08-09T16:45:00+05:30',
  whatsappNumberId: 'wa_delhi_sales',
  templateId: 'tmpl_festive_launch',
  templateLocale: 'en_US',
  includedSources: festiveSources,
  excludedSources: festiveExclusions,
  audience: calculateAudienceBreakdown({
    includedSources: festiveSources,
    excludedSources: festiveExclusions,
    duplicatesRemoved: 140,
    consentIneligible: 92,
    invalidContactData: 18,
    invalidPersonalisation: 0,
  }),
  audienceSnapshotAt: '2026-08-09T10:00:00+05:30',
  variableMappings: [
    standardVariable(),
    { variableIndex: 2, placeholder: '{{2}}', description: 'Discount percentage', sourceType: 'fixed-value', fixedValue: '20%', fallbackValue: '15%', missingCount: 0, invalidFormatCount: 0 },
  ],
  scheduledAt: '2026-08-09T10:00:00+05:30',
  timezone: 'Asia/Kolkata',
  progress: {
    totalEligible: 2340,
    processed: 2140,
    remaining: 200,
    sent: 2000,
    deliveredAvailable: true,
    delivered: 1660,
    failed: 140,
    health: 'partial',
    nextAction: 'Processing continues automatically. Failed sends are visible below as they occur.',
    lastUpdateAt: '2026-08-09T16:45:00+05:30',
  },
  recipients: festiveRecipients,
  analytics: {
    sent: 2000,
    delivered: 1660,
    read: 1180,
    replied: 214,
    failed: 140,
    clicksAvailable: false,
    clicks: null,
    conversionsAvailable: false,
    conversions: null,
    costPerResultAvailable: false,
    costPerResult: null,
    currency: 'INR',
    unavailableNote: 'Click and conversion metrics are not available until the campaign finishes sending.',
  },
  spend: { estimateAvailable: true, estimatedCost: 5850.0, actualAvailable: true, actualSpend: 4210.5, currency: 'INR' },
  auditEvents: [
    { id: 'evt_festive_created', at: '2026-08-06T09:00:00+05:30', actorId: 'user_anita', action: 'Draft created' },
    { id: 'evt_festive_scheduled', at: '2026-08-08T17:00:00+05:30', actorId: 'user_anita', action: 'Scheduled', detail: 'Scheduled for 9 Aug 2026, 10:00 AM IST.' },
    { id: 'evt_festive_started', at: '2026-08-09T10:00:00+05:30', actorId: null, action: 'Send started' },
  ],
  conversionTrackingConfigured: false,
};

/* ------------------------------------------------------------------------- */
/* 4. Completed + measurable clicks — camp_monsoon_restock                    */
/* ------------------------------------------------------------------------- */

const restockSources: AudienceSourceRef[] = [
  { id: 'src_restock_segment', kind: 'segment', label: 'Repeat buyers — last 90 days', count: 905 },
];

const restockRecipients: RecipientRecord[] = [
  recipient(0, 'replied', { sentAt: '2026-08-02T09:35:00+05:30', deliveredAt: '2026-08-02T09:36:00+05:30', readAt: '2026-08-02T10:00:00+05:30', repliedAt: '2026-08-02T10:05:00+05:30' }),
  recipient(1, 'delivered', { sentAt: '2026-08-02T09:35:00+05:30', deliveredAt: '2026-08-02T09:36:00+05:30' }),
  recipient(2, 'read', { sentAt: '2026-08-02T09:35:00+05:30', deliveredAt: '2026-08-02T09:36:00+05:30', readAt: '2026-08-02T13:10:00+05:30' }),
  recipient(3, 'delivered', { sentAt: '2026-08-02T09:36:00+05:30', deliveredAt: '2026-08-02T09:37:00+05:30' }),
  recipient(4, 'failed', { failureReason: 'Number is invalid or no longer on WhatsApp.', failureCategory: 'permanent' }),
  recipient(5, 'replied', { sentAt: '2026-08-02T09:36:00+05:30', deliveredAt: '2026-08-02T09:37:00+05:30', readAt: '2026-08-02T11:15:00+05:30', repliedAt: '2026-08-02T11:16:00+05:30' }),
];

const campMonsoonRestock: Campaign = {
  id: 'camp_monsoon_restock',
  name: 'Monsoon Restock Alert',
  type: 'one-time',
  status: 'completed',
  isArchived: false,
  creatorId: 'user_vikram',
  branchId: 'branch_delhi',
  createdAt: '2026-07-30T09:00:00+05:30',
  updatedAt: '2026-08-02T12:00:00+05:30',
  whatsappNumberId: 'wa_delhi_sales',
  templateId: 'tmpl_restock_alert',
  templateLocale: 'en_US',
  includedSources: restockSources,
  excludedSources: [],
  audience: calculateAudienceBreakdown({
    includedSources: restockSources,
    excludedSources: [],
    duplicatesRemoved: 20,
    consentIneligible: 15,
    invalidContactData: 10,
    invalidPersonalisation: 0,
  }),
  audienceSnapshotAt: '2026-08-02T09:30:00+05:30',
  variableMappings: [standardVariable()],
  scheduledAt: '2026-08-02T09:30:00+05:30',
  timezone: 'Asia/Kolkata',
  progress: {
    totalEligible: 860,
    processed: 860,
    remaining: 0,
    sent: 860,
    deliveredAvailable: true,
    delivered: 842,
    failed: 18,
    health: 'normal',
    lastUpdateAt: '2026-08-02T12:00:00+05:30',
  },
  recipients: restockRecipients,
  analytics: {
    sent: 860,
    delivered: 842,
    read: 690,
    replied: 133,
    failed: 18,
    clicksAvailable: true,
    clicks: 96,
    conversionsAvailable: true,
    conversions: 21,
    costPerResultAvailable: true,
    costPerResult: 4.2,
    currency: 'INR',
  },
  spend: { estimateAvailable: true, estimatedCost: 1290.0, actualAvailable: true, actualSpend: 1204.0, currency: 'INR' },
  auditEvents: [
    { id: 'evt_restock_created', at: '2026-07-30T09:00:00+05:30', actorId: 'user_vikram', action: 'Draft created' },
    { id: 'evt_restock_sent', at: '2026-08-02T09:30:00+05:30', actorId: 'user_vikram', action: 'Sent now' },
    { id: 'evt_restock_completed', at: '2026-08-02T12:00:00+05:30', actorId: null, action: 'Completed' },
  ],
  conversionTrackingConfigured: true,
};

/* ------------------------------------------------------------------------- */
/* 5. Paused                                                                   */
/* ------------------------------------------------------------------------- */

const dormantSources: AudienceSourceRef[] = [
  { id: 'src_dormant_segment', kind: 'segment', label: 'Dormant · re-engage', count: 57 },
];

const dormantRecipients: RecipientRecord[] = [
  recipient(2, 'delivered', { sentAt: '2026-08-09T09:00:00+05:30', deliveredAt: '2026-08-09T09:01:00+05:30' }),
  recipient(3, 'read', { sentAt: '2026-08-09T09:00:00+05:30', deliveredAt: '2026-08-09T09:01:00+05:30', readAt: '2026-08-09T09:40:00+05:30' }),
  recipient(6, 'failed', { failureReason: 'Number is invalid or no longer on WhatsApp.', failureCategory: 'permanent' }),
  recipient(8, 'queued', {}),
];

const campDormantReengage: Campaign = {
  id: 'cam_paused_reengage',
  name: 'Dormant Re-engage Push',
  type: 'one-time',
  status: 'paused',
  isArchived: false,
  creatorId: 'user_meera',
  branchId: 'branch_delhi',
  createdAt: '2026-08-08T15:00:00+05:30',
  updatedAt: '2026-08-09T09:20:00+05:30',
  whatsappNumberId: 'wa_delhi_sales',
  templateId: 'tmpl_festive_launch',
  templateLocale: 'en_US',
  includedSources: dormantSources,
  excludedSources: [],
  audience: calculateAudienceBreakdown({
    includedSources: dormantSources,
    excludedSources: [],
    duplicatesRemoved: 0,
    consentIneligible: 3,
    invalidContactData: 1,
    invalidPersonalisation: 0,
  }),
  audienceSnapshotAt: '2026-08-09T09:00:00+05:30',
  variableMappings: [standardVariable(), { variableIndex: 2, placeholder: '{{2}}', description: 'Discount percentage', sourceType: 'fixed-value', fixedValue: '15%', fallbackValue: '10%', missingCount: 0, invalidFormatCount: 0 }],
  scheduledAt: '2026-08-09T09:00:00+05:30',
  timezone: 'Asia/Kolkata',
  progress: {
    totalEligible: 53,
    processed: 30,
    remaining: 23,
    sent: 28,
    deliveredAvailable: true,
    delivered: 24,
    failed: 2,
    health: 'normal',
    nextAction: 'Resume once the message content review is complete.',
    lastUpdateAt: '2026-08-09T09:20:00+05:30',
  },
  recipients: dormantRecipients,
  analytics: {
    sent: 28,
    delivered: 24,
    read: 12,
    replied: 2,
    failed: 2,
    clicksAvailable: false,
    clicks: null,
    conversionsAvailable: false,
    conversions: null,
    costPerResultAvailable: false,
    costPerResult: null,
    currency: 'INR',
    unavailableNote: 'Campaign is paused mid-send — final metrics are not available yet.',
  },
  spend: { estimateAvailable: true, estimatedCost: 153.7, actualAvailable: true, actualSpend: 81.2, currency: 'INR' },
  auditEvents: [
    { id: 'evt_dormant_created', at: '2026-08-08T15:00:00+05:30', actorId: 'user_meera', action: 'Draft created' },
    { id: 'evt_dormant_sent', at: '2026-08-09T09:00:00+05:30', actorId: 'user_meera', action: 'Sent now' },
    { id: 'evt_dormant_paused', at: '2026-08-09T09:20:00+05:30', actorId: 'user_meera', action: 'Paused', detail: 'Paused pending manual review of message content.' },
  ],
  conversionTrackingConfigured: false,
};

/* ------------------------------------------------------------------------- */
/* 6. Cancelled                                                               */
/* ------------------------------------------------------------------------- */

const priceUpdateSources: AudienceSourceRef[] = [
  { id: 'src_priceupdate_filter', kind: 'filter', label: 'Stage is Customer', count: 430 },
];

const campPriceUpdate: Campaign = {
  id: 'cam_cancelled_pricehike',
  name: 'Price Update Notice',
  type: 'one-time',
  status: 'cancelled',
  isArchived: false,
  creatorId: 'user_vikram',
  branchId: 'branch_delhi',
  createdAt: '2026-08-07T10:00:00+05:30',
  updatedAt: '2026-08-08T11:00:00+05:30',
  whatsappNumberId: 'wa_delhi_sales',
  templateId: 'tmpl_festive_launch',
  templateLocale: 'en_US',
  includedSources: priceUpdateSources,
  excludedSources: [],
  audience: calculateAudienceBreakdown({
    includedSources: priceUpdateSources,
    excludedSources: [],
    duplicatesRemoved: 5,
    consentIneligible: 8,
    invalidContactData: 2,
    invalidPersonalisation: 0,
  }),
  variableMappings: [standardVariable(), { variableIndex: 2, placeholder: '{{2}}', description: 'Discount percentage', sourceType: 'fixed-value', fixedValue: '0%', fallbackValue: '0%', missingCount: 0, invalidFormatCount: 0 }],
  scheduledAt: '2026-08-08T15:00:00+05:30',
  timezone: 'Asia/Kolkata',
  progress: null,
  recipients: [],
  analytics: null,
  spend: { estimateAvailable: true, estimatedCost: 1030.0, actualAvailable: false, actualSpend: null, currency: 'INR' },
  auditEvents: [
    { id: 'evt_price_created', at: '2026-08-07T10:00:00+05:30', actorId: 'user_vikram', action: 'Draft created' },
    { id: 'evt_price_scheduled', at: '2026-08-07T16:00:00+05:30', actorId: 'user_vikram', action: 'Scheduled', detail: 'Scheduled for 8 Aug 2026, 3:00 PM IST.' },
    { id: 'evt_price_cancelled', at: '2026-08-08T11:00:00+05:30', actorId: 'user_vikram', action: 'Cancelled', detail: 'Pricing details changed after scheduling — cancelled to avoid sending outdated prices.' },
  ],
  cancelledReason: 'Pricing details changed after scheduling — cancelled to avoid sending outdated prices.',
  cancelledAt: '2026-08-08T11:00:00+05:30',
  conversionTrackingConfigured: false,
};

/* ------------------------------------------------------------------------- */
/* 7. Completed + archived                                                    */
/* ------------------------------------------------------------------------- */

const republicDaySources: AudienceSourceRef[] = [
  { id: 'src_republic_day_filter', kind: 'filter', label: 'Tag includes republic-day-2026', count: 1580 },
];

const republicDayRecipients: RecipientRecord[] = [
  recipient(1, 'replied', { sentAt: '2026-01-24T09:05:00+05:30', deliveredAt: '2026-01-24T09:06:00+05:30', readAt: '2026-01-24T10:00:00+05:30', repliedAt: '2026-01-24T10:02:00+05:30' }),
  recipient(4, 'delivered', { sentAt: '2026-01-24T09:05:00+05:30', deliveredAt: '2026-01-24T09:06:00+05:30' }),
  recipient(7, 'failed', { failureReason: 'Message blocked by recipient.', failureCategory: 'permanent' }),
];

const campRepublicDay: Campaign = {
  id: 'cam_archived_completed',
  name: 'Republic Day Sale 2026',
  type: 'one-time',
  status: 'completed',
  isArchived: true,
  creatorId: 'user_anita',
  branchId: 'branch_delhi',
  createdAt: '2026-01-20T09:00:00+05:30',
  updatedAt: '2026-01-24T14:00:00+05:30',
  whatsappNumberId: 'wa_delhi_sales',
  templateId: 'tmpl_festive_launch',
  templateLocale: 'en_US',
  includedSources: republicDaySources,
  excludedSources: [],
  audience: calculateAudienceBreakdown({
    includedSources: republicDaySources,
    excludedSources: [],
    duplicatesRemoved: 50,
    consentIneligible: 22,
    invalidContactData: 8,
    invalidPersonalisation: 0,
  }),
  audienceSnapshotAt: '2026-01-24T09:00:00+05:30',
  variableMappings: [standardVariable(), { variableIndex: 2, placeholder: '{{2}}', description: 'Discount percentage', sourceType: 'fixed-value', fixedValue: '26%', fallbackValue: '20%', missingCount: 0, invalidFormatCount: 0 }],
  scheduledAt: '2026-01-24T09:00:00+05:30',
  timezone: 'Asia/Kolkata',
  progress: {
    totalEligible: 1500,
    processed: 1500,
    remaining: 0,
    sent: 1500,
    deliveredAvailable: true,
    delivered: 1440,
    failed: 60,
    health: 'normal',
    lastUpdateAt: '2026-01-24T14:00:00+05:30',
  },
  recipients: republicDayRecipients,
  analytics: {
    sent: 1500,
    delivered: 1440,
    read: 1120,
    replied: 260,
    failed: 60,
    clicksAvailable: true,
    clicks: 188,
    conversionsAvailable: true,
    conversions: 47,
    costPerResultAvailable: true,
    costPerResult: 3.6,
    currency: 'INR',
  },
  spend: { estimateAvailable: true, estimatedCost: 4200.0, actualAvailable: true, actualSpend: 3960.0, currency: 'INR' },
  auditEvents: [
    { id: 'evt_republic_created', at: '2026-01-20T09:00:00+05:30', actorId: 'user_anita', action: 'Draft created' },
    { id: 'evt_republic_sent', at: '2026-01-24T09:00:00+05:30', actorId: 'user_anita', action: 'Sent now' },
    { id: 'evt_republic_completed', at: '2026-01-24T14:00:00+05:30', actorId: null, action: 'Completed' },
    { id: 'evt_republic_archived', at: '2026-02-05T10:00:00+05:30', actorId: 'user_anita', action: 'Archived', detail: 'Hidden from operational views — record preserved.' },
  ],
  conversionTrackingConfigured: true,
};

/* ------------------------------------------------------------------------- */
/* 8. Interrupted (technical) — distinct from partial-processing              */
/* ------------------------------------------------------------------------- */

const flashSaleSources: AudienceSourceRef[] = [
  { id: 'src_flash_filter', kind: 'filter', label: 'Branch is Mumbai West AND consent is Opted-in', count: 980 },
];

const flashSaleRecipients: RecipientRecord[] = [
  recipient(5, 'delivered', { sentAt: '2026-08-10T08:40:00+05:30', deliveredAt: '2026-08-10T08:41:00+05:30' }),
  recipient(6, 'sent', { sentAt: '2026-08-10T08:41:00+05:30' }),
  recipient(9, 'failed', { failureReason: 'Temporary delivery error from WhatsApp — can be retried.', failureCategory: 'retryable' }),
  // Retryable at send time, but the contact (contact_imran_qureshi) has since opted out —
  // demonstrates CAM-M08's "currently ineligible" re-check, distinct from a permanent failure.
  recipient(4, 'failed', { failureReason: 'Temporary delivery error from WhatsApp — can be retried.', failureCategory: 'retryable' }),
  recipient(10, 'queued', {}),
];

const campFlashSale: Campaign = {
  id: 'cam_interrupted_gateway',
  name: 'Weekend Flash Sale',
  type: 'one-time',
  status: 'live',
  isArchived: false,
  creatorId: 'user_vikram',
  branchId: 'branch_mumbai',
  createdAt: '2026-08-09T18:00:00+05:30',
  updatedAt: '2026-08-10T08:47:00+05:30',
  whatsappNumberId: 'wa_mumbai_sales',
  templateId: 'tmpl_new_arrivals',
  templateLocale: 'en_US',
  includedSources: flashSaleSources,
  excludedSources: [],
  audience: calculateAudienceBreakdown({
    includedSources: flashSaleSources,
    excludedSources: [],
    duplicatesRemoved: 12,
    consentIneligible: 0,
    invalidContactData: 6,
    invalidPersonalisation: 0,
  }),
  audienceSnapshotAt: '2026-08-10T08:30:00+05:30',
  variableMappings: [standardVariable()],
  scheduledAt: '2026-08-10T08:30:00+05:30',
  timezone: 'Asia/Kolkata',
  progress: {
    totalEligible: 962,
    processed: 410,
    remaining: 552,
    sent: 400,
    deliveredAvailable: true,
    delivered: 350,
    failed: 10,
    health: 'interrupted',
    interruptedReason: 'WhatsApp delivery gateway stopped responding mid-send.',
    interruptedDetail: 'Meta Cloud API returned repeated timeout errors (HTTP 504) starting 08:42 IST. Processing halted automatically after 5 consecutive failures.',
    nextAction: 'Retry the remaining recipients once the gateway connection is confirmed stable.',
    lastUpdateAt: '2026-08-10T08:47:00+05:30',
  },
  recipients: flashSaleRecipients,
  analytics: {
    sent: 400,
    delivered: 350,
    read: 210,
    replied: 18,
    failed: 10,
    clicksAvailable: false,
    clicks: null,
    conversionsAvailable: false,
    conversions: null,
    costPerResultAvailable: false,
    costPerResult: null,
    currency: 'INR',
    unavailableNote: 'Click tracking is not available while delivery is interrupted.',
  },
  spend: { estimateAvailable: true, estimatedCost: 2405.0, actualAvailable: true, actualSpend: 890.0, currency: 'INR' },
  auditEvents: [
    { id: 'evt_flash_created', at: '2026-08-09T18:00:00+05:30', actorId: 'user_vikram', action: 'Draft created' },
    { id: 'evt_flash_sent', at: '2026-08-10T08:30:00+05:30', actorId: 'user_vikram', action: 'Sent now' },
    { id: 'evt_flash_interrupted', at: '2026-08-10T08:47:00+05:30', actorId: null, action: 'Interrupted', detail: 'WhatsApp delivery gateway stopped responding mid-send.' },
  ],
  conversionTrackingConfigured: false,
};

/* ------------------------------------------------------------------------- */
/* 9. Completed — clicks/conversions unavailable, sender since disconnected   */
/* ------------------------------------------------------------------------- */

const serviceReminderSources: AudienceSourceRef[] = [
  { id: 'src_service_segment', kind: 'filter', label: 'AMC due within 30 days', count: 225 },
];

const serviceReminderRecipients: RecipientRecord[] = [
  recipient(0, 'delivered', { sentAt: '2026-07-15T10:00:00+05:30', deliveredAt: '2026-07-15T10:01:00+05:30' }),
  recipient(3, 'read', { sentAt: '2026-07-15T10:00:00+05:30', deliveredAt: '2026-07-15T10:01:00+05:30', readAt: '2026-07-15T11:00:00+05:30' }),
  recipient(11, 'failed', { failureReason: 'Number is invalid or no longer on WhatsApp.', failureCategory: 'permanent' }),
];

const campServiceReminder: Campaign = {
  id: 'cam_service_reminder',
  name: 'Service Reminder — AMC Renewal',
  type: 'one-time',
  status: 'completed',
  isArchived: false,
  creatorId: 'user_anita',
  branchId: 'branch_bengaluru',
  createdAt: '2026-07-12T09:00:00+05:30',
  updatedAt: '2026-07-15T13:00:00+05:30',
  whatsappNumberId: 'wa_bengaluru_service',
  templateId: 'tmpl_service_visit_reminder',
  templateLocale: 'en_US',
  includedSources: serviceReminderSources,
  excludedSources: [],
  audience: calculateAudienceBreakdown({
    includedSources: serviceReminderSources,
    excludedSources: [],
    duplicatesRemoved: 4,
    consentIneligible: 6,
    invalidContactData: 5,
    invalidPersonalisation: 0,
  }),
  audienceSnapshotAt: '2026-07-15T09:30:00+05:30',
  variableMappings: [standardVariable(), { variableIndex: 2, placeholder: '{{2}}', description: 'Service visit date', sourceType: 'custom-field', sourceField: 'nextServiceDate', fallbackValue: 'your scheduled date', missingCount: 12, invalidFormatCount: 0 }],
  scheduledAt: '2026-07-15T10:00:00+05:30',
  timezone: 'Asia/Kolkata',
  progress: {
    totalEligible: 210,
    processed: 210,
    remaining: 0,
    sent: 210,
    deliveredAvailable: true,
    delivered: 200,
    failed: 10,
    health: 'normal',
    lastUpdateAt: '2026-07-15T13:00:00+05:30',
  },
  recipients: serviceReminderRecipients,
  analytics: {
    sent: 210,
    delivered: 200,
    read: 150,
    replied: 22,
    failed: 10,
    clicksAvailable: false,
    clicks: null,
    conversionsAvailable: false,
    conversions: null,
    costPerResultAvailable: false,
    costPerResult: null,
    currency: 'INR',
    unavailableNote: 'This template has no trackable link, so click and conversion metrics are not available.',
  },
  spend: { estimateAvailable: false, estimatedCost: null, actualAvailable: false, actualSpend: null, currency: 'INR', note: 'Pricing data could not be retrieved for this WhatsApp number.' },
  auditEvents: [
    { id: 'evt_service_created', at: '2026-07-12T09:00:00+05:30', actorId: 'user_anita', action: 'Draft created' },
    { id: 'evt_service_sent', at: '2026-07-15T10:00:00+05:30', actorId: 'user_anita', action: 'Sent now' },
    { id: 'evt_service_completed', at: '2026-07-15T13:00:00+05:30', actorId: null, action: 'Completed' },
  ],
  conversionTrackingConfigured: false,
};

export const campaigns: Campaign[] = [
  draftFestiveRound2,
  draftTemplateInvalidated,
  draftSenderDisconnected,
  campNewArrivals,
  campFestiveLaunch,
  campMonsoonRestock,
  campDormantReengage,
  campPriceUpdate,
  campRepublicDay,
  campFlashSale,
  campServiceReminder,
];

export function findCampaign(campaignId: string): Campaign | undefined {
  return campaigns.find((campaign) => campaign.id === campaignId);
}
