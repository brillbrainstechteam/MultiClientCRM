/**
 * Deterministic Inbox mock data — 10 conversation scenarios required by SKILL.md Batch 0.
 * All timestamps relative to reference date 2026-08-10T10:00:00+05:30.
 * IDs are stable so Figma captures of the same ?conversation= route are identical.
 */

import type {
  InboxConversation,
  InboxMessage,
  ResponseWindow,
  SlaState,
  MessagePreview,
  MessageStatus,
  InboxTemplate,
  ConversationLabel,
  QuickReply,
  AiSuggestedTask,
  ConversationActivityEvent,
  InboxAnalytics,
} from './inbox-types';

// ---- Conversation labels ---------------------------------------------------

export const conversationLabels: ConversationLabel[] = [
  { id: 'lbl_hot_lead', name: 'Hot Lead', color: '#b0453f', scope: 'workspace', teamId: null },
  { id: 'lbl_follow_up', name: 'Follow-up', color: '#b8892b', scope: 'workspace', teamId: null },
  { id: 'lbl_bulk_enquiry', name: 'Bulk Enquiry', color: '#1b7a6b', scope: 'workspace', teamId: null },
  { id: 'lbl_support', name: 'Support', color: '#4a5d6e', scope: 'workspace', teamId: null },
  { id: 'lbl_payment', name: 'Payment Issue', color: '#c9a227', scope: 'team', teamId: 'team_delhi_support' },
  { id: 'lbl_vip', name: 'VIP', color: '#9c7d19', scope: 'workspace', teamId: null },
];

export function findLabel(id: string): ConversationLabel | undefined {
  return conversationLabels.find((l) => l.id === id);
}

// ---- Quick replies ---------------------------------------------------------

export const quickReplies: QuickReply[] = [
  {
    id: 'qr_greeting',
    name: 'Warm Greeting',
    content: 'Hi {{1}}, thanks for reaching out to Northline Retail! How can I help you today?',
    category: 'Greetings',
    language: 'en',
    scope: 'workspace',
    ownerId: null,
    hasVariables: true,
    variables: ['customer_name'],
  },
  {
    id: 'qr_pricing',
    name: 'Pricing — Bulk Enquiry',
    content:
      "For bulk orders above 50 units, we offer special pricing. I'll send you our current catalogue. Please share your requirements and target quantity.",
    category: 'Sales',
    language: 'en',
    scope: 'workspace',
    ownerId: null,
    hasVariables: false,
    variables: [],
  },
  {
    id: 'qr_payment_followup',
    name: 'Payment Follow-up',
    content:
      'Hi {{1}}, I wanted to follow up on the pending payment for order #{{2}}. Please let us know if you need any assistance.',
    category: 'Payments',
    language: 'en',
    scope: 'team',
    ownerId: 'team_delhi_support',
    hasVariables: true,
    variables: ['customer_name', 'order_id'],
  },
  {
    id: 'qr_out_of_office',
    name: 'Out of Office',
    content:
      'Thank you for your message. Our team is currently unavailable. We will respond within 2 business hours. For urgent queries, call +91 98110 20001.',
    category: 'Greetings',
    language: 'en',
    scope: 'workspace',
    ownerId: null,
    hasVariables: false,
    variables: [],
  },
  {
    id: 'qr_closing',
    name: 'Closing — Resolved',
    content:
      'Happy to help, {{1}}! If you have any other questions, feel free to reach out. Have a great day!',
    category: 'Closing',
    language: 'en',
    scope: 'workspace',
    ownerId: null,
    hasVariables: true,
    variables: ['customer_name'],
  },
];

// ---- Message templates ----------------------------------------------------

