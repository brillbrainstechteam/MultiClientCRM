import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { findWhatsAppNumber } from '@crm/mock-data';
import { Badge, Banner, Button, Checkbox, Drawer, IconButton, Input, Select, Stepper, Toast, Toggle } from '@crm/design-system';
import { simulateAssignmentRule } from '../resolvers';
import {
  assignmentRules,
  branches,
  fallbackQueues,
  findAssignmentRule,
  teamMembers,
  teams,
  whatsappNumbers,
} from '../team-access-mock-data';
import type { AssignmentCondition, AssignmentStrategy } from '../team-access-types';

const steps = [
  { id: 'scope', label: 'Scope' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'capacity', label: 'Capacity' },
  { id: 'fallback', label: 'Fallback' },
  { id: 'test', label: 'Test' },
  { id: 'review', label: 'Review' },
];

const conditionFields: AssignmentCondition['field'][] = ['number', 'branch', 'team', 'customer_type', 'language', 'city', 'tag', 'source'];
const strategyOptions: { value: AssignmentStrategy; label: string }[] = [
  { value: 'owner_first_round_robin', label: 'Existing owner first, then round-robin' },
  { value: 'round_robin', label: 'Round-robin across eligible team(s)' },
  { value: 'named_team', label: 'Always the named team' },
  { value: 'named_user', label: 'Always one of the named users' },
];

let draftConditionSeq = 0;

/**
 * TSET-S05 wizard — Scope → Conditions → Strategy → Capacity → Fallback →
 * Test → Review/Publish. Opened from Assignment Rules
 * (`?wizard=create&step=…` or `?wizard=edit&ruleId=…&step=…`).
 */
export function AssignmentRuleWizardDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const wizard = searchParams.get('wizard');
  const open = wizard === 'create' || wizard === 'edit';
  const ruleId = searchParams.get('ruleId');
  const existing = wizard === 'edit' && ruleId ? findAssignmentRule(ruleId) : undefined;

  if (!open) return null;

  return <RuleForm key={existing?.id ?? 'new'} existing={existing} searchParams={searchParams} setSearchParams={setSearchParams} />;
}

