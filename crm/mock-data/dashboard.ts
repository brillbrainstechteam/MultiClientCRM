import type {
  ActivityFeedItem,
  AiInsightItem,
  Automation,
  AutomationHealthRow,
  BusinessSnapshot,
  Campaign,
  CommerceSnapshot,
  ContinueWorkItem,
  DashboardAlert,
  InboxSnapshot,
  SetupStep,
  TeamWorkloadRow,
  TrendSeries,
  UsageWarning,
} from './types';

/**
 * Dashboard-owned fixtures (DASHBOARD_GENERATION_SPEC.md §7.1). Dashboard
 * surfaces problems owned by other modules, so a few lightweight Campaign and
 * Automation sample records live here rather than waiting for those modules'
 * own batches — they exist only to make the summary widgets realistic and are
 * not the canonical fixture set those modules will introduce later.
 *
 * "Now" for every relative/derived figure is fixed so captures are reproducible.
 */
export const DASHBOARD_REFERENCE_NOW = '2026-08-10T09:20:00+05:30';

/* ------------------------------------------------------------------------- */
/* Alerts — DASH-S02/S03                                                      */
/* ------------------------------------------------------------------------- */

export const dashboardAlerts: DashboardAlert[] = [
  {
    id: 'alert_wa_mumbai_quality',
    severity: 'high',
    category: 'whatsapp',
    title: 'WhatsApp quality declining',
    description:
      'Northline Sales — Mumbai has dropped to Low quality after a rise in blocks and reports this week.',
    count: 1,
    affectedEntity: 'Northline Sales — Mumbai',
    branchId: 'branch_mumbai',
    whatsappNumberId: 'wa_mumbai_sales',
    detectedAt: '2026-08-10T06:05:00+05:30',
    status: 'open',
    dismissible: false,
    resolvable: false,
    businessImpact:
      'Meta may further restrict the messaging limit if quality keeps falling, reducing outbound capacity for Mumbai Sales.',
    recommendedAction: 'Review recent campaign content and pause any broad, low-relevance sends on this number.',
    ctaLabel: 'Open number health',
    ctaTo: '/dashboard?drawer=wa-health&whatsappNumberId=wa_mumbai_sales',
  },
  {
    id: 'alert_wa_bengaluru_disconnected',
    severity: 'critical',
    category: 'whatsapp',
    title: 'WhatsApp number disconnected',
    description: 'Northline Service — Bengaluru lost its connection to Meta and is not sending or receiving messages.',
    count: 1,
    affectedEntity: 'Northline Service — Bengaluru',
    branchId: 'branch_bengaluru',
    whatsappNumberId: 'wa_bengaluru_service',
    detectedAt: '2026-08-10T04:40:00+05:30',
    status: 'open',
    dismissible: false,
    resolvable: false,
    businessImpact: 'All Bengaluru Service conversations are unreachable on WhatsApp until reconnected.',
    recommendedAction: 'Reconnect the number from WhatsApp Accounts settings.',
    ctaLabel: 'Fix in Settings',
    ctaTo: '/settings/whatsapp/numbers/wa_bengaluru_service',
  },
  {
    id: 'alert_unassigned_chats',
    severity: 'high',
    category: 'inbox',
    title: 'Unassigned conversations building up',
    description: '23 conversations across Delhi and Mumbai have no assigned owner.',
    count: 23,
    affectedEntity: '23 conversations',
    detectedAt: '2026-08-10T08:15:00+05:30',
    status: 'open',
    dismissible: true,
    resolvable: true,
    businessImpact: 'Unassigned chats risk missing the response-window and losing warm leads.',
    recommendedAction: 'Bulk-assign to available agents or open the reassignment tool.',
    ctaLabel: 'View unassigned',
    ctaTo: '/inbox?status=unassigned&returnTo=%2Fdashboard',
  },
  {
    id: 'alert_overdue_followups',
    severity: 'medium',
    category: 'inbox',
    title: 'Overdue follow-ups',
    description: '8 scheduled follow-up calls are past their due time.',
    count: 8,
    affectedEntity: '8 follow-ups',
    detectedAt: '2026-08-10T07:00:00+05:30',
    status: 'open',
    dismissible: true,
    resolvable: true,
    businessImpact: 'Delayed follow-up reduces conversion on qualified leads.',
    recommendedAction: 'Reassign or reschedule from the calling worklist.',
    ctaLabel: 'View follow-ups',
    ctaTo: '/calling?status=overdue&returnTo=%2Fdashboard',
  },
  {
    id: 'alert_delayed_orders',
    severity: 'medium',
    category: 'orders',
    title: 'Delayed orders',
    description: '4 orders have exceeded their fulfilment SLA.',
    count: 4,
    affectedEntity: '4 orders',
    detectedAt: '2026-08-09T18:30:00+05:30',
    status: 'open',
    dismissible: true,
    resolvable: true,
    businessImpact: 'Customers may cancel or raise support requests if fulfilment slips further.',
    recommendedAction: 'Review affected orders and update fulfilment status.',
    ctaLabel: 'View delayed orders',
    ctaTo: '/catalogue-orders?status=delayed&returnTo=%2Fdashboard',
  },
  {
    id: 'alert_payment_failures',
    severity: 'medium',
    category: 'payments',
    title: 'Payment collection issues',
    description: '6 orders have a failed or pending payment link older than 24 hours.',
    count: 6,
    affectedEntity: '6 orders',
    detectedAt: '2026-08-09T21:10:00+05:30',
    status: 'open',
    dismissible: true,
    resolvable: true,
    businessImpact: 'Revenue is held up until payment is retried or collected another way.',
    recommendedAction: 'Resend payment links or contact the customer directly.',
    ctaLabel: 'View payments',
    ctaTo: '/catalogue-orders?tab=payments&status=pending&returnTo=%2Fdashboard',
  },
  {
    id: 'alert_campaign_festive_failed',
    severity: 'high',
    category: 'campaign',
    title: 'Campaign delivery failure',
    description: '"Festive Launch" failed for 17% of recipients — mostly invalid/expired numbers.',
    count: 17,
    affectedEntity: 'Festive Launch',
    detectedAt: '2026-08-09T15:00:00+05:30',
    status: 'open',
    dismissible: true,
    resolvable: true,
    businessImpact: '~340 recipients on the festive audience were not reached.',
    recommendedAction: 'Review the failed-recipient report and clean the segment before resending.',
    ctaLabel: 'View campaign',
    ctaTo: '/campaigns/camp_festive_launch?tab=results&returnTo=%2Fdashboard',
  },
  {
    id: 'alert_automation_stuck',
    severity: 'high',
    category: 'automation',
    title: 'Customers stuck in automation',
    description: '"Payment Reminder" has 17 customers stuck at a step for more than 6 hours.',
    count: 17,
    affectedEntity: 'Payment Reminder',
    detectedAt: '2026-08-10T02:20:00+05:30',
    status: 'open',
    dismissible: true,
    resolvable: true,
    businessImpact: 'Reminder messages are not progressing, delaying payment collection.',
    recommendedAction: 'Open the automation run log to identify the blocking step.',
    ctaLabel: 'Open automation',
    ctaTo: '/automation/auto_payment_reminder?tab=runs&returnTo=%2Fdashboard',
  },
  {
    id: 'alert_team_overload_resolved',
    severity: 'low',
    category: 'team',
    title: 'Delhi Sales workload back to normal',
    description: 'Open conversation count for Delhi Sales returned below the configured threshold.',
    count: 0,
    affectedEntity: 'Delhi Sales',
    branchId: 'branch_delhi',
    detectedAt: '2026-08-08T11:00:00+05:30',
    status: 'resolved',
    dismissible: true,
    resolvable: false,
    businessImpact: 'No action needed — informational.',
    recommendedAction: 'No action needed.',
    ctaLabel: 'View team workload',
    ctaTo: '/team-access?tab=workload&teamId=team_delhi_sales&returnTo=%2Fdashboard',
  },
];