export const inboxTemplates: InboxTemplate[] = [
  {
    id: 'tmpl_welcome_intro',
    name: 'welcome_intro',
    displayName: 'Welcome Introduction',
    category: 'utility',
    language: 'en',
    status: 'approved',
    headerType: 'text',
    headerText: 'Welcome to Northline Retail!',
    bodyText:
      "Hi {{1}}, we're glad to have you reach out! I'm {{2}} from the {{3}} team. How can we assist you today?",
    footer: 'Northline Retail — Making quality accessible.',
    variables: ['customer_name', 'agent_name', 'team_name'],
    buttons: [{ type: 'quick-reply', label: 'Browse Catalogue' }, { type: 'quick-reply', label: 'Talk to Agent' }],
    numberIds: [],
  },
  {
    id: 'tmpl_appointment_reminder',
    name: 'appointment_reminder',
    displayName: 'Appointment Reminder',
    category: 'utility',
    language: 'en',
    status: 'approved',
    headerType: 'none',
    bodyText:
      'Hi {{1}}, this is a reminder for your appointment on {{2}} at {{3}}. Please confirm your attendance or let us know if you need to reschedule.',
    footer: 'Northline Retail Support',
    variables: ['customer_name', 'date', 'time'],
    buttons: [{ type: 'quick-reply', label: 'Confirm' }, { type: 'quick-reply', label: 'Reschedule' }],
    numberIds: [],
  },
  {
    id: 'tmpl_order_shipped',
    name: 'order_shipped',
    displayName: 'Order Shipped',
    category: 'utility',
    language: 'en',
    status: 'approved',
    headerType: 'text',
    headerText: 'Your order is on its way!',
    bodyText:
      'Great news, {{1}}! Your order #{{2}} has been shipped. Expected delivery: {{3}}. Track your shipment using the link below.',
    variables: ['customer_name', 'order_id', 'delivery_date'],
    buttons: [{ type: 'url', label: 'Track Order', value: 'https://tracking.northline.in/{{2}}' }],
    numberIds: [],
  },
  {
    id: 'tmpl_payment_reminder',
    name: 'payment_reminder',
    displayName: 'Payment Reminder',
    category: 'utility',
    language: 'en',
    status: 'approved',
    headerType: 'none',
    bodyText:
      'Hi {{1}}, we noticed your payment of ₹{{2}} for order #{{3}} is due on {{4}}. Please complete the payment to avoid delays in order processing.',
    footer: 'Northline Retail Accounts',
    variables: ['customer_name', 'amount', 'order_id', 'due_date'],
    buttons: [{ type: 'url', label: 'Pay Now', value: 'https://pay.northline.in/{{3}}' }],
    numberIds: ['wa_delhi_support'],
  },
  {
    id: 'tmpl_feedback_request',
    name: 'feedback_request',
    displayName: 'Feedback Request',
    category: 'marketing',
    language: 'en',
    status: 'approved',
    headerType: 'none',
    bodyText:
      "Hi {{1}}, hope your recent experience with Northline Retail was great! We'd love to hear your feedback. It takes just 2 minutes and helps us serve you better.",
    variables: ['customer_name'],
    buttons: [{ type: 'url', label: 'Share Feedback', value: 'https://feedback.northline.in/{{1}}' }],
    numberIds: [],
  },
  {
    id: 'tmpl_otp_verify',
    name: 'otp_verify',
    displayName: 'OTP Verification',
    category: 'authentication',
    language: 'en',
    status: 'approved',
    headerType: 'none',
    bodyText: 'Your Northline Retail verification code is {{1}}. This code expires in 10 minutes. Do not share it with anyone.',
    variables: ['otp_code'],
    buttons: [],
    numberIds: [],
  },
  {
    id: 'tmpl_restock_alert',
    name: 'restock_alert',
    displayName: 'Back in Stock Alert',
    category: 'marketing',
    language: 'en',
    status: 'pending',
    headerType: 'none',
    bodyText: "Great news, {{1}}! The item you were interested in — {{2}} — is back in stock. Order now before it sells out again!",
    variables: ['customer_name', 'product_name'],
    buttons: [{ type: 'quick-reply', label: 'Order Now' }],
    numberIds: [],
  },
];

export function findTemplate(id: string): InboxTemplate | undefined {
  return inboxTemplates.find((t) => t.id === id);
}

// ---- Conversations ---------------------------------------------------------
// Scenario 1: Normal active conversation — Rahul Shah / Meera / Delhi Sales

// (Mock conversation scenarios removed — conversations are hydrated from real data below.)

// ---- All conversations in one array ---------------------------------------

export let allConversations: InboxConversation[] = [];

export function findConversation(id: string): InboxConversation | undefined {
  return allConversations.find((c) => c.id === id);
}

