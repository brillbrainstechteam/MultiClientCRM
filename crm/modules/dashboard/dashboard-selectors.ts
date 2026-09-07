import {
  activityFeed,
  automationHealth,
  branchMetrics,
  branchName as branchLabel,
  contacts,
  continueWorkItems,
  dashboardAlerts,
  dashboardAutomations,
  dashboardCampaigns,
  findBranchMetric,
  findNumberMetric,
  findPersonalMetric,
  findUser,
  findWhatsAppNumber,
  numbersForBranch,
  periodMultiplier,
  teamWorkload,
  type ActivityFeedItem,
  type Automation,
  type AutomationHealthRow,
  type BranchMetric,
  type Campaign,
  type Contact,
  type ContinueWorkItem,
  type DashboardAlert,
  type DateRange,
  type DashboardSeverity,
  type TeamWorkloadRow,
  type WhatsAppNumber,
} from '@crm/mock-data';

/**
 * Pure, deterministic read models over the Dashboard fixtures, scoped by
 * branch/WhatsApp number the same way `contact-selectors.ts` scopes Contacts.
 * Screens and widgets call these instead of filtering inline so every surface
 * (Overview, Alerts, drawers) stays consistent.
 */
export interface DashboardScope {
  branchId?: string | null;
  whatsappNumberId?: string | null;
}

function inBranchScope(entityBranchId: string | undefined, scope: DashboardScope): boolean {
  if (!scope.branchId || !entityBranchId) return true;
  return entityBranchId === scope.branchId;
}

function inNumberScope(entityNumberId: string | undefined, scope: DashboardScope): boolean {
  if (!scope.whatsappNumberId || !entityNumberId) return true;
  return entityNumberId === scope.whatsappNumberId;
}

/* ------------------------------------------------------------------------- */
/* Alerts (DASH-S01 Attention section, DASH-S02, DASH-S03)                    */
/* ------------------------------------------------------------------------- */

/** Session-local acknowledge/dismiss/resolve overrides, keyed by alert id. */
export type AlertStatusOverrides = Record<string, DashboardAlert['status']>;

function effectiveStatus(alert: DashboardAlert, overrides: AlertStatusOverrides): DashboardAlert['status'] {
  return overrides[alert.id] ?? alert.status;
}

export function scopedAlerts(
  scope: DashboardScope,
  overrides: AlertStatusOverrides = {},
  includeClosed = false,
): DashboardAlert[] {
  return dashboardAlerts.filter(
    (alert) =>
      inBranchScope(alert.branchId, scope) &&
      inNumberScope(alert.whatsappNumberId, scope) &&
      (includeClosed || effectiveStatus(alert, overrides) === 'open'),
  );
}

export function findDashboardAlert(id: string): DashboardAlert | undefined {
  return dashboardAlerts.find((alert) => alert.id === id);
}

export interface AlertFilters {
  severity?: string | null;
  category?: string | null;
  status?: string | null;
}

export function filterAlerts(
  scope: DashboardScope,
  filters: AlertFilters,
  overrides: AlertStatusOverrides = {},
): DashboardAlert[] {
  return dashboardAlerts.filter((alert) => {
    if (!inBranchScope(alert.branchId, scope)) return false;
    if (!inNumberScope(alert.whatsappNumberId, scope)) return false;
    const status = effectiveStatus(alert, overrides);
    if (filters.severity && alert.severity !== filters.severity) return false;
    if (filters.category && alert.category !== filters.category) return false;
    if (filters.status && status !== filters.status) return false;
    if (!filters.status && status === 'dismissed') return false;
    return true;
  });
}

/* ------------------------------------------------------------------------- */
/* WhatsApp health (DASH-S05/S06)                                             */
/*                                                                             */
/* Deliberately no branch/number-only "scopedWhatsAppNumbers" selector here — */
/* number visibility depends on the acting user's `permittedWhatsAppNumberIds`*/
/* and the number's `permittedRoles`, not just branch/number scope. Screens   */
/* must read `availableWhatsAppNumbers` from `useWorkspace()` instead, which  */
/* already applies that permission check.                                    */
/* ------------------------------------------------------------------------- */

export function numberAlerts(numberId: string, overrides: AlertStatusOverrides = {}): DashboardAlert[] {
  return dashboardAlerts.filter(
    (alert) => alert.whatsappNumberId === numberId && effectiveStatus(alert, overrides) === 'open',
  );
}

/* ------------------------------------------------------------------------- */
/* Contacts-derived pipeline figures — Dashboard reads shared Contact fixtures */
/* directly; it does not depend on the Contacts module's own selectors.       */
/* ------------------------------------------------------------------------- */

const STALLED_QUALIFIED_DAYS = 7;
const REFERENCE_NOW = new Date('2026-08-10T09:20:00+05:30').getTime();