/* ------------------------------------------------------------------------- */
/* Setup checklist — DASH-S04                                                 */
/* ------------------------------------------------------------------------- */

export const setupSteps: SetupStep[] = [
  { id: 'connect-number', label: 'Connect a WhatsApp number', status: 'complete', to: '/settings/whatsapp' },
  { id: 'verify-business', label: 'Complete Meta business verification', status: 'complete', to: '/settings/whatsapp' },
  { id: 'business-profile', label: 'Set up your business profile', status: 'complete', to: '/settings' },
  {
    id: 'invite-team',
    label: 'Invite your team',
    status: 'incomplete',
    to: '/team-access?drawer=invite&returnTo=%2Fdashboard',
  },
  {
    id: 'set-permissions',
    label: 'Set role permissions',
    status: 'blocked',
    blockedReason: 'Invite your team before assigning permissions.',
    to: '/team-access?tab=roles',
  },
  {
    id: 'create-template',
    label: 'Create your first message template',
    status: 'incomplete',
    to: '/templates?modal=create&returnTo=%2Fdashboard',
  },
  {
    id: 'send-test-message',
    label: 'Send a test message',
    status: 'incomplete',
    to: '/inbox?compose=test&returnTo=%2Fdashboard',
  },
];

export function setupStepsAllComplete(): SetupStep[] {
  return setupSteps.map((step) => ({ ...step, status: 'complete', blockedReason: undefined }));
}

