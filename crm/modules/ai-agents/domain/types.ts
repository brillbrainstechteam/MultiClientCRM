/**
 * AI Agents domain model (AI_AGENTS_GENERATION_SPEC.md §18, CODE_FIRST_ADAPTER.md §2).
 *
 * Kept module-local like Templates' domain model — richer than anything other
 * modules need to reference. Automation only ever receives an `agentId`.
 */

export type AgentLifecycleStatus =
  | 'draft'
  | 'ready_to_test'
  | 'tested'
  | 'active'
  | 'paused'
  | 'inactive';

export type AutonomyPreset = 'conservative' | 'balanced' | 'more_autonomous';

export type AgentUseCase =
  | 'sales'
  | 'support'
  | 'lead-qualification'
  | 'order-assistance'
  | 'appointments'
  | 'custom';

export type KnowledgeSourceType = 'faq' | 'document' | 'spreadsheet' | 'website';
export type KnowledgeSourceStatus = 'processing' | 'ready' | 'failed' | 'outdated';

export interface KnowledgeSource {
  id: string;
  agentId: string;
  type: KnowledgeSourceType;
  name: string;
  status: KnowledgeSourceStatus;
  updatedAt: string;
  /** Which agents may draw on this source — least-privilege by default (single agent). */
  allowedAgentIds: string[];
  preview: string;
  failureReason?: string;
}

export type SensitiveActionKey =
  | 'quotation'
  | 'discount'
  | 'payment-commitment'
  | 'refund'
  | 'custom-commitment';

export interface SensitiveActionPolicy {
  key: SensitiveActionKey;
  label: string;
  requiresApproval: boolean;
}

export type DataAccessScope =
  | 'contact-profile'
  | 'conversation-history'
  | 'orders-payments'
  | 'catalogue-products'
  | 'calling-context';

export interface DataAccessSetting {
  scope: DataAccessScope;
  allowed: boolean;
}

export type MaskedFieldCategory =
  | 'payment-details'
  | 'government-id'
  | 'personal-address'
  | 'internal-notes';

export interface MaskingRule {
  category: MaskedFieldCategory;
  /** Masked (hidden from the agent) unless a role permission explicitly allows it. */
  masked: boolean;
}

export interface FailurePolicy {
  onMissingData: 'handover';
  onIntegrationUnavailable: 'handover';
  onLowConfidence: 'handover';
  onRestrictedTopic: 'refuse-and-handover';
  onSensitiveAction: 'request-approval';
}

export interface HandoverConfig {
  /** Required routing target — activation blocks without it. */
  defaultTeamId: string | null;
  branchId?: string;
  fallbackUserId?: string;
  outsideHoursFallback: 'queue' | 'next-available' | 'no-handover-warning';
  noEligibleAgentFallback: 'queue' | 'notify-manager';
}

export interface AgentSafetyPolicy {
  autonomyPreset: AutonomyPreset;
  sensitiveActions: SensitiveActionPolicy[];
  restrictedTopics: string[];
  dataAccess: DataAccessSetting[];
  masking: MaskingRule[];
  failurePolicy: FailurePolicy;
  handover: HandoverConfig;
  dataAccessReviewed: boolean;
}

export type StandardTestCategory =
  | 'approved-faq'
  | 'unknown-handover'
  | 'restricted-topic'
  | 'sensitive-action'
  | 'missing-integration'
  | 'human-request'
  | 'source-reference';

export type TestResult = 'pass' | 'fail' | 'not-run';

export interface AgentTestCase {
  id: string;
  agentId: string;
  name: string;
  sampleCustomerMessage: string;
  expectedBehavior: string;
  required: boolean;
  category: StandardTestCategory;
  latestResult: TestResult;
}

export type TestRunActionKind = 'reply' | 'handover' | 'approval-request' | 'safe-stop';

export interface TestRunAction {
  kind: TestRunActionKind;
  label: string;
  detail: string;
}

export interface TestRunSourceRef {
  sourceId: string;
  sourceName: string;
  location?: string;
  type: KnowledgeSourceType;
}

export type TestFeedback = 'helpful' | 'incorrect' | 'incomplete' | null;

export interface AgentTestRun {
  id: string;
  agentId: string;
  versionId: string;
  testCaseId: string | null;
  customerMessage: string;
  agentResponse: string;
  sources: TestRunSourceRef[];
  actions: TestRunAction[];
  approvalState: 'not-required' | 'pending' | 'approved' | 'rejected';
  handoverTriggered: boolean;
  result: TestResult;
  feedback: TestFeedback;
  reviewerNote: string | null;
  correctionId: string | null;
  runAt: string;
}

export type CorrectionStatus = 'proposed' | 'approved' | 'rejected';

export interface AgentCorrection {
  id: string;
  agentId: string;
  testRunId: string;
  summary: string;
  proposedChange: string;
  status: CorrectionStatus;
  reviewerId: string | null;
  createdAt: string;
}

export type VersionLabel = 'draft' | 'active' | 'archived';

export interface AgentVersion {
  id: string;
  agentId: string;
  number: number;
  label: VersionLabel;
  snapshotSummary: string;
  createdBy: string;
  createdAt: string;
  testedAt: string | null;
  activatedAt: string | null;
  note: string | null;
}

export type AuditActionKind =
  | 'created'
  | 'edited'
  | 'knowledge-changed'
  | 'tested'
  | 'test-feedback'
  | 'correction-proposed'
  | 'correction-approved'
  | 'correction-rejected'
  | 'activated'
  | 'paused'
  | 'resumed'
  | 'deactivated'
  | 'rollback'
  | 'reply-generated'
  | 'action-requested'
  | 'source-used'
  | 'approval-requested'
  | 'approval-granted'
  | 'approval-rejected'
  | 'handover'
  | 'human-correction';

export interface AgentAuditEvent {
  id: string;
  agentId: string;
  /** `null` actor = the AI agent itself acting autonomously. */
  actorId: string | null;
  action: AuditActionKind;
  detail: string;
  sourceRefs?: string[];
  approvalState?: 'pending' | 'approved' | 'rejected';
  at: string;
}

export interface AgentUsagePoint {
  periodLabel: string;
  units: number;
}

export type UsageThresholdState = 'ok' | 'warning' | 'exceeded';

export interface AgentUsageSummary {
  agentId: string;
  periodLabel: string;
  usageUnits: number;
  estimatedCostLabel: string;
  trend: AgentUsagePoint[];
  alertThreshold: number;
  thresholdState: UsageThresholdState;
  costUnavailable?: boolean;
}

export interface AiAgent {
  id: string;
  tenantId: string;
  name: string;
  useCase: AgentUseCase;
  objective: string;
  responsibilities: string[];
  instructions: string;
  tone: string;
  supportedLanguages: string[];
  lifecycleStatus: AgentLifecycleStatus;
  testedAt: string | null;
  changedSinceTest: boolean;
  hasBlockingSafetyIssues: boolean;
  activeVersionId: string | null;
  draftVersionId: string;
  ownerId: string;
  branchId?: string;
  whatsappNumberId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Starter role templates offered on Purpose step 1 — starting points only. */
export interface UseCaseTemplate {
  useCase: AgentUseCase;
  label: string;
  description: string;
  suggestedObjective: string;
  suggestedResponsibilities: string[];
}