function scopedContacts(scope: DashboardScope): Contact[] {
  return contacts.filter(
    (contact) =>
      inBranchScope(contact.branchId, scope) && inNumberScope(contact.primaryWhatsAppNumberId, scope),
  );
}

export function stalledQualifiedLeads(scope: DashboardScope): Contact[] {
  return scopedContacts(scope).filter((contact) => {
    if (contact.stage !== 'qualified') return false;
    const idleDays = (REFERENCE_NOW - new Date(contact.lastActivityAt).getTime()) / (24 * 60 * 60 * 1000);
    return idleDays >= STALLED_QUALIFIED_DAYS;
  });
}

export function highValueCustomers(scope: DashboardScope): Contact[] {
  return scopedContacts(scope).filter(
    (contact) => contact.salesTier === 'platinum' || contact.salesTier === 'gold',
  );
}

export interface PipelineSlice {
  label: string;
  value: number;
  stage: string;
}

export function contactsOwnedBy(userId: string, scope: DashboardScope): Contact[] {
  return scopedContacts(scope).filter((contact) => contact.ownerId === userId);
}

export function pipelineByStage(scope: DashboardScope): PipelineSlice[] {
  const stages: Contact['stage'][] = ['new', 'engaged', 'qualified', 'customer', 'dormant'];
  const scoped = scopedContacts(scope);
  return stages.map((stage) => ({
    label: stage.charAt(0).toUpperCase() + stage.slice(1),
    stage,
    value: scoped.filter((contact) => contact.stage === stage).length,
  }));
}

/* ------------------------------------------------------------------------- */
/* Team workload (DASH-S01 §7 row 8, DASH-S15)                                */
/* ------------------------------------------------------------------------- */

export function scopedTeamWorkload(scope: DashboardScope): TeamWorkloadRow[] {
  return teamWorkload.filter((row) => {
    const user = findUser(row.userId);
    return user ? inBranchScope(user.branchId, scope) : true;
  });
}

export function overloadedUsers(scope: DashboardScope): TeamWorkloadRow[] {
  return scopedTeamWorkload(scope).filter((row) => row.status === 'overloaded');
}

export function inactiveUsersWithPendingWork(scope: DashboardScope): TeamWorkloadRow[] {
  return scopedTeamWorkload(scope).filter((row) => row.status === 'inactive' && row.openCount > 0);
}

export function personalWorkload(userId: string): TeamWorkloadRow | undefined {
  return teamWorkload.find((row) => row.userId === userId);
}

/* ------------------------------------------------------------------------- */
/* Campaigns (DASH-S01 §7 row 7)                                              */
/* ------------------------------------------------------------------------- */

export function scopedCampaigns(scope: DashboardScope): Campaign[] {
  return dashboardCampaigns.filter((campaign) => {
    const number = findWhatsAppNumber(campaign.whatsappNumberId);
    return (
      inNumberScope(campaign.whatsappNumberId, scope) && inBranchScope(number?.branchId, scope)
    );
  });
}

/* ------------------------------------------------------------------------- */
/* Automation health (DASH-S01 §7 row 9)                                      */
/* ------------------------------------------------------------------------- */

export function scopedAutomations(scope: DashboardScope): { automation: Automation; health: AutomationHealthRow }[] {
  return dashboardAutomations
    .filter((automation) => inBranchScope(automation.scope.branchId, scope))
    .map((automation) => ({
      automation,
      health: automationHealth.find((row) => row.automationId === automation.id) ?? {
        automationId: automation.id,
        stuckCount: 0,
        stuckSinceHours: 0,
        integrationOk: true,
      },
    }));
}

/* ------------------------------------------------------------------------- */
/* Activity + Continue Work (DASH-S11, DASH-S01 §7 row 12)                    */
/* ------------------------------------------------------------------------- */

