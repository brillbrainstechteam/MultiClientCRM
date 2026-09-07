/**
 * Inbox domain model — extends the global types.ts stubs with full Inbox detail.
 * These types stay inside src/modules/inbox and must not bleed into other modules.
 * (INBOX_GENERATION_SPEC.md §3, SKILL.md §scope)
 */

// ---- Quick views (left sidebar) -------------------------------------------

export type QuickViewKey =
  | 'all'
  | 'mine'
  | 'unassigned'
  | 'needs-reply'
  | 'pending'
  | 'overdue'
  | 'sla-breached'
  | 'resolved'
  | 'spam';

// ---- Response window -------------------------------------------------------

/** Precomputed by domain layer — never calculated in UI components. */
export interface ResponseWindow {
  status: 'active' | 'expiring' | 'expired';
  expiresAt: string | null;
  remainingMinutes: number | null;
  /** If false, free-form text composer must be disabled; template is the only option. */
  canSendFreeform: boolean;
}

// ---- SLA ------------------------------------------------------------------

export interface SlaState {
  status: 'ok' | 'warning' | 'breached';
  deadline: string | null;
  minutesRemaining: number | null;
}

// ---- Preview shown in conversation rows ------------------------------------

export interface MessagePreview {
  text: string;
  isIncoming: boolean;
  isNote: boolean;
  at: string;
}

// ---- Conversation ----------------------------------------------------------

export interface InboxConversation {
  id: string;
  /** null = unknown WhatsApp number (no Contact record matched). */
  contactId: string | null;
  /** Raw mobile number shown when contactId is null. */
  rawMobile: string | null;
  whatsappNumberId: string;
  assigneeId: string | null;
  teamId: string | null;
  /** true when a bot currently owns the conversation; awaiting human handoff. */
  botOwned: boolean;
  status: 'open' | 'pending' | 'resolved';
  unreadCount: number;
  /** Conversation label IDs applied (temporary workflow tags). */
  labelIds: string[];
  replyStatus: 'awaiting-customer' | 'awaiting-agent' | 'none';
  responseWindow: ResponseWindow;
  sla: SlaState;
  preview: MessagePreview;
  isSpam: boolean;
  aiTaskCount: number;
  firstMessageAt: string;
  lastMessageAt: string;
}

// ---- Messages --------------------------------------------------------------

export type MessageKind =
  | 'text'
  | 'image'
  | 'video'
  | 'document'
  | 'audio'
  | 'template'
  | 'quick-reply'
  | 'location'
  | 'bot'
  | 'note'
  | 'system'
  | 'automated';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageStatusDetail {
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  failureCode: string | null;
}

export interface InboxMessage {
  id: string;
  conversationId: string;
  kind: MessageKind;
  direction: 'inbound' | 'outbound';
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: string;
  status: MessageStatus;
  statusDetail: MessageStatusDetail;
  /** null for inbound or bot messages. */
  sentById: string | null;
  isAutomated: boolean;
  /** Internal note — never shown to the customer. */
  isNote: boolean;
  mentionedUserIds: string[];
  replyToMessageId: string | null;
  templateId?: string;
  at: string;
}

// ---- Conversation labels (distinct from Contact tags) ----------------------

export interface ConversationLabel {
  id: string;
  name: string;
  /** Hex colour for the label pill. */
  color: string;
  scope: 'workspace' | 'team';
  teamId: string | null;
}

// ---- Quick replies ---------------------------------------------------------

export interface QuickReply {
  id: string;
  name: string;
  content: string;
  category: string;
  language: string;
  scope: 'workspace' | 'team' | 'personal';
  ownerId: string | null;
  hasVariables: boolean;
  variables: string[];
}

// ---- Templates (approved WA message templates) ----------------------------

export interface InboxTemplate {
  id: string;
  name: string;
  displayName: string;
  category: 'marketing' | 'utility' | 'authentication';
  language: string;
  status: 'approved' | 'pending' | 'rejected';
  headerType: 'none' | 'text' | 'image' | 'video' | 'document';
  headerText?: string;
  bodyText: string;
  footer?: string;
  /** Variable placeholder names in order — correspond to {{1}}, {{2}} etc. */
  variables: string[];
  buttons: Array<{ type: 'url' | 'phone' | 'quick-reply'; label: string; value?: string }>;
  /** Which WA number IDs can use this template. Empty = all. */
  numberIds: string[];
}