export function setupCompletionPercent(steps: SetupStep[] = setupSteps): number {
  const done = steps.filter((step) => step.status === 'complete').length;
  return Math.round((done / steps.length) * 100);
}

/* ------------------------------------------------------------------------- */
/* Team workload — DASH-S01 §7 row 8                                          */
/* ------------------------------------------------------------------------- */

export const teamWorkload: TeamWorkloadRow[] = [
  { userId: 'user_meera', openCount: 14, overdueCount: 3, unassignedOwnedCount: 0, status: 'overloaded' },
  { userId: 'user_rohan', openCount: 16, overdueCount: 4, unassignedOwnedCount: 0, status: 'overloaded' },
  { userId: 'user_karan', openCount: 12, overdueCount: 2, unassignedOwnedCount: 0, status: 'overloaded' },
  { userId: 'user_farida', openCount: 1, overdueCount: 0, unassignedOwnedCount: 0, status: 'inactive' },
  { userId: 'user_vikram', openCount: 6, overdueCount: 1, unassignedOwnedCount: 0, status: 'normal' },
];

export const unassignedWorkCount = 12;

/** Calling module is not built yet — Dashboard needs one figure for its summary row. */
export const callsDueToday = 11;

/* ------------------------------------------------------------------------- */
/* Campaigns — Dashboard summary sample only                                  */
/* ------------------------------------------------------------------------- */

export const dashboardCampaigns: Campaign[] = [
  {
    id: 'camp_festive_launch',
    name: 'Festive Launch',
    whatsappNumberId: 'wa_delhi_sales',
    templateId: 'tmpl_festive_launch',
    segmentIds: ['seg_festive_audience'],
    status: 'sending',
    schedule: '2026-08-09T10:00:00+05:30',
    performance: { sent: 2000, delivered: 1660, read: 1180, replied: 214 },
  },
  {
    id: 'camp_monsoon_restock',
    name: 'Monsoon Restock Alert',
    whatsappNumberId: 'wa_delhi_sales',
    templateId: 'tmpl_restock_alert',
    segmentIds: ['seg_repeat_buyers'],
    status: 'completed',
    schedule: '2026-08-02T09:30:00+05:30',
    performance: { sent: 860, delivered: 842, read: 690, replied: 133 },
  },
  {
    id: 'camp_new_arrivals',
    name: 'New Arrivals Teaser',
    whatsappNumberId: 'wa_mumbai_sales',
    templateId: 'tmpl_new_arrivals',
    segmentIds: ['seg_mumbai_prospects'],
    status: 'scheduled',
    schedule: '2026-08-12T09:00:00+05:30',
    performance: { sent: 0, delivered: 0, read: 0, replied: 0 },
  },
];

/* ------------------------------------------------------------------------- */
/* Automation — Dashboard summary sample only                                 */
/* ------------------------------------------------------------------------- */

export const dashboardAutomations: Automation[] = [
  {
    id: 'auto_payment_reminder',
    name: 'Payment Reminder',
    status: 'live',
    trigger: 'Order payment pending > 12 hours',
    stepCount: 4,
    ownerId: 'user_vikram',
    scope: { branchId: 'branch_delhi' },
  },
  {
    id: 'auto_welcome_series',
    name: 'Welcome Series',
    status: 'live',
    trigger: 'New contact opts in',
    stepCount: 3,
    ownerId: 'user_anita',
    scope: {},
  },
  {
    id: 'auto_abandoned_cart',
    name: 'Abandoned Cart Nudge',
    status: 'paused',
    trigger: 'Cart inactive > 2 hours',
    stepCount: 2,
    ownerId: 'user_vikram',
    scope: { branchId: 'branch_mumbai' },
  },
];

export const automationHealth: AutomationHealthRow[] = [
  { automationId: 'auto_payment_reminder', stuckCount: 17, stuckSinceHours: 6, integrationOk: true },
  { automationId: 'auto_welcome_series', stuckCount: 0, stuckSinceHours: 0, integrationOk: true },
  { automationId: 'auto_abandoned_cart', stuckCount: 0, stuckSinceHours: 0, integrationOk: true },
];

/* ------------------------------------------------------------------------- */
/* Inbox snapshot — DASH-S01 §7 row 6                                         */
/* ------------------------------------------------------------------------- */

export const inboxSnapshot: InboxSnapshot = {
  unread: 37,
  pendingReply: 19,
  unassigned: 23,
  slaBreach: 5,
};

