/**
 * Cross-module reference fixtures Automation reads but does not own
 * (CODE_FIRST_ADAPTER.md §9). Contacts/Templates already exist as real
 * modules and are referenced directly; Campaigns and AI Agents are not built
 * yet, so their pickers use a small local placeholder list scoped to this
 * module until those modules ship (CLAUDE.md §8).
 */

export interface AiAgentRef {
  id: string;
  name: string;
  purpose: string;
}

export const aiAgents: AiAgentRef[] = [
  { id: 'agent_sales_qualifier', name: 'Sales Qualifier', purpose: 'Qualifies inbound leads and captures requirements' },
  { id: 'agent_support_concierge', name: 'Support Concierge', purpose: 'Answers common support questions from the knowledge base' },
  { id: 'agent_order_assistant', name: 'Order Assistant', purpose: 'Helps customers track orders and dispatch status' },
];

export interface CampaignRef {
  id: string;
  name: string;
}

export const campaignsRef: CampaignRef[] = [
  { id: 'campaign_festive_2026', name: 'Festive Collection Launch — 2026' },
  { id: 'campaign_winback_dormant', name: 'Win-back — Dormant Customers' },
  { id: 'campaign_new_catalogue', name: 'New Catalogue Announcement' },
];

export const contactFieldOptions: { key: string; label: string }[] = [
  { key: 'company', label: 'Company' },
  { key: 'city', label: 'City' },
  { key: 'email', label: 'Email' },
  { key: 'source', label: 'Source' },
  { key: 'salesTier', label: 'Sales tier' },
];

export const tagOptions: string[] = [
  'bulk-buyer',
  'festive-2026',
  'repeat',
  'premium',
  'project-enquiry',
  'inbound',
  'lapsed',
  'quotation-requested',
  'appointment-booked',
  'payment-pending',
  'feedback-negative',
];

export const stageOptions: { key: string; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'engaged', label: 'Engaged' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'customer', label: 'Customer' },
  { key: 'dormant', label: 'Dormant' },
];

export const priorityOptions: { key: string; label: string }[] = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
];