// ---- Messages per conversation --------------------------------------------

export let conversationMessages: Record<string, InboxMessage[]> = {};

// ---- AI Suggested Tasks ---------------------------------------------------

export const aiSuggestedTasks: AiSuggestedTask[] = [
  {
    id: 'aitask_1',
    conversationId: 'conv_ai_task',
    taskType: 'demo',
    title: 'Schedule design consultation — Priya Menon',
    description:
      'Customer explicitly requested a design consultation for her new home. High purchase intent — platinum tier customer. Suggested assignee: Anita Sharma (workspace owner).',
    sourceMessageId: 'msg_at_3',
    confidence: 'high',
    status: 'pending',
    suggestedAssigneeId: 'user_anita',
    suggestedDueAt: '2026-08-12T11:00:00+05:30',
  },
];

export function findAiTasks(conversationId: string): AiSuggestedTask[] {
  return aiSuggestedTasks.filter((t) => t.conversationId === conversationId);
}

// ---- Activity events per conversation ------------------------------------

export const conversationActivity: Record<string, ConversationActivityEvent[]> = {
  conv_rahul_active: [
    { id: 'ev_ra_1', conversationId: 'conv_rahul_active', kind: 'conversation-created', actorId: null, targetId: null, labelId: null, description: 'Conversation started via WhatsApp', at: '2026-08-10T09:20:00+05:30' },
    { id: 'ev_ra_2', conversationId: 'conv_rahul_active', kind: 'assignment', actorId: null, targetId: 'user_meera', labelId: null, description: 'Auto-assigned to Meera Nair', at: '2026-08-10T09:20:10+05:30' },
    { id: 'ev_ra_3', conversationId: 'conv_rahul_active', kind: 'label-add', actorId: 'user_meera', targetId: null, labelId: 'lbl_bulk_enquiry', description: 'Label "Bulk Enquiry" added', at: '2026-08-10T09:28:30+05:30' },
    { id: 'ev_ra_4', conversationId: 'conv_rahul_active', kind: 'label-add', actorId: 'user_meera', targetId: null, labelId: 'lbl_hot_lead', description: 'Label "Hot Lead" added', at: '2026-08-10T09:28:35+05:30' },
    { id: 'ev_ra_5', conversationId: 'conv_rahul_active', kind: 'note-added', actorId: 'user_meera', targetId: null, labelId: null, description: 'Internal note: "Rahul is interested in 200-unit order for Diwali. Follow up on pricing."', at: '2026-08-10T09:35:00+05:30' },
    { id: 'ev_ra_6', conversationId: 'conv_rahul_active', kind: 'window-expiring', actorId: null, targetId: null, labelId: null, description: 'Response window expiring in 60 minutes', at: '2026-08-10T21:42:00+05:30' },
  ],
  conv_priya_expired: [
    { id: 'ev_pe_1', conversationId: 'conv_priya_expired', kind: 'conversation-created', actorId: null, targetId: null, labelId: null, description: 'Conversation started via WhatsApp', at: '2026-08-09T16:00:00+05:30' },
    { id: 'ev_pe_2', conversationId: 'conv_priya_expired', kind: 'assignment', actorId: 'user_vikram', targetId: 'user_vikram', labelId: null, description: 'Assigned to Vikram Rao', at: '2026-08-09T16:05:00+05:30' },
    { id: 'ev_pe_3', conversationId: 'conv_priya_expired', kind: 'label-add', actorId: 'user_vikram', targetId: null, labelId: 'lbl_vip', description: 'Label "VIP" added', at: '2026-08-09T16:10:00+05:30' },
    { id: 'ev_pe_4', conversationId: 'conv_priya_expired', kind: 'window-expired', actorId: null, targetId: null, labelId: null, description: 'Response window expired — only templates can be sent', at: '2026-08-09T18:15:00+05:30' },
    { id: 'ev_pe_5', conversationId: 'conv_priya_expired', kind: 'status-pending', actorId: 'user_vikram', targetId: null, labelId: null, description: 'Status changed to Pending — awaiting customer response', at: '2026-08-10T09:00:00+05:30' },
  ],
  conv_arjun_expiring: [
    { id: 'ev_ae_1', conversationId: 'conv_arjun_expiring', kind: 'conversation-created', actorId: null, targetId: null, labelId: null, description: 'Conversation started via WhatsApp', at: '2026-08-10T09:00:00+05:30' },
    { id: 'ev_ae_2', conversationId: 'conv_arjun_expiring', kind: 'assignment', actorId: 'user_meera', targetId: 'user_meera', labelId: null, description: 'Assigned to Meera Nair', at: '2026-08-10T09:00:30+05:30' },
    { id: 'ev_ae_3', conversationId: 'conv_arjun_expiring', kind: 'label-add', actorId: 'user_meera', targetId: null, labelId: 'lbl_follow_up', description: 'Label "Follow-up" added', at: '2026-08-10T09:05:00+05:30' },
    { id: 'ev_ae_4', conversationId: 'conv_arjun_expiring', kind: 'window-expiring', actorId: null, targetId: null, labelId: null, description: 'Response window expiring — 28 minutes remaining', at: '2026-08-10T09:32:00+05:30' },
  ],
  conv_sneha_bot: [
    { id: 'ev_sb_1', conversationId: 'conv_sneha_bot', kind: 'conversation-created', actorId: null, targetId: null, labelId: null, description: 'Conversation started via WhatsApp', at: '2026-08-10T08:00:00+05:30' },
    { id: 'ev_sb_2', conversationId: 'conv_sneha_bot', kind: 'bot-started', actorId: null, targetId: null, labelId: null, description: 'Bot engaged — handling initial enquiry', at: '2026-08-10T08:00:05+05:30' },
    { id: 'ev_sb_3', conversationId: 'conv_sneha_bot', kind: 'handoff-requested', actorId: null, targetId: 'user_meera', labelId: null, description: 'Bot requested handoff to human agent', at: '2026-08-10T08:45:00+05:30' },
  ],
  conv_ai_task: [
    { id: 'ev_at_1', conversationId: 'conv_ai_task', kind: 'conversation-created', actorId: null, targetId: null, labelId: null, description: 'Conversation started via WhatsApp', at: '2026-08-09T20:00:00+05:30' },
    { id: 'ev_at_2', conversationId: 'conv_ai_task', kind: 'assignment', actorId: 'user_anita', targetId: 'user_anita', labelId: null, description: 'Assigned to Anita Sharma', at: '2026-08-09T20:05:00+05:30' },
    { id: 'ev_at_3', conversationId: 'conv_ai_task', kind: 'label-add', actorId: 'user_anita', targetId: null, labelId: 'lbl_vip', description: 'Label "VIP" added', at: '2026-08-09T20:10:00+05:30' },
    { id: 'ev_at_4', conversationId: 'conv_ai_task', kind: 'task-created', actorId: null, targetId: null, labelId: null, description: 'AI suggested follow-up task: "Schedule product demo for Karan"', at: '2026-08-09T20:15:00+05:30' },
    { id: 'ev_at_5', conversationId: 'conv_ai_task', kind: 'note-added', actorId: 'user_anita', targetId: null, labelId: null, description: 'Internal note: "Karan is a high-value VIP client — prioritise demo scheduling."', at: '2026-08-09T20:20:00+05:30' },
    { id: 'ev_at_6', conversationId: 'conv_ai_task', kind: 'reassignment', actorId: 'user_anita', targetId: 'user_rohan', labelId: null, description: 'Reassigned from Anita Sharma to Rohan Iyer', at: '2026-08-09T21:00:00+05:30' },
  ],
};

