import type { BadgeTone } from '@crm/design-system';
import type { NumberLifecycleStatus } from '@crm/mock-data';

/** One place the lifecycle status → label/tone mapping lives (CODE_FIRST_ADAPTER.md §4 pattern). */
export const NUMBER_STATUS_META: Record<NumberLifecycleStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  in_setup: { label: 'In setup', tone: 'info' },
  live: { label: 'Live', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
  stopped: { label: 'Stopped', tone: 'neutral' },
  deregistered: { label: 'Deregistered', tone: 'danger' },
};

export const PURPOSE_LABEL: Record<string, string> = {
  sales: 'Sales',
  support: 'Support',
  both: 'Sales & Support',
  other: 'Other',
};

export const PAYER_MODE_LABEL: Record<string, string> = {
  provider_wallet: 'Messaging balance (provider)',
  direct_meta: 'Meta billing connected',
  needs_attention: 'Needs attention',
};