/* ------------------------------------------------------------------------- */
/* Commerce snapshot — DASH-S01 §7 row 8                                      */
/* ------------------------------------------------------------------------- */

export const commerceSnapshot: CommerceSnapshot = {
  openOrders: 21,
  delayedOrders: 4,
  lowStockCount: 5,
  paymentsCollectedLabel: '₹4.8L',
  paymentsPendingLabel: '₹62,400',
};

/* ------------------------------------------------------------------------- */
/* Business snapshot — DASH-S01 §7 row 5                                      */
/* ------------------------------------------------------------------------- */

export const businessSnapshot: BusinessSnapshot = {
  newLeads: 148,
  newLeadsDelta: 12,
  openConversations: 71,
  openConversationsDelta: -4,
  orders: 36,
  ordersDelta: 8,
  paymentsCollectedLabel: '₹4.8L',
};

/* ------------------------------------------------------------------------- */
/* Trends — DASH-S01 §7 row 10                                                */
/* ------------------------------------------------------------------------- */

export const trendSeries: TrendSeries[] = [
  {
    id: 'trend_new_leads',
    label: 'New leads',
    unit: '',
    points: [14, 18, 16, 22, 19, 27, 32],
    currentTotal: 148,
    previousTotal: 132,
  },
  {
    id: 'trend_open_conversations',
    label: 'Open conversations',
    unit: '',
    points: [68, 72, 75, 71, 69, 73, 71],
    currentTotal: 71,
    previousTotal: 75,
  },
  {
    id: 'trend_orders',
    label: 'Orders',
    unit: '',
    points: [3, 5, 4, 6, 7, 5, 6],
    currentTotal: 36,
    previousTotal: 28,
  },
  {
    id: 'trend_campaign_replies',
    label: 'Campaign replies',
    unit: '',
    points: [40, 38, 35, 30, 28, 25, 22],
    currentTotal: 214,
    previousTotal: 281,
  },
];

/* ------------------------------------------------------------------------- */
/* AI business summary — DASH-S12/S13                                         */
/* ------------------------------------------------------------------------- */

export const aiInsights: AiInsightItem[] = [
  {
    id: 'insight_campaign_replies_down',
    title: 'Campaign replies fell 24% vs previous period',
    changeStatement:
      'Reply rate across active campaigns dropped from 281 to 214 replies week-over-week.',
    possibleDrivers: [
      '"Festive Launch" delivery failures reduced effective reach by 17%.',
      'Two sends went out on the lower-quality Mumbai number.',
    ],
    affectedArea: 'Campaigns · Festive Launch',
    evidence: [
      { label: 'Replies this period', value: '214' },
      { label: 'Replies previous period', value: '281' },
      { label: 'Failed deliveries', value: '340 recipients' },
    ],
    recommendation: 'Clean the failed-recipient list and resend from a high-quality number before the next send.',
    actionLabel: 'View campaign',
    actionTo: '/campaigns/camp_festive_launch?tab=results&returnTo=%2Fdashboard',
    confidence: 'high',
  },
  {
    id: 'insight_stalled_leads_rising',
    title: 'Stalled qualified leads increased in Delhi Sales',
    changeStatement: 'Contacts idle 7+ days at the Qualified stage grew from 9 to 15 this week.',
    possibleDrivers: [
      'Overdue follow-ups are up to 8, concentrated with two agents.',
      'No outbound activity recorded on 6 of these contacts in the last 5 days.',
    ],
    affectedArea: 'Contacts · Delhi Sales pipeline',
    evidence: [
      { label: 'Stalled qualified leads', value: '15' },
      { label: 'Overdue follow-ups', value: '8' },
    ],
    recommendation: 'Reassign the oldest stalled leads to an agent with lower open-conversation load.',
    actionLabel: 'View team workload',
    actionTo: '/team-access?tab=workload&teamId=team_delhi_sales&returnTo=%2Fdashboard',
    confidence: 'medium',
  },
  {
    id: 'insight_wa_quality_risk',
    title: 'Mumbai Sales number is at risk of a further messaging limit cut',
    changeStatement: 'Quality rating moved from Medium to Low over the last 3 days.',
    possibleDrivers: [
      'Block rate on this number rose after the last broad campaign send.',
      'No template/content review has run on this number in over a month.',
    ],
    affectedArea: 'WhatsApp Health · Mumbai Sales',
    evidence: [
      { label: 'Current quality', value: 'Low' },
      { label: 'Messaging limit', value: '1K / 24h' },
    ],
    recommendation: 'Pause broad campaign sends on this number until quality recovers.',
    actionLabel: 'Open number health',
    actionTo: '/dashboard?drawer=wa-health&whatsappNumberId=wa_mumbai_sales',
    confidence: 'high',
  },
];

