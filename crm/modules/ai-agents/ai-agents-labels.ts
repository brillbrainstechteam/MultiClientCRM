import type {
  AgentLifecycleStatus,
  AgentUseCase,
  AutonomyPreset,
  DataAccessScope,
  KnowledgeSourceStatus,
  KnowledgeSourceType,
  MaskedFieldCategory,
  StandardTestCategory,
} from './domain/types';
import type { BadgeTone } from '@crm/design-system';

export const lifecycleLabel: Record<AgentLifecycleStatus, string> = {
  draft: 'Draft',
  ready_to_test: 'Ready to Test',
  tested: 'Tested',
  active: 'Active',
  paused: 'Paused',
  inactive: 'Inactive',
};

export const lifecycleTone: Record<AgentLifecycleStatus, BadgeTone> = {
  draft: 'neutral',
  ready_to_test: 'info',
  tested: 'brand',
  active: 'success',
  paused: 'warning',
  inactive: 'neutral',
};

export const useCaseLabel: Record<AgentUseCase, string> = {
  sales: 'Sales',
  support: 'Support',
  'lead-qualification': 'Lead Qualification',
  'order-assistance': 'Order Assistance',
  appointments: 'Appointments',
  custom: 'Custom',
};

export const autonomyLabel: Record<AutonomyPreset, string> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  more_autonomous: 'More Autonomous',
};

export const autonomyExplanation: Record<AutonomyPreset, string> = {
  conservative: 'The agent only answers when very confident. Anything uncertain is handed over to a human.',
  balanced: 'The agent answers routine questions on its own and hands over anything unclear or sensitive.',
  more_autonomous: 'The agent handles most routine conversation independently, escalating only restricted topics, sensitive actions and low-confidence cases.',
};

export const knowledgeTypeLabel: Record<KnowledgeSourceType, string> = {
  faq: 'FAQ / Manual entry',
  document: 'Document / PDF',
  spreadsheet: 'Spreadsheet',
  website: 'Approved website page',
};

export const knowledgeStatusLabel: Record<KnowledgeSourceStatus, string> = {
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
  outdated: 'Outdated',
};

export const knowledgeStatusTone: Record<KnowledgeSourceStatus, BadgeTone> = {
  processing: 'info',
  ready: 'success',
  failed: 'danger',
  outdated: 'warning',
};

export const dataAccessLabel: Record<DataAccessScope, string> = {
  'contact-profile': 'Contact profile',
  'conversation-history': 'Conversation history',
  'orders-payments': 'Orders / payments',
  'catalogue-products': 'Catalogue / products',
  'calling-context': 'Calling context',
};

export const maskingLabel: Record<MaskedFieldCategory, string> = {
  'payment-details': 'Payment details',
  'government-id': 'Government ID numbers',
  'personal-address': 'Personal address',
  'internal-notes': 'Internal team notes',
};

export const testCategoryLabel: Record<StandardTestCategory, string> = {
  'approved-faq': 'Approved FAQ answer',
  'unknown-handover': 'Unknown answer → handover',
  'restricted-topic': 'Restricted topic',
  'sensitive-action': 'Sensitive action approval',
  'missing-integration': 'Missing data / integration unavailable',
  'human-request': 'Explicit human request',
  'source-reference': 'Source reference available',
};