export function findActivityEvents(conversationId: string): ConversationActivityEvent[] {
  return conversationActivity[conversationId] ?? [];
}

// ---- Inbox Analytics mock ------------------------------------------------

export const inboxAnalytics: InboxAnalytics = {
  period: { from: '2026-08-01T00:00:00+05:30', to: '2026-08-10T23:59:59+05:30' },
  summary: {
    totalConversations: 312,
    responded: 289,
    resolved: 241,
    resolvedWithoutHumanResponse: 38,
    avgFirstResponseMinutes: 4,
    avgFirstHumanResponseMinutes: 7,
    avgResolutionMinutes: 142,
    unresolved: 71,
    automationUsagePercent: 62,
  },
  agentRows: [
    { userId: 'user_meera', assignedCount: 94, resolvedCount: 81, avgFirstResponseMinutes: 3, avgResolutionMinutes: 118 },
    { userId: 'user_rohan', assignedCount: 87, resolvedCount: 72, avgFirstResponseMinutes: 5, avgResolutionMinutes: 155 },
    { userId: 'user_farida', assignedCount: 78, resolvedCount: 66, avgFirstResponseMinutes: 4, avgResolutionMinutes: 138 },
    { userId: 'user_karan', assignedCount: 53, resolvedCount: 22, avgFirstResponseMinutes: 9, avgResolutionMinutes: 210 },
  ],
  conversationsByDay: [
    { date: '2026-08-01', open: 28, resolved: 24 },
    { date: '2026-08-02', open: 31, resolved: 27 },
    { date: '2026-08-03', open: 24, resolved: 22 },
    { date: '2026-08-04', open: 36, resolved: 29 },
    { date: '2026-08-05', open: 42, resolved: 35 },
    { date: '2026-08-06', open: 38, resolved: 32 },
    { date: '2026-08-07', open: 29, resolved: 26 },
    { date: '2026-08-08', open: 34, resolved: 28 },
    { date: '2026-08-09', open: 31, resolved: 18 },
    { date: '2026-08-10', open: 19, resolved: 0 },
  ],
};