/* ------------------------------------------------------------------------- */
/* Recent activity — DASH-S11                                                 */
/* ------------------------------------------------------------------------- */

export const activityFeed: ActivityFeedItem[] = [
  {
    id: 'feed_1',
    actorId: 'user_meera',
    entityLabel: 'Rahul Shah',
    entityTo: '/contacts/customer/contact_rahul_shah',
    module: 'contacts',
    summary: 'Moved Rahul Shah to Qualified',
    at: '2026-08-10T08:45:00+05:30',
  },
  {
    id: 'feed_2',
    actorId: 'user_vikram',
    entityLabel: 'Festive Launch',
    entityTo: '/campaigns/camp_festive_launch',
    module: 'campaigns',
    summary: 'Reviewed failed-recipient report',
    status: 'In progress',
    at: '2026-08-10T08:10:00+05:30',
  },
  {
    id: 'feed_3',
    actorId: null,
    entityLabel: 'Payment Reminder',
    entityTo: '/automation/auto_payment_reminder',
    module: 'automation',
    summary: 'Automation flagged 17 stuck customers',
    status: 'Needs review',
    at: '2026-08-10T02:20:00+05:30',
  },
  {
    id: 'feed_4',
    actorId: 'user_rohan',
    entityLabel: 'Order #ORD-10432',
    entityTo: '/catalogue-orders/ORD-10432',
    module: 'catalogue-orders',
    summary: 'Updated fulfilment status to Shipped',
    at: '2026-08-09T19:05:00+05:30',
  },
  {
    id: 'feed_5',
    actorId: 'user_anita',
    entityLabel: 'Delhi Support access',
    entityTo: '/team-access?teamId=team_delhi_support',
    module: 'team-access',
    summary: 'Updated permissions for Delhi Support',
    at: '2026-08-09T17:30:00+05:30',
  },
  {
    id: 'feed_6',
    actorId: 'user_meera',
    entityLabel: 'Northline Import — 9 Aug',
    entityTo: '/contacts/imports/jobs/import_csv_20260809',
    module: 'contacts',
    summary: 'Completed contact import',
    status: 'Partial success',
    at: '2026-08-09T15:50:00+05:30',
  },
  {
    id: 'feed_7',
    actorId: 'user_karan',
    entityLabel: 'Priya Menon',
    entityTo: '/contacts/customer/contact_priya_menon',
    module: 'contacts',
    summary: 'Logged an outbound call',
    at: '2026-08-09T14:12:00+05:30',
  },
];

/* ------------------------------------------------------------------------- */
/* Continue work — DASH-S01 §7 row 12                                         */
/* ------------------------------------------------------------------------- */

export const continueWorkItems: ContinueWorkItem[] = [
  {
    id: 'cw_segment_draft',
    module: 'contacts',
    title: 'Segment draft — High-value dormant',
    status: 'Draft',
    updatedAt: '2026-08-09T20:15:00+05:30',
    to: '/contacts/segments/new',
    ownerId: 'user_vikram',
  },
  {
    id: 'cw_campaign_draft',
    module: 'campaigns',
    title: 'Festive Launch — Round 2',
    status: 'Draft',
    updatedAt: '2026-08-09T18:40:00+05:30',
    to: '/campaigns/new?draftId=cam_draft_festive_r2&step=audience&returnTo=%2Fdashboard',
    ownerId: 'user_anita',
  },
  {
    id: 'cw_import_job',
    module: 'contacts',
    title: 'CSV import — Mumbai leads',
    status: 'Mapping in progress',
    updatedAt: '2026-08-10T08:00:00+05:30',
    to: '/contacts/imports/new/mapping',
    ownerId: 'user_meera',
  },
  {
    id: 'cw_followup_note',
    module: 'calling',
    title: 'Follow-up prep — Ananya Reddy',
    status: 'Pending',
    updatedAt: '2026-08-10T07:40:00+05:30',
    to: '/calling?contactId=contact_ananya_reddy&returnTo=%2Fdashboard',
    ownerId: 'user_meera',
  },
];

/* ------------------------------------------------------------------------- */
/* Usage / plan warning — DASH-S01 §7 row 13, owner/admin only                */
/* ------------------------------------------------------------------------- */

export const usageWarnings: UsageWarning[] = [
  {
    id: 'usage_conversation_credits',
    severity: 'medium',
    message: 'Your workspace has used 78% of this month’s conversation credits.',
    ctaLabel: 'Review usage',
    ctaTo: '/billing?tab=usage',
  },
];