// ---- AI suggested tasks ----------------------------------------------------

export type AiTaskType = 'follow-up' | 'escalation' | 'demo' | 'callback' | 'quote' | 'other';

export interface AiSuggestedTask {
  id: string;
  conversationId: string;
  taskType: AiTaskType;
  title: string;
  description: string;
  /** Message in the history that triggered this suggestion (must show evidence). */
  sourceMessageId: string;
  confidence: 'low' | 'medium' | 'high';
  /** Human approval is mandatory for MVP. */
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'created';
  suggestedAssigneeId: string | null;
  suggestedDueAt: string | null;
}

// ---- Activity timeline -----------------------------------------------------

export type ConversationEventKind =
  | 'conversation-created'
  | 'assignment'
  | 'unassignment'
  | 'reassignment'
  | 'status-open'
  | 'status-pending'
  | 'status-resolved'
  | 'status-reopen'
  | 'label-add'
  | 'label-remove'
  | 'note-added'
  | 'mention'
  | 'handoff-requested'
  | 'handoff-completed'
  | 'task-created'
  | 'task-approved'
  | 'task-rejected'
  | 'spam-marked'
  | 'spam-cleared'
  | 'bot-started'
  | 'bot-ended'
  | 'window-expiring'
  | 'window-expired';

export interface ConversationActivityEvent {
  id: string;
  conversationId: string;
  kind: ConversationEventKind;
  actorId: string | null;
  targetId: string | null;
  labelId: string | null;
  description: string;
  at: string;
}

// ---- Sort and filter -------------------------------------------------------

export type ConversationSortKey = 'newest' | 'oldest' | 'sla-urgent' | 'unread';

export type SearchMode = 'contacts' | 'messages';

export interface InboxFilterState {
  assigneeIds: string[];
  teamIds: string[];
  labelIds: string[];
  statuses: Array<'open' | 'pending' | 'resolved'>;
  whatsappNumberIds: string[];
  branchIds: string[];
  replyStatuses: string[];
  responseWindowStatuses: Array<'active' | 'expiring' | 'expired'>;
  dateFrom: string | null;
  dateTo: string | null;
}

export function emptyFilterState(): InboxFilterState {
  return {
    assigneeIds: [],
    teamIds: [],
    labelIds: [],
    statuses: [],
    whatsappNumberIds: [],
    branchIds: [],
    replyStatuses: [],
    responseWindowStatuses: [],
    dateFrom: null,
    dateTo: null,
  };
}

export function isFilterActive(f: InboxFilterState): boolean {
  return (
    f.assigneeIds.length > 0 ||
    f.teamIds.length > 0 ||
    f.labelIds.length > 0 ||
    f.statuses.length > 0 ||
    f.whatsappNumberIds.length > 0 ||
    f.branchIds.length > 0 ||
    f.replyStatuses.length > 0 ||
    f.responseWindowStatuses.length > 0 ||
    f.dateFrom !== null ||
    f.dateTo !== null
  );
}

// ---- Role capabilities -----------------------------------------------------

export interface InboxRoleCapabilities {
  canReassign: boolean;
  /** owner/admin see all users; agent sees own team only. */
  canAssignToAny: boolean;
  canMarkSpam: boolean;
  canExport: boolean;
  canViewAnalytics: boolean;
  canSeeAgentPerformance: boolean;
  canBulkAction: boolean;
  /** Phase 2 feature gate. */
  canHandoffBot: boolean;
  /** true = sees all conversations; false = sees assigned/team only. */
  canViewAllConversations: boolean;
  canApproveAiTasks: boolean;
}

// ---- Analytics -------------------------------------------------------------

export interface InboxAnalyticsSummary {
  totalConversations: number;
  responded: number;
  resolved: number;
  resolvedWithoutHumanResponse: number;
  avgFirstResponseMinutes: number;
  avgFirstHumanResponseMinutes: number;
  avgResolutionMinutes: number;
  unresolved: number;
  automationUsagePercent: number;
}

export interface AgentPerformanceRow {
  userId: string;
  assignedCount: number;
  resolvedCount: number;
  avgFirstResponseMinutes: number;
  avgResolutionMinutes: number;
}

export interface InboxAnalytics {
  period: { from: string; to: string };
  summary: InboxAnalyticsSummary;
  agentRows: AgentPerformanceRow[];
  conversationsByDay: { date: string; open: number; resolved: number }[];
}
