import type { RoleKey } from '@crm/mock-data';

/**
 * Role presets for the Dashboard (DASHBOARD_GENERATION_SPEC.md §9). The
 * prototype's role model has three roles — Team Lead uses the Manager preset
 * and Admin uses the Owner preset per §3, so these three cover every case.
 *
 * `hidden` means the capability does not render at all (existence not
 * exposed); a narrower level like `operational` means the section renders
 * without its sensitive/financial figures.
 */
export interface DashboardWidgetPolicy {
  attention: boolean;
  setupChecklist: boolean;
  businessSnapshot: 'full' | 'operational' | 'hidden';
  whatsappHealth: boolean;
  /** `team` shows every assignee; `personal` scopes to the acting user only. */
  salesCalling: 'team' | 'personal';
  campaigns: boolean;
  ordersPayments: 'full' | 'operational' | 'hidden';
  team: boolean;
  automation: boolean;
  trends: boolean;
  aiSummary: boolean;
  usageWarning: boolean;
  quickActions: 'full' | 'personal';
  reassignWork: boolean;
  crossBranchComparison: boolean;
  customise: boolean;
  export: boolean;
}

const ownerPolicy: DashboardWidgetPolicy = {
  attention: true,
  setupChecklist: true,
  businessSnapshot: 'full',
  whatsappHealth: true,
  salesCalling: 'team',
  campaigns: true,
  ordersPayments: 'full',
  team: true,
  automation: true,
  trends: true,
  aiSummary: true,
  usageWarning: true,
  quickActions: 'full',
  reassignWork: true,
  crossBranchComparison: true,
  customise: true,
  export: true,
};

const managerPolicy: DashboardWidgetPolicy = {
  ...ownerPolicy,
  businessSnapshot: 'operational',
  ordersPayments: 'operational',
  usageWarning: false,
  crossBranchComparison: false,
};

const agentPolicy: DashboardWidgetPolicy = {
  attention: true,
  setupChecklist: false,
  businessSnapshot: 'hidden',
  whatsappHealth: false,
  salesCalling: 'personal',
  campaigns: false,
  ordersPayments: 'hidden',
  team: false,
  automation: false,
  trends: false,
  aiSummary: false,
  usageWarning: false,
  quickActions: 'personal',
  reassignWork: false,
  crossBranchComparison: false,
  customise: false,
  export: false,
};

export function widgetPolicyFor(role: RoleKey): DashboardWidgetPolicy {
  if (role === 'owner') return ownerPolicy;
  if (role === 'manager') return managerPolicy;
  return agentPolicy;
}
