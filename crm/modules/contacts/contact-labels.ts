import type { BadgeTone } from '@crm/design-system';
import type { ConsentState, ContactStage, SalesTier } from '@crm/mock-data';

/**
 * Central mapping of Contacts domain values → human labels and badge tones.
 * Keeping this in one place stops each screen inventing its own colour/wording.
 * Stage/source values are configurable in the product (CFG-CON-S03/S05); these
 * are the prototype defaults.
 */

export const stageLabel: Record<ContactStage, string> = {
  new: 'New',
  engaged: 'Engaged',
  qualified: 'Qualified',
  customer: 'Customer',
  dormant: 'Dormant',
};

export const stageTone: Record<ContactStage, BadgeTone> = {
  new: 'info',
  engaged: 'brand',
  qualified: 'warning',
  customer: 'success',
  dormant: 'neutral',
};

export const consentLabel: Record<ConsentState, string> = {
  'opted-in': 'Opted in',
  'opted-out': 'Opted out',
  pending: 'Consent pending',
};

export const consentTone: Record<ConsentState, BadgeTone> = {
  'opted-in': 'success',
  'opted-out': 'danger',
  pending: 'warning',
};

export const salesTierLabel: Record<SalesTier, string> = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  standard: 'Standard',
};

/** Gold is the rationed highlight — reserved here for the premium tiers. */
export const salesTierTone: Record<SalesTier, BadgeTone> = {
  platinum: 'gold',
  gold: 'gold',
  silver: 'neutral',
  standard: 'neutral',
};
