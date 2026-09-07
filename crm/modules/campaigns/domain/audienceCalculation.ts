import type { AudienceBreakdown, AudienceExclusionRef, AudienceSourceRef } from './types';

/**
 * Deterministic audience waterfall (CLAUDE.md §Audience calculation rule).
 * Included sources → union → duplicates removed → explicit exclusions →
 * eligibility/consent exclusions → invalid contact data → invalid required
 * personalisation → final unique eligible recipients. Every stage stays a
 * separate tracked figure so Review & Launch can show the full breakdown.
 */
export interface AudienceCalculationInput {
  includedSources: AudienceSourceRef[];
  excludedSources: AudienceExclusionRef[];
  duplicatesRemoved: number;
  consentIneligible: number;
  invalidContactData: number;
  invalidPersonalisation: number;
}

export function calculateAudienceBreakdown(input: AudienceCalculationInput): AudienceBreakdown {
  const includedRaw = input.includedSources.reduce((sum, source) => sum + source.count, 0);
  const manualExclusions = input.excludedSources.reduce((sum, source) => sum + source.count, 0);

  const afterDedupe = Math.max(0, includedRaw - input.duplicatesRemoved);
  const afterExclusions = Math.max(0, afterDedupe - manualExclusions);
  const afterConsent = Math.max(0, afterExclusions - input.consentIneligible);
  const afterInvalidContact = Math.max(0, afterConsent - input.invalidContactData);
  const finalEligible = Math.max(0, afterInvalidContact - input.invalidPersonalisation);

  return {
    includedRaw,
    duplicatesRemoved: input.duplicatesRemoved,
    manualExclusions,
    consentIneligible: input.consentIneligible,
    invalidContactData: input.invalidContactData,
    invalidPersonalisation: input.invalidPersonalisation,
    finalEligible,
  };
}

/**
 * Re-applies the final personalisation-invalidity stage once CAM-S06 finalises
 * variable mappings (CLAUDE.md "At Audience step, personalisation invalidity
 * may remain provisional until S06"). Keeps every earlier stage untouched.
 */
export function applyPersonalisationInvalidity(breakdown: AudienceBreakdown, invalidPersonalisation: number): AudienceBreakdown {
  const beforePersonalisation = breakdown.finalEligible + breakdown.invalidPersonalisation;
  return {
    ...breakdown,
    invalidPersonalisation,
    finalEligible: Math.max(0, beforePersonalisation - invalidPersonalisation),
  };
}

/** Waterfall rows for the Audience Calculation Panel, in the order the spec defines. */
export interface AudienceWaterfallRow {
  key: keyof AudienceBreakdown;
  label: string;
  value: number;
  tone: 'neutral' | 'negative' | 'positive';
}

export function audienceWaterfallRows(breakdown: AudienceBreakdown): AudienceWaterfallRow[] {
  return [
    { key: 'includedRaw', label: 'Included sources (union)', value: breakdown.includedRaw, tone: 'neutral' },
    { key: 'duplicatesRemoved', label: 'Duplicates removed', value: -breakdown.duplicatesRemoved, tone: 'negative' },
    { key: 'manualExclusions', label: 'Explicit exclusions', value: -breakdown.manualExclusions, tone: 'negative' },
    { key: 'consentIneligible', label: 'Consent / eligibility exclusions', value: -breakdown.consentIneligible, tone: 'negative' },
    { key: 'invalidContactData', label: 'Invalid contact data', value: -breakdown.invalidContactData, tone: 'negative' },
    { key: 'invalidPersonalisation', label: 'Invalid required personalisation', value: -breakdown.invalidPersonalisation, tone: 'negative' },
    { key: 'finalEligible', label: 'Final unique eligible recipients', value: breakdown.finalEligible, tone: 'positive' },
  ];
}
