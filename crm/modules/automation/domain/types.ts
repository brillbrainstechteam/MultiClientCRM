/**
 * Automation (Journeys / Flow Builder) domain model
 * (AUTOMATION_GENERATION_SPEC.md §20, CODE_FIRST_ADAPTER.md §3/§5).
 *
 * Kept module-local — Automation is considerably richer than the
 * cross-module `Automation` stub in `@crm/mock-data` that other modules may
 * reference by id/name only.
 */

import type { RoleKey } from '@crm/mock-data';

export type FlowStatus = 'draft' | 'testing' | 'live' | 'paused' | 'inactive';

export type CoreNodeType =
  | 'send_message'
  | 'question'
  | 'simple_branch'
  | 'delay_wait'
  | 'update_contact'
  | 'human_handover'
  | 'ai_agent_handoff'
  | 'end';

export type AdvancedNodeType =
  | 'api_call'
  | 'webhook'
  | 'external_integration'
  | 'advanced_condition'
  | 'random_split'
  | 'commerce_action';

export type FlowNodeType = CoreNodeType | AdvancedNodeType;

export const coreNodeTypes: CoreNodeType[] = [
  'send_message',
  'question',
  'simple_branch',
  'delay_wait',
  'update_contact',
  'human_handover',
  'ai_agent_handoff',
  'end',
];

export const advancedNodeTypes: AdvancedNodeType[] = [
  'api_call',
  'webhook',
  'external_integration',
  'advanced_condition',
  'random_split',
  'commerce_action',
];

/** Phase-2 node types shown as labelled, disabled placeholders in the Advanced palette. */
export const phase2NodeTypes: AdvancedNodeType[] = [
  'advanced_condition',
  'random_split',
  'commerce_action',
];

/* ------------------------------------------------------------------------- */
/* Trigger                                                                    */
/* ------------------------------------------------------------------------- */

export type CoreTriggerType =
  | 'customer_message'
  | 'keyword'
  | 'campaign_reply'
  | 'contact_created'
  | 'field_change'
  | 'date';

export type AdvancedTriggerType = 'sheets_row' | 'external_api' | 'ecommerce_event' | 'ad_integration';

export type TriggerType = CoreTriggerType | AdvancedTriggerType;

export const coreTriggerTypes: CoreTriggerType[] = [
  'customer_message',
  'keyword',
  'campaign_reply',
  'contact_created',
  'field_change',
  'date',
];

export const advancedTriggerTypes: AdvancedTriggerType[] = [
  'sheets_row',
  'external_api',
  'ecommerce_event',
  'ad_integration',
];

export interface FlowTrigger {
  type: TriggerType;
  /** Human summary shown on the Library card and Start node ("Keyword: price"). */
  summary: string;
  keyword?: string;
  keywordMatch?: 'exact' | 'contains';
  campaignId?: string;
  campaignName?: string;
  fieldKey?: string;
  fieldLabel?: string;
  fieldValue?: string;
  dateMode?: 'fixed' | 'relative';
  fixedDate?: string;
  relativeToField?: string;
  relativeOffsetDays?: number;
  /** Advanced/use-case placeholder triggers are never fully configurable in-builder. */
  integrationAvailable?: boolean;
  integrationName?: string;
}

/* ------------------------------------------------------------------------- */
/* Node configs                                                              */
/* ------------------------------------------------------------------------- */

export type SendMessageMode = 'text' | 'media' | 'template' | 'interactive';

export interface InteractiveOption {
  id: string;
  label: string;
}

export interface SendMessageConfig {
  mode: SendMessageMode;
  text?: string;
  mediaLabel?: string;
  templateId?: string;
  templateName?: string;
  interactiveOptions?: InteractiveOption[];
  /** Capability-dependent references — selectors handed off to owning modules. */
  productRef?: { connected: boolean; productId?: string; productName?: string };
  flowRef?: { connected: boolean; flowId?: string; flowName?: string };
  paymentRef?: { available: boolean };
}

export type QuestionAnswerType =
  | 'open_text'
  | 'single_select'
  | 'multi_select'
  | 'name'
  | 'phone'
  | 'email'
  | 'date'
  | 'location'
  | 'business_requirement';

export type SaveDestinationTarget = 'field' | 'tag' | 'stage' | 'owner' | 'priority' | 'followUpDate';

export interface SaveDestination {
  target: SaveDestinationTarget;
  key?: string;
  label: string;
}

export interface QuestionConfig {
  prompt: string;
  answerType: QuestionAnswerType;
  options?: string[];
  required: boolean;
  retryMessage?: string;
  saveTo?: SaveDestination;
}

