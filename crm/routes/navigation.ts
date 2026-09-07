import {
  Bot,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  PhoneCall,
  ChartNoAxesCombined,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  UsersRound,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleKey } from '@crm/mock-data';

export interface NavItem {
  key: ModuleKey;
  label: string;
  path: string;
  icon: LucideIcon;
  /** Which navigation group the item sits in. */
  group: 'work' | 'engage' | 'sell' | 'manage';
  /** False until the module's own batch has been implemented. */
  implemented: boolean;
  /** Locked in the nav until a WhatsApp number is connected. */
  requiresConnection?: boolean;
  /** Shown on the placeholder screen so reviewers know what the module owns. */
  ownership: string;
}

/**
 * Single source of truth for the left navigation and the placeholder routes in
 * 05_ROUTE_AND_STATE_CONVENTIONS.md. Adding a module means adding one entry.
 */
export const navItems: NavItem[] = [
  /* ---- Work ------------------------------------------------------------- */
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    group: 'work',
    implemented: true,
    ownership:
      'Operational control centre: business health, work requiring attention and cross-module summaries with drill-down to exact records.',
  },
  {
    key: 'inbox',
    label: 'Inbox',
    path: '/inbox',
    icon: MessageSquare,
    group: 'work',
    implemented: true,
    requiresConnection: true,
    ownership:
      'Shared conversation workspace: ownership, reply workflow, labels, notes, handoff, customer context and response-window guidance.',
  },
  {
    key: 'contacts',
    label: 'Contacts & Leads',
    path: '/contacts',
    icon: Users,
    group: 'work',
    implemented: true,
    ownership:
      'Canonical customer identity, classification, consent, source, segmentation, ownership, data quality and Customer 360.',
  },
  {
    key: 'calling',
    label: 'Calling',
    path: '/calling',
    icon: PhoneCall,
    group: 'work',
    implemented: true,
    requiresConnection: true,
    ownership:
      'Call queues, call preparation, outcomes, follow-ups, call history and telephony integration.',
  },
  /* ---- Engage ----------------------------------------------------------- */
  {
    key: 'campaigns',
    label: 'Campaigns',
    path: '/campaigns',
    icon: Megaphone,
    group: 'engage',
    implemented: true,
    requiresConnection: true,
    ownership:
      'Audience selection, personalization, scheduling, send progress, recipient results and follow-up/retargeting.',
  },
  {
    key: 'templates',
    label: 'Templates',
    path: '/templates',
    icon: FileText,
    group: 'engage',
    implemented: true,
    requiresConnection: true,
    ownership:
      'WhatsApp template repository, guided creation, validation, Meta approval/sync and template governance.',
  },
  {
    key: 'automation',
    label: 'Automations',
    path: '/automation',
    icon: Bot,
    group: 'engage',
    implemented: true,
    requiresConnection: true,
    ownership:
      'Trigger-driven workflows, conditions, delays, data collection, actions, human handoff, testing and monitoring.',
  },
  {
    key: 'ai-assistance',
    label: 'AI Agents',
    path: '/ai-agents',
    icon: Sparkles,
    group: 'engage',
    implemented: true,
    requiresConnection: true,
    ownership:
      'Configure AI agent role, knowledge, permissions and safety boundaries; test before activation; audit and control usage/cost.',
  },
  /* ---- Sell ------------------------------------------------------------- */
  {
    key: 'catalogue-orders',
    label: 'Catalogue & Orders',
    path: '/catalogue-orders',
    icon: ShoppingBag,
    group: 'sell',
    implemented: true,
    requiresConnection: true,
    ownership:
      'Product catalogue, product sharing, cart/checkout, payment, order status, returns and commerce analytics.',
  },
  /* ---- Manage ----------------------------------------------------------- */
  {
    key: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: ChartNoAxesCombined,
    group: 'manage',
    implemented: true,
    ownership:
      'Advanced historical, cross-module, scheduled and exportable analytics beyond module-local reporting.',
  },
  {
    key: 'team-access',
    label: 'Team & Access',
    path: '/team-access',
    icon: UsersRound,
    group: 'manage',
    implemented: true,
    ownership:
      'Users, teams, roles, permissions, WhatsApp-number access, workload/availability, assignment, handover and audit.',
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    group: 'manage',
    implemented: true,
    ownership:
      'Workspace configuration, connected numbers, integrations, shared masters, permissions and defaults.',
  },
  {
    key: 'billing',
    label: 'Billing',
    path: '/billing',
    icon: CreditCard,
    group: 'manage',
    implemented: true,
    ownership: 'Plan, usage, conversation charges, invoices and payment methods.',
  },
];

export const navGroups: { key: NavItem['group']; label: string }[] = [
  { key: 'work', label: 'Work' },
  { key: 'engage', label: 'Engage' },
  { key: 'sell', label: 'Sell' },
  { key: 'manage', label: 'Manage' },
];

export function findNavItem(key: ModuleKey): NavItem | undefined {
  return navItems.find((item) => item.key === key);
}
