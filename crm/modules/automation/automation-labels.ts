import type { BadgeTone } from '@crm/design-system';
import type {
  AdvancedNodeType,
  CoreNodeType,
  FlowStatus,
  QuestionAnswerType,
  SimpleBranchMode,
  TriggerType,
} from './domain/types';

export const statusLabel: Record<FlowStatus, string> = {
  draft: 'Draft',
  testing: 'Testing',
  live: 'Live',
  paused: 'Paused',
  inactive: 'Inactive',
};

export const statusTone: Record<FlowStatus, BadgeTone> = {
  draft: 'neutral',
  testing: 'info',
  live: 'success',
  paused: 'warning',
  inactive: 'neutral',
};

export const categoryLabel: Record<string, string> = {
  'lead-capture': 'Lead Capture & Qualification',
  'catalogue-quotation': 'Catalogue / Quotation Request',
  'appointment-registration': 'Appointment / Event Registration',
  'order-payment': 'Order Confirmation & Payment Reminder',
  'dispatch-delivery': 'Dispatch / Delivery Update',
  'feedback-escalation': 'Feedback & Support Escalation',
  minimal: 'Minimal Flow',
};

export const coreNodeLabel: Record<CoreNodeType, string> = {
  send_message: 'Send Message',
  question: 'Ask Question',
  simple_branch: 'Simple Branch',
  delay_wait: 'Delay / Wait',
  update_contact: 'Update Contact',
  human_handover: 'Human Handover',
  ai_agent_handoff: 'Hand off to AI Agent',
  end: 'End',
};

export const advancedNodeLabel: Record<AdvancedNodeType, string> = {
  api_call: 'API Call',
  webhook: 'Webhook',
  external_integration: 'External Integration',
  advanced_condition: 'Advanced Condition',
  random_split: 'Random Split',
  commerce_action: 'Commerce Action',
};

export const nodeLabel: Record<CoreNodeType | AdvancedNodeType, string> = {
  ...coreNodeLabel,
  ...advancedNodeLabel,
};

export const triggerTypeLabel: Record<TriggerType, string> = {
  customer_message: 'Customer message / first message',
  keyword: 'Keyword / phrase',
  campaign_reply: 'Campaign reply / button',
  contact_created: 'Contact created',
  field_change: 'Tag / stage / field change',
  date: 'Date / relative to contact date',
  sheets_row: 'Google Sheets row',
  external_api: 'External CRM / API',
  ecommerce_event: 'Ecommerce / payment event',
  ad_integration: 'Click-to-WhatsApp ad',
};

export const answerTypeLabel: Record<QuestionAnswerType, string> = {
  open_text: 'Open text',
  single_select: 'Single select',
  multi_select: 'Multi-select',
  name: 'Name',
  phone: 'Phone number',
  email: 'Email',
  date: 'Date',
  location: 'Location',
  business_requirement: 'Business requirement',
};

export const branchModeLabel: Record<SimpleBranchMode, string> = {
  answer_option: 'Selected answer',
  reply_no_reply: 'Reply vs no reply',
  field_tag_equality: 'Field/tag equality',
};

export const testedLabel = (testedAt: string | null, changedSinceTest: boolean): string => {
  if (!testedAt) return 'Not tested';
  if (changedSinceTest) return 'Changed since test';
  return 'Tested';
};

export const testedTone = (testedAt: string | null, changedSinceTest: boolean): BadgeTone => {
  if (!testedAt) return 'neutral';
  if (changedSinceTest) return 'warning';
  return 'success';
};