// ---- Real-data hydration ---------------------------------------------------
// Conversations + messages come from /api/crm/inbox (real WhatsApp threads).
// Derived fields (response window, preview, reply status) are computed here so
// the UI never calculates them. Config data (labels, quick replies, templates,
// AI tasks, analytics) stays fixture-backed until those modules are built.

interface InboxApiMessage {
  id: string; waMessageId?: string | null; direction: string; text: string;
  status: string | null; at: string;
  // Provenance from the API — without these the "Sent from phone" badge, the
  // unavailable-media placeholder and the history divider never render.
  type?: string;
  source?: InboxMessage['source'];
  isHistorical?: boolean;
  mediaUnavailable?: boolean;
  mediaFileId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  replyToWaId?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
}
interface InboxApiNote { id: string; text: string; authorUserId: string | null; createdAt: string; }
interface InboxApiConversation {
  id: string;
  whatsappNumberId: string;
  contactId: string | null;
  rawMobile: string | null;
  contactName: string | null;
  status?: string;
  isHistorical?: boolean;
  historyFrom?: string | null;
  assigneeUserId?: string | null;
  labels?: string[];
  isSpam?: boolean;
  unread?: number;
  isBlocked?: boolean;
  isFavourite?: boolean;
  awaitingSince?: string | null;
  lastAgentReplyAt?: string | null;
  leadStatus?: string | null;
  lifecycleStage?: string | null;
  salesTier?: string | null;
  isCampaignReply?: boolean;
  isAdLead?: boolean;
  hasMissedCall?: boolean;
  firstMessageAt: string;
  lastMessageAt: string;
  lastInboundAt: string | null;
  messages: InboxApiMessage[];
  notes?: InboxApiNote[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** WhatsApp 24h service window, computed from the last inbound message. */
/**
 * How long this customer has been waiting on us, and whether that is a problem.
 *
 * This was hardcoded to `{ status: 'ok' }`, which meant the Overdue and SLA
 * Breached views could never match anything and the "SLA urgent" sort ordered
 * by nothing at all — three controls that looked like they worked.
 *
 * The clock starts at the OLDEST unanswered customer message, not the newest,
 * so a customer sending three messages in a row cannot keep resetting it in
 * their own favour. Backfilled history never counts: that conversation was
 * answered on the owner's phone months ago.
 */
const SLA_TARGET_MINUTES = 60;
const SLA_URGENT_MINUTES = 45;

function computeSla(awaitingSince: string | null, imported: boolean): SlaState {
  if (!awaitingSince || imported) {
    return { status: 'ok', deadline: null, minutesRemaining: null };
  }
  const started = new Date(awaitingSince).getTime();
  const deadline = new Date(started + SLA_TARGET_MINUTES * 60_000);
  const minutesRemaining = Math.round((deadline.getTime() - Date.now()) / 60_000);
  const waited = Math.round((Date.now() - started) / 60_000);

  if (waited >= SLA_TARGET_MINUTES) {
    return { status: 'breached', deadline: deadline.toISOString(), minutesRemaining };
  }
  if (waited >= SLA_URGENT_MINUTES) {
    return { status: 'warning', deadline: deadline.toISOString(), minutesRemaining };
  }
  return { status: 'ok', deadline: deadline.toISOString(), minutesRemaining };
}

function computeResponseWindow(lastInboundAt: string | null): ResponseWindow {
  if (!lastInboundAt) return { status: 'expired', expiresAt: null, remainingMinutes: null, canSendFreeform: false };
  const expires = new Date(new Date(lastInboundAt).getTime() + DAY_MS);
  const remaining = Math.round((expires.getTime() - Date.now()) / 60000);
  if (remaining <= 0) return { status: 'expired', expiresAt: expires.toISOString(), remainingMinutes: 0, canSendFreeform: false };
  return { status: remaining <= 60 ? 'expiring' : 'active', expiresAt: expires.toISOString(), remainingMinutes: remaining, canSendFreeform: true };
}

function mapStatus(direction: string, status: string | null): MessageStatus {
  if (direction === 'inbound') return 'read';
  switch (status) {
    case 'sent': case 'delivered': case 'read': case 'failed': return status;
    default: return 'sent';
  }
}

/** Cloud API message type -> the bubble shape the thread renders. */
function mapKind(type: string | undefined): InboxMessage['kind'] {
  switch (type) {
    case 'image': case 'sticker': return 'image';
    case 'video': return 'video';
    case 'document': return 'document';
    case 'audio': case 'voice': return 'audio';
    // A call is something that happened on the thread, not something anyone
    // typed, so it renders as a centred timeline pill rather than a bubble
    // attributed to one side.
    case 'call': return 'system';
    default: return 'text';
  }
}

/** wamid -> the local message it became, for resolving quoted replies. */
type ReplyIndex = Map<string, { id: string; text: string; direction: 'inbound' | 'outbound' }>;

function mapMessage(
  m: InboxApiMessage,
  conversationId: string,
  replyIndex?: ReplyIndex,
): InboxMessage {
  // WhatsApp quotes by wamid, so the message being answered has to be looked
  // up. A quote of something outside the loaded window simply resolves to
  // nothing rather than rendering an empty box.
  const quoted = m.replyToWaId ? replyIndex?.get(m.replyToWaId) ?? null : null;
  return {
    id: m.id,
    metaMessageId: m.waMessageId ?? null,
    conversationId,
    kind: mapKind(m.type),
    direction: m.direction === 'inbound' ? 'inbound' : 'outbound',
    text: m.text,
    status: mapStatus(m.direction, m.status),
    // Real milestones rather than nulls: "delivered 14:02, read 16:40" answers
    // questions a bare status cannot, and a failure now carries its reason.
    statusDetail: {
      sentAt: m.at,
      deliveredAt: m.deliveredAt ?? null,
      readAt: m.readAt ?? null,
      failedAt: m.failedAt ?? null,
      failureReason: m.failureReason ?? null,
      failureCode: m.failureCode ?? null,
    },
    attachmentUrl: m.mediaFileId ? `/api/crm/files/${m.mediaFileId}` : undefined,
    latitude: m.latitude ?? null,
    longitude: m.longitude ?? null,
    sentById: null,
    isAutomated: false,
    isNote: false,
    mentionedUserIds: [],
    replyToMessageId: quoted?.id ?? null,
    replyTo: quoted,
    source: m.source,
    isHistorical: m.isHistorical,
    mediaUnavailable: m.mediaUnavailable,
    at: m.at,
  };
}

function mapConversation(c: InboxApiConversation): InboxConversation {
  const last = c.messages[c.messages.length - 1];
  const preview: MessagePreview = {
    text: last?.text ?? '',
    isIncoming: last?.direction === 'inbound',
    isNote: false,
    at: last?.at ?? c.lastMessageAt,
  };
  const imported = c.status === 'imported' || c.isHistorical === true;
  // An imported thread usually ends on a customer message, but nobody is
  // waiting on us: it was answered on the owner's phone months ago. Marking it
  // 'awaiting-agent' would put it in Needs Reply and in the unanswered counts.
  const awaitingAgent = !imported && last?.direction === 'inbound';
  // 'imported' must survive: dropping it to 'open' would put every backfilled
  // thread straight into the Open queue, which is the one thing the history
  // import is designed not to do.
  const status = (['open', 'pending', 'resolved', 'imported'].includes(c.status ?? '')
    ? c.status
    : 'open') as InboxConversation['status'];
  return {
    id: c.id,
    contactId: c.contactId,
    rawMobile: c.rawMobile,
    whatsappNumberId: c.whatsappNumberId,
    assigneeId: c.assigneeUserId ?? null,
    teamId: null,
    botOwned: false,
    status,
    unreadCount: c.unread ?? 0,
    labelIds: c.labels ?? [],
    replyStatus: awaitingAgent ? 'awaiting-agent' : (last ? 'awaiting-customer' : 'none'),
    responseWindow: computeResponseWindow(c.lastInboundAt),
    sla: computeSla(c.awaitingSince ?? null, imported),
    preview,
    isSpam: c.isSpam ?? false,
    isBlocked: c.isBlocked ?? false,
    isFavourite: c.isFavourite ?? false,
    awaitingSince: c.awaitingSince ?? null,
    leadStatus: c.leadStatus ?? null,
    lifecycleStage: c.lifecycleStage ?? null,
    salesTier: c.salesTier ?? null,
    isCampaignReply: c.isCampaignReply ?? false,
    isAdLead: c.isAdLead ?? false,
    hasMissedCall: c.hasMissedCall ?? false,
    isHistorical: c.isHistorical,
    historyFrom: c.historyFrom ?? null,
    aiTaskCount: 0,
    firstMessageAt: c.firstMessageAt,
    lastMessageAt: c.lastMessageAt,
  };
}

/** Persisted internal note -> an inline note message in the thread. */
function mapNote(n: InboxApiNote, conversationId: string): InboxMessage {
  return {
    id: n.id, conversationId, kind: 'text', direction: 'outbound', text: n.text,
    status: 'sent', statusDetail: { sentAt: n.createdAt, deliveredAt: null, readAt: null, failedAt: null, failureReason: null, failureCode: null },
    sentById: n.authorUserId, isAutomated: false, isNote: true, mentionedUserIds: [], replyToMessageId: null, at: n.createdAt,
  };
}

/**
 * Patch one conversation in the live binding so list views, queue counts and
 * filters all see the change (not just the open thread's header).
 */
export function patchConversation(id: string, patch: Partial<InboxConversation>): void {
  allConversations = allConversations.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

/** Replace the live inbox bindings (used after hydration and any refresh). */
export function setInboxData(convs: InboxConversation[], msgs: Record<string, InboxMessage[]>): void {
  allConversations = convs;
  conversationMessages = msgs;
}

/** Fetch real conversations + messages and populate the live bindings. */
export async function hydrateInboxData(): Promise<void> {
  const res = await fetch('/api/crm/inbox', { credentials: 'same-origin' });
  if (!res.ok) { setInboxData([], {}); return; }
  const data = (await res.json()) as { conversations?: InboxApiConversation[] };
  const rows = data.conversations ?? [];
  const convs = rows.map(mapConversation);
  const msgs: Record<string, InboxMessage[]> = {};
  for (const c of rows) {
    // Index first: a reply can quote any earlier message in the thread, so the
    // lookup has to exist before any mapping happens.
    const replyIndex: ReplyIndex = new Map();
    for (const m of c.messages) {
      if (m.waMessageId) {
        replyIndex.set(m.waMessageId, {
          id: m.id,
          text: m.text,
          direction: m.direction === 'inbound' ? 'inbound' : 'outbound',
        });
      }
    }
    const merged = [
      ...c.messages.map((m) => mapMessage(m, c.id, replyIndex)),
      ...(c.notes ?? []).map((n) => mapNote(n, c.id)),
    ].sort((a, b) => a.at.localeCompare(b.at));
    msgs[c.id] = merged;
  }
  setInboxData(convs, msgs);
}
