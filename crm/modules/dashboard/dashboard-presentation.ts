import {
  Bot,
  ChartNoAxesCombined,
  CreditCard,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  PhoneCall,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  AlertCategory,
  DashboardSeverity,
  ModuleKey,
  WhatsAppConnectionStatus,
  WhatsAppQualityRating,
  WorkloadStatus,
} from '@crm/mock-data';
import type { AttentionTone } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';

export const alertCategoryIcon: Record<AlertCategory, LucideIcon> = {
  inbox: MessageSquare,
  whatsapp: PhoneCall,
  orders: ShoppingBag,
  payments: CreditCard,
  campaign: Megaphone,
  automation: Bot,
  team: UsersRound,
};

export const alertCategoryLabel: Record<AlertCategory, string> = {
  inbox: 'Inbox',
  whatsapp: 'WhatsApp',
  orders: 'Orders',
  payments: 'Payments',
  campaign: 'Campaigns',
  automation: 'Automation',
  team: 'Team',
};

/** Attention card only distinguishes warn/danger/neutral — map full severity onto it. */
export function severityToAttentionTone(severity: DashboardSeverity): AttentionTone {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warn';
  return 'neutral';
}

export function severityToBadgeTone(severity: DashboardSeverity): BadgeTone {
  if (severity === 'critical') return 'danger';
  if (severity === 'high') return 'warning';
  if (severity === 'medium') return 'info';
  return 'neutral';
}

export const workloadStatusTone: Record<WorkloadStatus, BadgeTone> = {
  overloaded: 'danger',
  inactive: 'warning',
  normal: 'success',
};

export const workloadStatusLabel: Record<WorkloadStatus, string> = {
  overloaded: 'Overloaded',
  inactive: 'Inactive',
  normal: 'Normal',
};

export const connectionTone: Record<WhatsAppConnectionStatus, BadgeTone> = {
  connected: 'success',
  degraded: 'warning',
  disconnected: 'danger',
};

export const connectionLabel: Record<WhatsAppConnectionStatus, string> = {
  connected: 'Connected',
  degraded: 'Degraded',
  disconnected: 'Disconnected',
};

export const qualityTone: Record<WhatsAppQualityRating, BadgeTone> = {
  high: 'success',
  medium: 'info',
  low: 'warning',
  unrated: 'neutral',
};

export const qualityLabel: Record<WhatsAppQualityRating, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unrated: 'Unrated',
};

export const moduleIcon: Record<ModuleKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  contacts: Users,
  inbox: MessageSquare,
  calling: PhoneCall,
  templates: FileText,
  campaigns: Megaphone,
  automation: Bot,
  'catalogue-orders': ShoppingBag,
  'team-access': UsersRound,
  'ai-assistance': Sparkles,
  reports: ChartNoAxesCombined,
  settings: Settings,
  billing: CreditCard,
};

export const moduleLabel: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  contacts: 'Contacts',
  inbox: 'Inbox',
  calling: 'Calling',
  templates: 'Templates',
  campaigns: 'Campaigns',
  automation: 'Automation',
  'catalogue-orders': 'Catalogue & Orders',
  'team-access': 'Team & Access',
  'ai-assistance': 'AI Agents',
  reports: 'Reports',
  settings: 'Settings',
  billing: 'Billing',
};

export function formatRelativeTime(iso: string, referenceIso: string): string {
  const diffMs = new Date(referenceIso).getTime() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