export type SimpleBranchMode = 'answer_option' | 'reply_no_reply' | 'field_tag_equality';

export interface BranchPath {
  id: string;
  label: string;
  /** Option value (answer mode) or field/tag value to match (equality mode). */
  matchValue?: string;
  next: string | null;
}

export interface SimpleBranchConfig {
  mode: SimpleBranchMode;
  sourceQuestionNodeId?: string;
  fieldKey?: string;
  fieldLabel?: string;
  branches: BranchPath[];
  /** Always required — validation blocks Go Live without it. */
  fallback: { label: string; next: string | null };
}

export type DelayMode = 'duration' | 'until_datetime' | 'wait_for_reply';
export type DurationUnit = 'minutes' | 'hours' | 'days';

export interface DelayWaitConfig {
  mode: DelayMode;
  durationValue?: number;
  durationUnit?: DurationUnit;
  untilDateTime?: string;
  businessHoursOnly?: boolean;
  replyDeadlineHours?: number;
  /** Path taken when a reply deadline elapses with no customer response. */
  noResponseNext?: string | null;
  /** Approved template used if the eventual send would fall outside the session window. */
  templateFallbackId?: string;
  templateFallbackName?: string;
}

export interface ContactUpdateEntry {
  id: string;
  kind: 'field' | 'tagAdd' | 'tagRemove' | 'stage' | 'owner' | 'priority' | 'followUpDate';
  key?: string;
  value: string;
}

export interface UpdateContactConfig {
  updates: ContactUpdateEntry[];
}

export type HandoverTargetType = 'user' | 'team' | 'branch';

export interface HumanHandoverConfig {
  targetType: HandoverTargetType;
  targetId?: string;
  targetLabel?: string;
  reason: string;
  preserveContext: boolean;
}

export interface AiAgentHandoffConfig {
  agentId?: string;
  agentName?: string;
}

export interface EndConfig {
  outcomeLabel: string;
}

export interface ApiCallConfig {
  endpointLabel: string;
  available: boolean;
}

export interface WebhookConfig {
  webhookLabel: string;
  available: boolean;
}

export interface ExternalIntegrationConfig {
  integrationName: string;
  available: boolean;
}

/** Phase-2 blocks are shown but not editable — capture their intent only. */
export interface Phase2Config {
  description: string;
}

export type NodeConfig =
  | SendMessageConfig
  | QuestionConfig
  | SimpleBranchConfig
  | DelayWaitConfig
  | UpdateContactConfig
  | HumanHandoverConfig
  | AiAgentHandoffConfig
  | EndConfig
  | ApiCallConfig
  | WebhookConfig
  | ExternalIntegrationConfig
  | Phase2Config;

interface BaseNode {
  id: string;
  label: string;
  notes?: string;
}

export interface SendMessageNode extends BaseNode {
  type: 'send_message';
  next: string | null;
  config: SendMessageConfig;
}
export interface QuestionNode extends BaseNode {
  type: 'question';
  next: string | null;
  config: QuestionConfig;
}
export interface SimpleBranchNode extends BaseNode {
  type: 'simple_branch';
  config: SimpleBranchConfig;
}
export interface DelayWaitNode extends BaseNode {
  type: 'delay_wait';
  next: string | null;
  config: DelayWaitConfig;
}
export interface UpdateContactNode extends BaseNode {
  type: 'update_contact';
  next: string | null;
  config: UpdateContactConfig;
}
export interface HumanHandoverNode extends BaseNode {
  type: 'human_handover';
  next: string | null;
  config: HumanHandoverConfig;
}
export interface AiAgentHandoffNode extends BaseNode {
  type: 'ai_agent_handoff';
  next: string | null;
  config: AiAgentHandoffConfig;
}
export interface EndNode extends BaseNode {
  type: 'end';
  config: EndConfig;
}
export interface ApiCallNode extends BaseNode {
  type: 'api_call';
  next: string | null;
  config: ApiCallConfig;
}
export interface WebhookNode extends BaseNode {
  type: 'webhook';
  next: string | null;
  config: WebhookConfig;
}
export interface ExternalIntegrationNode extends BaseNode {
  type: 'external_integration';
  next: string | null;
  config: ExternalIntegrationConfig;
}
export interface AdvancedConditionNode extends BaseNode {
  type: 'advanced_condition';
  config: Phase2Config;
}
export interface RandomSplitNode extends BaseNode {
  type: 'random_split';
  config: Phase2Config;
}
export interface CommerceActionNode extends BaseNode {
  type: 'commerce_action';
  next: string | null;
  config: Phase2Config;
}

