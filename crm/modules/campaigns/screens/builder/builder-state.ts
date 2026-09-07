import { calculateAudienceBreakdown } from '../../domain/audienceCalculation';
import { findCampaign } from '../../data/mockCampaigns';
import type { BuilderStepId, Campaign, CampaignType } from '../../domain/types';

/** Editable draft shape is the full `Campaign` type with `status: 'draft'` — see CODE_FIRST_ADAPTER.md §6 "Draft state". */

export const builderSteps: { id: BuilderStepId; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'template', label: 'Template' },
  { id: 'audience', label: 'Audience' },
  { id: 'personalisation', label: 'Personalisation' },
  { id: 'review', label: 'Review & Launch' },
];

export const CORE_STEPS: string[] = builderSteps.map((s) => s.id);
export const PHASE2_STEPS = ['recurrence', 'trigger', 'api'];

function emptyAudience() {
  return calculateAudienceBreakdown({
    includedSources: [],
    excludedSources: [],
    duplicatesRemoved: 0,
    consentIneligible: 0,
    invalidContactData: 0,
    invalidPersonalisation: 0,
  });
}

export function newDraftId(): string {
  return `cam_draft_${Date.now().toString(36)}`;
}

export interface DraftInit {
  draftId: string | null;
  source: string | null;
  sourceCampaignId: string | null;
  resultType: string | null;
  requestedType: string | null;
  creatorId: string;
  branchId: string;
  defaultWhatsAppNumberId: string | null;
}

const validTypes: CampaignType[] = ['one-time', 'follow-up', 'recurring', 'trigger', 'api'];

export function initCampaignDraft(init: DraftInit): Campaign {
  const now = new Date().toISOString();

  // Resume an existing draft fixture unchanged.
  if (init.draftId) {
    const existing = findCampaign(init.draftId);
    if (existing && existing.status === 'draft') {
      return structuredClone(existing);
    }
  }

  // Duplicate an existing campaign into a fresh draft.
  if (init.source === 'duplicate' && init.sourceCampaignId) {
    const original = findCampaign(init.sourceCampaignId);
    if (original) {
      const clone = structuredClone(original);
      return {
        ...clone,
        id: init.draftId ?? newDraftId(),
        name: `${original.name} (Copy)`,
        type: original.type === 'follow-up' ? 'one-time' : original.type,
        status: 'draft',
        isArchived: false,
        createdAt: now,
        updatedAt: now,
        scheduledAt: null,
        progress: null,
        recipients: [],
        analytics: null,
        auditEvents: [
          { id: `evt_${Date.now()}`, at: now, actorId: init.creatorId, action: 'Draft created', detail: `Duplicated from "${original.name}".` },
        ],
        sourceCampaignId: undefined,
        sourceResultType: undefined,
        cancelledReason: undefined,
        cancelledAt: undefined,
        draftLastStep: 'setup',
      };
    }
  }

  // Follow-up drafted from a campaign result (CLAUDE.md §Follow-up / retargeting).
  if (init.source === 'follow-up' && init.sourceCampaignId) {
    const original = findCampaign(init.sourceCampaignId);
    if (original) {
      return {
        id: init.draftId ?? newDraftId(),
        name: `${original.name} — Follow-up`,
        type: 'follow-up',
        status: 'draft',
        isArchived: false,
        creatorId: init.creatorId,
        branchId: init.branchId,
        createdAt: now,
        updatedAt: now,
        whatsappNumberId: original.whatsappNumberId,
        templateId: null,
        templateLocale: null,
        includedSources: [],
        excludedSources: [],
        audience: emptyAudience(),
        variableMappings: [],
        scheduledAt: null,
        timezone: null,
        progress: null,
        recipients: [],
        analytics: null,
        spend: { estimateAvailable: false, estimatedCost: null, actualAvailable: false, actualSpend: null, currency: 'INR' },
        auditEvents: [
          { id: `evt_${Date.now()}`, at: now, actorId: init.creatorId, action: 'Draft created', detail: `Follow-up from "${original.name}".` },
        ],
        sourceCampaignId: original.id,
        sourceResultType: (init.resultType as Campaign['sourceResultType']) ?? undefined,
        draftLastStep: 'setup',
        conversionTrackingConfigured: false,
      };
    }
  }

  const type: CampaignType = validTypes.includes(init.requestedType as CampaignType) ? (init.requestedType as CampaignType) : 'one-time';

  return {
    id: init.draftId ?? newDraftId(),
    name: '',
    type,
    status: 'draft',
    isArchived: false,
    creatorId: init.creatorId,
    branchId: init.branchId,
    createdAt: now,
    updatedAt: now,
    whatsappNumberId: init.defaultWhatsAppNumberId,
    templateId: null,
    templateLocale: null,
    includedSources: [],
    excludedSources: [],
    audience: emptyAudience(),
    variableMappings: [],
    scheduledAt: null,
    timezone: null,
    progress: null,
    recipients: [],
    analytics: null,
    spend: { estimateAvailable: false, estimatedCost: null, actualAvailable: false, actualSpend: null, currency: 'INR' },
    auditEvents: [{ id: `evt_${Date.now()}`, at: now, actorId: init.creatorId, action: 'Draft created' }],
    draftLastStep: 'setup',
    conversionTrackingConfigured: false,
  };
}

export function setupValid(draft: Campaign): boolean {
  return draft.name.trim().length > 0 && draft.whatsappNumberId !== null;
}

export function templateValid(draft: Campaign): boolean {
  return draft.templateId !== null;
}

/** At least one included source, and the waterfall must still leave someone eligible (CLAUDE.md §Audience calculation rule). */
export function audienceValid(draft: Campaign): boolean {
  return draft.includedSources.length > 0 && draft.audience.finalEligible > 0;
}

/** Blocks Continue if every remaining recipient would be excluded by unresolved personalisation (SKILL.md §Personalisation). */
export function personalisationValid(draft: Campaign): boolean {
  return draft.audience.finalEligible > 0;
}
