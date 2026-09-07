import type { Contact } from '@crm/mock-data';
import type { PersonalisationSourceType, VariableMapping } from '../domain/types';

/**
 * CAM-S06 personalisation source catalogue (SKILL.md §Personalisation).
 * `needsSourceField`/`needsFixedValue` drive which secondary input the step
 * shows per source type; `estimateIssues` gives deterministic (not random)
 * missing/invalid-format counts scaled off the eligible audience — a
 * prototype approximation, not a real data-quality engine.
 */
export const sourceTypeLabel: Record<PersonalisationSourceType, string> = {
  'contact-field': 'Standard contact field',
  'custom-field': 'Custom field',
  tag: 'Tag',
  'lead-stage': 'Lead stage',
  city: 'City',
  company: 'Company',
  'customer-attribute': 'Customer attribute',
  'fixed-value': 'Fixed value',
  'dynamic-link': 'Dynamic link',
  media: 'Media',
  document: 'Document',
};

export const contactFieldOptions = [
  { value: 'name', label: 'Contact name' },
  { value: 'mobile', label: 'Mobile number' },
];

export function needsSourceField(sourceType: PersonalisationSourceType): boolean {
  return sourceType === 'contact-field' || sourceType === 'custom-field' || sourceType === 'customer-attribute';
}

export function needsFixedValue(sourceType: PersonalisationSourceType): boolean {
  return sourceType === 'fixed-value' || sourceType === 'dynamic-link' || sourceType === 'media' || sourceType === 'document';
}

/** Deterministic issue-rate estimate per source type — see file header. */
export function estimateMappingIssues(sourceType: PersonalisationSourceType, eligible: number): { missingCount: number; invalidFormatCount: number } {
  switch (sourceType) {
    case 'company':
      return { missingCount: Math.round(eligible * 0.15), invalidFormatCount: 0 };
    case 'tag':
      return { missingCount: Math.round(eligible * 0.1), invalidFormatCount: 0 };
    case 'custom-field':
    case 'customer-attribute':
      return { missingCount: Math.round(eligible * 0.2), invalidFormatCount: 0 };
    case 'contact-field':
    case 'city':
    case 'lead-stage':
      return { missingCount: 0, invalidFormatCount: 0 };
    case 'fixed-value':
    case 'dynamic-link':
    case 'media':
    case 'document':
    default:
      return { missingCount: 0, invalidFormatCount: 0 };
  }
}

const stageLabel: Record<Contact['stage'], string> = {
  new: 'New',
  engaged: 'Engaged',
  qualified: 'Qualified',
  customer: 'Customer',
  dormant: 'Dormant',
};

/** Resolves one variable mapping to a display value for a sample contact — used by DR04 and the Review preview. */
export function resolveSampleValue(mapping: VariableMapping, contact: Contact): { value: string; usedFallback: boolean } {
  const fallback = () => ({ value: mapping.fallbackValue || `{{${mapping.variableIndex}}}`, usedFallback: true });

  switch (mapping.sourceType) {
    case 'contact-field': {
      if (mapping.sourceField === 'mobile') return { value: contact.mobile, usedFallback: false };
      if (mapping.sourceField === 'name') return contact.name ? { value: contact.name, usedFallback: false } : fallback();
      return fallback();
    }
    case 'city':
      return contact.city ? { value: contact.city, usedFallback: false } : fallback();
    case 'company':
      return contact.company ? { value: contact.company, usedFallback: false } : fallback();
    case 'tag':
      return contact.tags.length > 0 ? { value: contact.tags[0], usedFallback: false } : fallback();
    case 'lead-stage':
      return { value: stageLabel[contact.stage], usedFallback: false };
    case 'fixed-value':
    case 'dynamic-link':
    case 'media':
    case 'document':
      return mapping.fixedValue ? { value: mapping.fixedValue, usedFallback: false } : fallback();
    case 'custom-field':
    case 'customer-attribute':
    default:
      return fallback();
  }
}