export type FlowNode =
  | SendMessageNode
  | QuestionNode
  | SimpleBranchNode
  | DelayWaitNode
  | UpdateContactNode
  | HumanHandoverNode
  | AiAgentHandoffNode
  | EndNode
  | ApiCallNode
  | WebhookNode
  | ExternalIntegrationNode
  | AdvancedConditionNode
  | RandomSplitNode
  | CommerceActionNode;

/** Node types that legitimately end a path without a `next` pointer. */
export const terminalNodeTypes: FlowNodeType[] = [
  'end',
  'human_handover',
  'ai_agent_handoff',
  'advanced_condition',
  'random_split',
];

/* ------------------------------------------------------------------------- */
/* Flow / version / test / audit                                             */
/* ------------------------------------------------------------------------- */

export type StarterCategory =
  | 'lead-capture'
  | 'catalogue-quotation'
  | 'appointment-registration'
  | 'order-payment'
  | 'dispatch-delivery'
  | 'feedback-escalation'
  | 'minimal';

export interface AutomationFlow {
  id: string;
  name: string;
  purpose: string;
  category: StarterCategory;
  ownerId: string;
  status: FlowStatus;
  testedAt: string | null;
  changedSinceTest: boolean;
  currentDraftVersionId: string;
  publishedVersionId: string | null;
  requiresApproval: boolean;
  approvalStage?: 'pending' | 'approved' | 'changes-requested';
  trigger: FlowTrigger;
  /** First real node reached after Start. */
  startNodeId: string;
  nodes: FlowNode[];
  branchId?: string;
  whatsappNumberId?: string;
  scheduledStart?: string | null;
  stopDate?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  lastTestRunId?: string | null;
}

export interface FlowVersion {
  id: string;
  flowId: string;
  number: number;
  label: string;
  summary: string;
  status: 'draft' | 'published' | 'superseded';
  createdBy: string;
  createdAt: string;
  publishedAt?: string | null;
  /** Deep-copied node/trigger snapshot — what rollback restores. */
  nodes: FlowNode[];
  trigger: FlowTrigger;
  startNodeId: string;
}

export type TestStepKind =
  | 'message'
  | 'question'
  | 'branch'
  | 'wait'
  | 'update'
  | 'handover'
  | 'ai_handoff'
  | 'integration'
  | 'end';

export interface FlowTestStep {
  nodeId: string;
  nodeLabel: string;
  kind: TestStepKind;
  detail: string;
  simulatedAnswer?: string;
}

export interface FlowTestRun {
  id: string;
  flowId: string;
  versionId: string;
  testContactId: string;
  startedAt: string;
  completedAt: string | null;
  status: 'running' | 'complete' | 'failed';
  path: FlowTestStep[];
  resultingUpdates: { label: string; value: string }[];
  errorMessage?: string;
}

export type AuditAction =
  | 'created'
  | 'edited'
  | 'tested'
  | 'published'
  | 'paused'
  | 'resumed'
  | 'rolled_back'
  | 'archived'
  | 'cloned'
  | 'deleted'
  | 'sent_for_approval'
  | 'approved'
  | 'changes_requested';

export interface FlowAuditEvent {
  id: string;
  flowId: string;
  actorId: string;
  action: AuditAction;
  detail: string;
  at: string;
}

/* ------------------------------------------------------------------------- */
/* Validation                                                                 */
/* ------------------------------------------------------------------------- */

export type ValidationSeverity = 'error' | 'warning';

export type ValidationKind =
  | 'disconnected'
  | 'incomplete'
  | 'missing-content'
  | 'no-next'
  | 'missing-fallback'
  | 'duplicate-trigger'
  | 'loop'
  | 'session-risk'
  | 'not-tested'
  | 'integration-unavailable'
  | 'invalid-config';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  kind: ValidationKind;
  nodeId: string | null;
  title: string;
  reason: string;
  suggestedFix?: string;
  blocking: boolean;
  conflictFlowId?: string;
}

/** Capabilities gate Automation actions (spec §Permissions/governance). */
export type AutomationCapability =
  | 'view'
  | 'create'
  | 'edit'
  | 'test'
  | 'publish'
  | 'pause'
  | 'delete'
  | 'rollback'
  | 'view_audit'
  | 'export_audit';

export const automationCapabilityRoles: Record<AutomationCapability, RoleKey[]> = {
  view: ['owner', 'manager'],
  create: ['owner', 'manager'],
  edit: ['owner', 'manager'],
  test: ['owner', 'manager'],
  publish: ['owner', 'manager'],
  pause: ['owner', 'manager'],
  delete: ['owner'],
  rollback: ['owner', 'manager'],
  view_audit: ['owner', 'manager'],
  export_audit: ['owner'],
};
