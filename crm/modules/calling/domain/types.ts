/**
 * Calling domain model (CALLING_GENERATION_SPEC.md §22, CODE_FIRST_ADAPTER.md §2).
 *
 * Call Task (work to do) and Call Attempt (an actual attempt) are modelled
 * separately — a task accumulates zero or more attempts. Connection status
 * and business disposition are separate taxonomies; a task never overloads
 * both concepts into one field.
 */

export type CallTaskStatus = 'scheduled' | 'due' | 'in_progress' | 'completed' | 'cancelled';

export type ConnectionStatus = 'connected' | 'no_answer' | 'busy' | 'unreachable' | 'invalid';

export type BusinessDisposition = 'interested' | 'not_interested' | 'follow_up' | 'completed';

export type NextActionKey =
  | 'none'
  | 'schedule_follow_up'
  | 'send_whatsapp'
  | 'update_customer'
  | 'escalate';

/** Why the task exists in the queue, independent of due-time urgency. */
export type QueueReasonTag = 'new_enquiry' | 'high_value' | 'event' | 'standard';

/** Transparent priority group used for sorting — never shown as a bare score. */
export type QueueReasonGroup = 1 | 2 | 3 | 4 | 5;

export interface QueuePriority {
  group: QueueReasonGroup;
  label: string;
}

export interface CallTask {
  id: string;
  contactId: string;
  /** Contact record owner — distinct from who is assigned to make this call. */
  contactOwnerId: string;
  assigneeId: string | null;
  branchId: string;
  teamId: string | null;
  /** Calling number this task dials through — determines provider capability. */
  numberId: string;
  dueAt: string;
  /** Human label of where this task came from, e.g. "Call List: Diwali Outreach". */
  source: string;
  listId: string | null;
  reasonTag: QueueReasonTag;
  status: CallTaskStatus;
  latestDisposition: BusinessDisposition | null;
  attemptCount: number;
  createdAt: string;
  /** Set when this task exists because a prior attempt requested a follow-up. */
  followUpOfTaskId: string | null;
  followUpReason: string | null;
}

export interface CallAttempt {
  id: string;
  taskId: string;
  contactId: string;
  agentId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  connectionStatus: ConnectionStatus;
  disposition: BusinessDisposition | null;
  nextAction: NextActionKey | null;
  notes: string | null;
  requirement: string | null;
  objection: string | null;
  lifecycleChangeTo: string | null;
  providerReference: string | null;
  /** Deferred capability indicator only — never renders a player. */
  recordingAvailable: boolean;
  mode: 'manual' | 'provider';
}

export type CallListStatus = 'active' | 'paused' | 'completed' | 'closed';

export interface CallList {
  id: string;
  name: string;
  status: CallListStatus;
  source: string;
  branchId: string;
  teamId: string | null;
  /** Creator / owner of the list. */
  ownerId: string;
  /** One or more team members the list is distributed to. */
  assigneeIds: string[];
  createdAt: string;
  /** Scheduled date the calls should be made (distinct from creation date). */
  callDate: string | null;
  taskIds: string[];
  /** Set when the list was closed with remaining work moved back to the open queue. */
  closedNote: string | null;
}

/** Per-contact calling context Calling owns — never written back onto Contact. */
export interface CallContext {
  contactId: string;
  lastWhatsAppSummary: string | null;
  lastCallSummary: string | null;
  currentRequirement: string | null;
  openObjection: string | null;
  talkingPoints: string[];
  aiSuggestion: string | null;
}

export interface CallingNumberCapabilities {
  clickToCall: boolean;
  callStatusEvents: boolean;
  durationEvents: boolean;
  costData: boolean;
  inboundCalls: boolean;
  recording: boolean;
  transcript: boolean;
  voiceAI: boolean;
}

/** How a call is placed: over a WhatsApp number, or a regular telephony line. */
export type CallChannel = 'whatsapp' | 'phone';

export interface CallingNumber {
  id: string;
  label: string;
  branchId: string;
  /** WhatsApp calling vs general/tele calling (§ call-type bifurcation). */
  channel: CallChannel;
  providerName: string | null;
  providerConnected: boolean;
  capabilities: CallingNumberCapabilities;
  /** Provider-reported spend label. Never computed locally — provider is the source of truth. */
  costLabel: string | null;
}

export interface SavedQueueView {
  id: string;
  label: string;
  description: string;
  /** Phase-2 views render disabled with an explanatory state. */
  phase2?: boolean;
}
