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

/* --- Requirement additions: Lead Status (pipeline) vs Customer Lifecycle --- */

export const leadStatusLabel: Record<string, string> = {
  new: 'New',
  assigned: 'Assigned',
  attempted: 'Attempted',
  connected: 'Connected',
  engaged: 'Engaged',
  enquiry_generated: 'Enquiry Generated',
  not_interested: 'Not Interested',
  dormant: 'Dormant',
};

export const leadStatusTone: Record<string, BadgeTone> = {
  new: 'info',
  assigned: 'info',
  attempted: 'warning',
  connected: 'brand',
  engaged: 'brand',
  enquiry_generated: 'success',
  not_interested: 'danger',
  dormant: 'neutral',
};

export const lifecycleLabel: Record<string, string> = {
  prospect: 'Prospect',
  customer: 'Customer',
};

export const lifecycleTone: Record<string, BadgeTone> = {
  prospect: 'info',
  customer: 'success',
};

export const lifecycleStateLabel: Record<string, string> = {
  active: 'Active',
  dormant: 'Dormant',
  reactivated: 'Reactivated',
};

export const customerTypeLabel: Record<string, string> = {
  b2b: 'B2B',
  b2c: 'B2C',
};