function RuleForm({
  existing,
  searchParams,
  setSearchParams,
}: {
  existing: ReturnType<typeof findAssignmentRule>;
  searchParams: URLSearchParams;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
}) {
  const step = searchParams.get('step') ?? 'scope';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['wizard', 'ruleId', 'step']) next.delete(key);
      return next;
    });

  const setStep = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', id);
      return next;
    });

  const [name, setName] = useState(existing?.name ?? '');
  const [branchId, setBranchId] = useState<string>(existing?.scope.branchId ?? '');
  const [numberId, setNumberId] = useState<string>(existing?.scope.numberId ?? '');
  const [priority, setPriority] = useState(existing?.priority ?? 1);
  const [conditions, setConditions] = useState<AssignmentCondition[]>(existing?.conditions ?? []);
  const [strategy, setStrategy] = useState<AssignmentStrategy>(existing?.strategy ?? 'round_robin');
  const [ownerFirst, setOwnerFirst] = useState(existing?.ownerFirst ?? false);
  const [eligibleTeamIds, setEligibleTeamIds] = useState<string[]>(existing?.eligibleTeamIds ?? []);
  const [eligibleUserIds, setEligibleUserIds] = useState<string[]>(existing?.eligibleUserIds ?? []);
  const [respectCapacity, setRespectCapacity] = useState(existing?.respectCapacity ?? true);
  const [fallbackQueueId, setFallbackQueueId] = useState<string>(existing?.fallbackQueueId ?? '');
  const [submitted, setSubmitted] = useState<'active' | 'draft' | null>(null);

  const numbersInBranch = branchId ? whatsappNumbers.filter((n) => n.branchId === branchId) : whatsappNumbers;
  const teamsInBranch = branchId ? teams.filter((t) => t.branchId === branchId) : teams;

  const addCondition = () =>
    setConditions((prev) => [...prev, { id: `draft_cond_${draftConditionSeq++}`, field: 'team', operator: 'is', value: '' }]);
  const updateCondition = (id: string, patch: Partial<AssignmentCondition>) =>
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCondition = (id: string) => setConditions((prev) => prev.filter((c) => c.id !== id));

  const toggleTeam = (teamId: string) =>
    setEligibleTeamIds((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]));
  const toggleUser = (userId: string) =>
    setEligibleUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));

  const draftScope = { branchId: branchId || null, numberId: numberId || null };
  const conflicts = assignmentRules.filter(
    (r) => r.id !== existing?.id && r.scope.branchId === draftScope.branchId && r.scope.numberId === draftScope.numberId && r.priority === priority,
  );

  const selectedNumber = numberId ? findWhatsAppNumber(numberId) : undefined;
  const numberDisconnected = Boolean(selectedNumber && selectedNumber.connectionStatus === 'disconnected');

  const simulation = simulateAssignmentRule(
    { scope: draftScope, eligibleUserIds, eligibleTeamIds, fallbackQueueId: fallbackQueueId || null },
    {},
  );
  const noEligibleDestination = simulation.eligiblePoolIds.length > 0 && simulation.selectedMemberId === null;
  const emptyPool = simulation.eligiblePoolIds.length === 0;
  // Soft "obvious loop" signal: the fallback queue resolves to the exact
  // same people as the eligible pool, so unmatched work never actually
  // reaches anyone new — a warning, not a publish blocker, since the rule
  // still technically routes.
  const fallbackQueue = fallbackQueueId ? fallbackQueues.find((q) => q.id === fallbackQueueId) : undefined;
  const fallbackLoopRisk = Boolean(
    fallbackQueue &&
      fallbackQueue.memberIds.length > 0 &&
      simulation.eligiblePoolIds.length > 0 &&
      fallbackQueue.memberIds.every((id) => simulation.eligiblePoolIds.includes(id)),
  );

  const validationIssues: string[] = [
    ...(conflicts.length > 0 ? [`Priority ${priority} is already used by "${conflicts[0].name}" in this scope.`] : []),
    ...(emptyPool ? ['No eligible destination — no named user(s)/team(s) selected yet.'] : []),
    ...(noEligibleDestination ? ['No eligible destination — every named user/team in the pool is currently ineligible (inactive, unavailable, or over capacity).'] : []),
    ...(!fallbackQueueId ? ['No fallback queue selected for unmatched work.'] : []),
    ...(numberDisconnected ? [`${selectedNumber?.displayName} is disconnected — routing here will not send until it's reconnected.`] : []),
  ];

  if (submitted) {
    return (
      <>
        <Drawer open title={existing ? `Edit ${existing.name}` : 'Create assignment rule'} onClose={close} width="wide" footer={<Button variant="secondary" onClick={close}>Close</Button>}>
          <div className="crm-invite-success">
            <Badge tone="success">{submitted === 'active' ? 'Rule published' : 'Rule saved as draft'}</Badge>
            <p>
              {name || 'This rule'} is now {submitted === 'active' ? 'active and routing new work' : 'saved as a draft — publish it once you\'re ready.'}
            </p>
          </div>
        </Drawer>
        <Toast tone="success" message={submitted === 'active' ? 'Rule published' : 'Draft saved'} onDismiss={() => {}} />
      </>
    );
  }

  return (
    <Drawer
      open
      title={existing ? `Edit ${existing.name}` : 'Create assignment rule'}
      subtitle="Scope, ordered conditions, strategy, capacity, fallback, then test and publish."
      onClose={close}
      width="wide"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <div style={{ flex: 1 }} />
          {step !== 'scope' ? (
            <Button variant="secondary" onClick={() => setStep(steps[Math.max(steps.findIndex((s) => s.id === step) - 1, 0)].id)}>
              Back
            </Button>
          ) : null}
          {step !== 'review' ? (
            <Button
              variant="primary"
              disabled={step === 'scope' && !name.trim()}
              onClick={() => setStep(steps[Math.min(steps.findIndex((s) => s.id === step) + 1, steps.length - 1)].id)}
            >
              Continue
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setSubmitted('draft')}>Save as draft</Button>
              <Button variant="primary" disabled={validationIssues.length > 0} onClick={() => setSubmitted('active')}>
                Publish
              </Button>
            </>
          )}
        </>
      }
    >
      <Stepper items={steps} currentId={step} />

      <div className="crm-invite-form" style={{ marginTop: 'var(--crm-space-4)' }}>
        {step === 'scope' ? (
          <>
            <Input label="Rule name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Delhi Support — VIP tag priority" />
            <div className="crm-invite-grid">
              <Select label="Branch" options={[{ value: '', label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} value={branchId} onChange={(e) => setBranchId(e.target.value)} />
              <Select label="Number" options={[{ value: '', label: 'All numbers' }, ...numbersInBranch.map((n) => ({ value: n.id, label: n.displayName }))]} value={numberId} onChange={(e) => setNumberId(e.target.value)} />
              <Input label="Priority" type="number" min={1} value={priority} onChange={(e) => setPriority(Number(e.target.value) || 1)} hint="Lower number evaluates first within the same scope." />
            </div>
            {conflicts.length > 0 ? <Banner tone="danger" title="Priority conflict" description={`Also used by "${conflicts[0].name}" in this scope.`} /> : null}
          </>
        ) : null}

        {step === 'conditions' ? (
          <>
            <p>Ordered conditions this rule must match. Evaluated top to bottom.</p>
            {conditions.map((condition, index) => (
              <div key={condition.id} className="crm-rule-condition">
                <span className="crm-rule-condition__index">{index + 1}</span>
                <Select label="Field" hideLabel options={conditionFields.map((f) => ({ value: f, label: f.replace('_', ' ') }))} value={condition.field} onChange={(e) => updateCondition(condition.id, { field: e.target.value as AssignmentCondition['field'] })} />
                <Select label="Operator" hideLabel options={[{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }, { value: 'in', label: 'in' }]} value={condition.operator} onChange={(e) => updateCondition(condition.id, { operator: e.target.value as AssignmentCondition['operator'] })} />
                <Input label="Value" hideLabel value={condition.value} onChange={(e) => updateCondition(condition.id, { value: e.target.value })} placeholder="value" />
                <IconButton label="Remove condition" icon={<Trash2 />} variant="outline" onClick={() => removeCondition(condition.id)} />
              </div>
            ))}
            <Button variant="secondary" size="sm" iconLeft={<Plus />} onClick={addCondition}>
              Add condition
            </Button>
          </>
        ) : null}

        {step === 'strategy' ? (
          <>
            <Select label="Strategy" options={strategyOptions} value={strategy} onChange={(e) => setStrategy(e.target.value as AssignmentStrategy)} />
            <Toggle label="Existing owner first" description="Route to the contact's existing owner when they're eligible, before applying the strategy above." checked={ownerFirst} onChange={setOwnerFirst} />

            {strategy === 'named_user' ? (
              <div className="crm-invite-panel">
                <strong>Eligible users</strong>
                {teamMembers.filter((m) => m.employmentStatus === 'active').map((m) => (
                  <Checkbox key={m.id} label={m.name} checked={eligibleUserIds.includes(m.id)} onChange={() => toggleUser(m.id)} />
                ))}
              </div>
            ) : (
              <div className="crm-invite-panel">
                <strong>Eligible team(s)</strong>
                {teamsInBranch.map((t) => (
                  <Checkbox key={t.id} label={t.name} checked={eligibleTeamIds.includes(t.id)} onChange={() => toggleTeam(t.id)} />
                ))}
                {strategy === 'named_team' && eligibleTeamIds.length > 1 ? <p className="crm-field__hint">Named team strategy uses only the first selected team.</p> : null}
              </div>
            )}
          </>
        ) : null}

        {step === 'capacity' ? (
          <Toggle label="Respect member capacity" description="Skip members who are at or over capacity for the relevant work type." checked={respectCapacity} onChange={setRespectCapacity} />
        ) : null}

        {step === 'fallback' ? (
          <>
            <Select label="Fallback queue" options={[{ value: '', label: 'No fallback' }, ...fallbackQueues.map((q) => ({ value: q.id, label: q.name }))]} value={fallbackQueueId} onChange={(e) => setFallbackQueueId(e.target.value)} />
            {!fallbackQueueId ? <Banner tone="warning" title="No fallback configured" description="Unmatched work from this rule will have nowhere to land." /> : null}
          </>
        ) : null}

        {step === 'test' ? (
          <div className="crm-rule-simulation">
            <strong>Simulation trace</strong>
            <div className="crm-rule-simulation__row"><span>Matched rule</span><span>{name || 'This draft'}</span></div>
            <div className="crm-rule-simulation__row"><span>Eligible pool</span><span>{simulation.eligiblePoolIds.length} member(s)</span></div>
            <div className="crm-rule-simulation__row">
              <span>Excluded</span>
              <span>{simulation.excluded.length === 0 ? 'None' : `${simulation.excluded.length} — ${simulation.excluded.map((e) => teamMembers.find((m) => m.id === e.memberId)?.name ?? e.memberId).join(', ')}`}</span>
            </div>
            {simulation.excluded.map((e) => (
              <p key={e.memberId} className="crm-rule-simulation__reason">{teamMembers.find((m) => m.id === e.memberId)?.name}: {e.reasons.join(' ')}</p>
            ))}
            <div className="crm-rule-simulation__row">
              <span>Selected destination</span>
              <span>{simulation.selectedMemberId ? teamMembers.find((m) => m.id === simulation.selectedMemberId)?.name : 'None — falls back'}</span>
            </div>
            <div className="crm-rule-simulation__row">
              <span>Fallback</span>
              <span>{fallbackQueueId ? fallbackQueues.find((q) => q.id === fallbackQueueId)?.name : 'Not configured'}</span>
            </div>
          </div>
        ) : null}

        {step === 'review' ? (
          <div className="crm-invite-review">
            <div className="crm-invite-review__row"><span>Name</span><span>{name || '—'}</span></div>
            <div className="crm-invite-review__row"><span>Scope</span><span>{branchId ? branches.find((b) => b.id === branchId)?.name : 'All branches'} · {numberId ? findWhatsAppNumber(numberId)?.displayName : 'All numbers'}</span></div>
            <div className="crm-invite-review__row"><span>Priority</span><span>{priority}</span></div>
            <div className="crm-invite-review__row"><span>Conditions</span><span>{conditions.length}</span></div>
            <div className="crm-invite-review__row"><span>Strategy</span><span>{strategyOptions.find((s) => s.value === strategy)?.label}{ownerFirst ? ' · owner-first' : ''}</span></div>
            <div className="crm-invite-review__row"><span>Respect capacity</span><span>{respectCapacity ? 'Yes' : 'No'}</span></div>
            <div className="crm-invite-review__row"><span>Fallback</span><span>{fallbackQueueId ? fallbackQueues.find((q) => q.id === fallbackQueueId)?.name : 'None'}</span></div>
            {validationIssues.length > 0 ? (
              <Banner tone="danger" title="Can't publish yet" description={validationIssues.join(' ')} />
            ) : (
              <Banner tone="info" title="Ready to publish" description="This rule passes scope, eligibility and fallback validation." />
            )}
            {fallbackLoopRisk ? (
              <Banner
                tone="warning"
                title="Fallback doesn't reach anyone new"
                description="The fallback queue is made up of the exact same people as the eligible pool — unmatched work will bounce back to the same destination instead of finding someone new. You can still publish, but consider a different fallback."
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