export function scopedActivity(ownerId?: string): ActivityFeedItem[] {
  const feed = ownerId ? activityFeed.filter((item) => item.actorId === ownerId) : activityFeed;
  return [...feed].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function scopedContinueWork(ownerId?: string): ContinueWorkItem[] {
  const items = ownerId ? continueWorkItems.filter((item) => item.ownerId === ownerId) : continueWorkItems;
  return [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/* ------------------------------------------------------------------------- */
/* Redesigned Dashboard read models (KPIs, branch performance, number health, */
/* today's work, priority alerts). All honour branch/number scope + date      */
/* range so every surface updates together when a filter changes.             */
/* ------------------------------------------------------------------------- */

const scale = (value: number, range: DateRange) => Math.round(value * periodMultiplier(range));

/** Branch ids in scope: the scoped branch, else every allowed branch. A scoped */
/** WhatsApp number narrows to that number's branch so aggregates reflect it.   */
export function scopedBranchIds(allowedBranchIds: string[], scope: DashboardScope): string[] {
  if (scope.whatsappNumberId) {
    const number = findWhatsAppNumber(scope.whatsappNumberId);
    if (number) return allowedBranchIds.filter((id) => id === number.branchId);
  }
  if (scope.branchId) return allowedBranchIds.filter((id) => id === scope.branchId);
  return allowedBranchIds;
}

export type KpiKey = 'newEnquiries' | 'pendingReplies' | 'overdueFollowups' | 'converted';

export interface DashboardKpi {
  key: KpiKey;
  label: string;
  value: number;
  delta: number;
  /** Whether an increase is good (leads/converted) or bad (pending/overdue). */
  goodDirection: 'up' | 'down';
  to: string;
}

const kpiMeta: Record<KpiKey, { label: string; goodDirection: 'up' | 'down'; to: string }> = {
  newEnquiries: { label: 'New enquiries', goodDirection: 'up', to: '/contacts/all?stage=new&returnTo=%2Fdashboard' },
  pendingReplies: { label: 'Awaiting team reply', goodDirection: 'down', to: '/inbox?status=pending&returnTo=%2Fdashboard' },
  overdueFollowups: { label: 'Overdue follow-ups', goodDirection: 'down', to: '/calling?status=overdue&returnTo=%2Fdashboard' },
  converted: { label: 'Converted', goodDirection: 'up', to: '/contacts/all?stage=customer&returnTo=%2Fdashboard' },
};

/** Owner/manager KPIs, aggregated across scoped branches and scaled by range. */
export function dashboardKpis(branchIds: string[], range: DateRange): DashboardKpi[] {
  const rows = branchMetrics.filter((m) => branchIds.includes(m.branchId));
  const sum = (pick: (m: BranchMetric) => number) => rows.reduce((total, m) => total + pick(m), 0);
  const keys: KpiKey[] = ['newEnquiries', 'pendingReplies', 'overdueFollowups', 'converted'];
  return keys.map((key) => {
    const current = scale(sum((m) => m[key]), range);
    const previous = scale(sum((m) => m.previous[key]), range);
    return { key, ...kpiMeta[key], value: current, delta: current - previous };
  });
}

/** Executive/agent KPIs — the acting user's own figures. */
export function personalKpis(userId: string, range: DateRange): DashboardKpi[] {
  const p = findPersonalMetric(userId);
  const base = p ?? {
    assignedEnquiries: 0,
    pendingReplies: 0,
    overdue: 0,
    converted: 0,
    followupsDue: 0,
    previous: { assignedEnquiries: 0, pendingReplies: 0, overdue: 0, converted: 0 },
  };
  const mk = (key: KpiKey, label: string, value: number, prev: number, goodDirection: 'up' | 'down', to: string): DashboardKpi => ({
    key,
    label,
    value: scale(value, range),
    delta: scale(value, range) - scale(prev, range),
    goodDirection,
    to,
  });
  return [
    mk('newEnquiries', 'My assigned enquiries', base.assignedEnquiries, base.previous.assignedEnquiries, 'up', '/contacts/all?owner=me&returnTo=%2Fdashboard'),
    mk('pendingReplies', 'My pending replies', base.pendingReplies, base.previous.pendingReplies, 'down', '/inbox?assignee=me&status=pending&returnTo=%2Fdashboard'),
    mk('overdueFollowups', 'My overdue work', base.overdue, base.previous.overdue, 'down', '/calling?assignee=me&status=overdue&returnTo=%2Fdashboard'),
    mk('converted', 'My conversions', base.converted, base.previous.converted, 'up', '/contacts/all?owner=me&stage=customer&returnTo=%2Fdashboard'),
  ];
}

export type BranchHealth = 'healthy' | 'attention' | 'critical';

export interface BranchPerformanceRow {
  branchId: string;
  branchName: string;
  newEnquiries: number;
  pendingReplies: number;
  overdueFollowups: number;
  converted: number;
  conversionRate: number;
  health: BranchHealth;
}

function branchHealth(branchId: string, overdue: number, newEnquiries: number): BranchHealth {
  const numbers = numbersForBranch(branchId);
  if (numbers.some((n) => n.connectionStatus === 'disconnected')) return 'critical';
  const overdueRatio = newEnquiries === 0 ? 0 : overdue / newEnquiries;
  if (numbers.some((n) => n.connectionStatus === 'degraded' || n.qualityRating === 'low') || overdueRatio > 0.06) {
    return 'attention';
  }
  return 'healthy';
}

export function branchPerformanceRows(branchIds: string[], range: DateRange): BranchPerformanceRow[] {
  return branchIds
    .map((branchId) => findBranchMetric(branchId))
    .filter((m): m is BranchMetric => Boolean(m))
    .map((m) => {
      const newEnquiries = scale(m.newEnquiries, range);
      const converted = scale(m.converted, range);
      const overdueFollowups = scale(m.overdueFollowups, range);
      return {
        branchId: m.branchId,
        branchName: branchLabel(m.branchId),
        newEnquiries,
        pendingReplies: scale(m.pendingReplies, range),
        overdueFollowups,
        converted,
        conversionRate: newEnquiries === 0 ? 0 : Math.round((converted / newEnquiries) * 100),
        health: branchHealth(m.branchId, m.overdueFollowups, m.newEnquiries),
      };
    });
}

export interface TodaysWork {
  awaitingReply: number;
  followupsToComplete: number;
  unassigned: number;
}

export function todaysWork(branchIds: string[], range: DateRange): TodaysWork {
  const rows = branchMetrics.filter((m) => branchIds.includes(m.branchId));
  const sum = (pick: (m: BranchMetric) => number) => rows.reduce((t, m) => t + pick(m), 0);
  return {
    awaitingReply: scale(sum((m) => m.pendingReplies), range),
    followupsToComplete: scale(sum((m) => m.overdueFollowups), range),
    unassigned: scale(sum((m) => m.unassigned), range),
  };
}

export interface NumberHealthRow {
  number: WhatsAppNumber;
  awaitingReply: number;
  overdueFollowups: number;
}

/** Number-health rows for the numbers a role may see, honouring scope. */
export function numberHealthRows(
  numbers: WhatsAppNumber[],
  scope: DashboardScope,
  range: DateRange,
): NumberHealthRow[] {
  return numbers
    .filter((n) => !scope.whatsappNumberId || n.id === scope.whatsappNumberId)
    .filter((n) => !scope.branchId || n.branchId === scope.branchId)
    .map((number) => {
      const m = findNumberMetric(number.id);
      return {
        number,
        awaitingReply: scale(m?.awaitingReply ?? 0, range),
        overdueFollowups: scale(m?.overdueFollowups ?? 0, range),
      };
    });
}

/* ---- Priority alerts (compact Needs-attention, max 4, combined) ---------- */

const severityRank: Record<DashboardSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const categoryRank: Record<string, number> = {
  whatsapp: 0,
  inbox: 1,
  payments: 2,
  orders: 3,
  campaign: 4,
  automation: 5,
  team: 6,
};

export interface PriorityAlert {
  id: string;
  title: string;
  affectedEntity: string;
  count: number;
  severity: DashboardSeverity;
  category: DashboardAlert['category'];
  ctaLabel: string;
  ctaTo: string;
  alertIds: string[];
}

/**
 * Curated priority alerts for the compact Needs-attention section: open alerts
 * in scope, grouped by title (so the same issue across branches becomes one
 * combined row), ordered WhatsApp → Inbox → commerce → growth, capped at 4.
 */
export function priorityAlerts(
  scope: DashboardScope,
  overrides: AlertStatusOverrides = {},
  limit = 4,
): PriorityAlert[] {
  const open = dashboardAlerts.filter(
    (a) =>
      inBranchScope(a.branchId, scope) &&
      inNumberScope(a.whatsappNumberId, scope) &&
      effectiveStatus(a, overrides) === 'open' &&
      a.count > 0,
  );

  const groups = new Map<string, DashboardAlert[]>();
  for (const alert of open) {
    const key = alert.title;
    groups.set(key, [...(groups.get(key) ?? []), alert]);
  }

  const combined: PriorityAlert[] = [...groups.values()].map((alerts) => {
    const primary = [...alerts].sort((a, b) => severityRank[a.severity] - severityRank[b.severity])[0];
    const totalCount = alerts.reduce((t, a) => t + a.count, 0);
    const affectedEntity =
      alerts.length > 1 ? `${alerts.length} areas affected` : primary.affectedEntity;
    return {
      id: primary.id,
      title: primary.title,
      affectedEntity,
      count: totalCount,
      severity: primary.severity,
      category: primary.category,
      ctaLabel: primary.ctaLabel,
      ctaTo: primary.ctaTo,
      alertIds: alerts.map((a) => a.id),
    };
  });

  return combined
    .sort((a, b) => {
      const cat = (categoryRankFor(a) - categoryRankFor(b));
      if (cat !== 0) return cat;
      return severityRank[a.severity] - severityRank[b.severity];
    })
    .slice(0, limit);
}

function categoryRankFor(alert: PriorityAlert): number {
  const source = dashboardAlerts.find((a) => a.id === alert.id);
  return source ? categoryRank[source.category] ?? 9 : 9;
}

export function openAlertCount(scope: DashboardScope, overrides: AlertStatusOverrides = {}): number {
  return scopedAlerts(scope, overrides).length;
}
