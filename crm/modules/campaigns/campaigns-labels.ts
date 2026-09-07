import type { BadgeTone } from '@crm/design-system';
import type {
  AudienceExclusionKind,
  AudienceSourceKind,
  CampaignStatus,
  CampaignType,
  PersonalisationSourceType,
  ProcessingHealth,
  RecipientStatus,
} from './domain/types';

export const statusLabel: Record<CampaignStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  live: 'Live',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const statusTone: Record<CampaignStatus, BadgeTone> = {
  draft: 'neutral',
  scheduled: 'info',
  live: 'brand',
  paused: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

export const typeLabel: Record<CampaignType, string> = {
  'one-time': 'One-time',
  'follow-up': 'Follow-up',
  recurring: 'Recurring',
  trigger: 'Trigger-based',
  api: 'API',
};

export const audienceSourceKindLabel: Record<AudienceSourceKind, string> = {
  segment: 'Segment',
  filter: 'Filter',
  contacts: 'Selected contacts',
  upload: 'Uploaded file',
  'result-audience': 'Campaign result audience',
};

export const audienceExclusionKindLabel: Record<AudienceExclusionKind, string> = {
  segment: 'Segment',
  filter: 'Filter',
  contacts: 'Selected contacts',
  'previous-recipients': 'Previous campaign recipients',
};

export const personalisationSourceLabel: Record<PersonalisationSourceType, string> = {
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
  document: 'Document reference',
};

export const recipientStatusLabel: Record<RecipientStatus, string> = {
  queued: 'Queued',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  replied: 'Replied',
  failed: 'Failed',
  excluded: 'Excluded',
};

export const recipientStatusTone: Record<RecipientStatus, BadgeTone> = {
  queued: 'neutral',
  sent: 'info',
  delivered: 'info',
  read: 'brand',
  replied: 'success',
  failed: 'danger',
  excluded: 'neutral',
};

export const processingHealthLabel: Record<ProcessingHealth, string> = {
  normal: 'Sending normally',
  partial: 'Sending with some failures',
  interrupted: 'Interrupted',
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatCurrency(value: number, currency: string): string {
  if (currency === 'INR') return `₹${value.toLocaleString('en-IN')}`;
  return `${currency} ${value.toLocaleString('en-IN')}`;
}
