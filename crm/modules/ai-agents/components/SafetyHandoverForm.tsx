import { useState } from 'react';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Banner, Button, Checkbox, Input, Select, Toggle } from '@crm/design-system';
import { teams, users } from '@crm/mock-data';
import { useAiAgentsStore, useSafetyPolicy } from '../ai-agents-store';
import { can } from '../permissions';
import { autonomyExplanation, autonomyLabel, dataAccessLabel, maskingLabel } from '../ai-agents-labels';
import type { AgentSafetyPolicy, AutonomyPreset, DataAccessScope, MaskedFieldCategory, SensitiveActionKey } from '../domain/types';

/** AIA-S02 Safety & Handover — the mandatory trust configuration (SKILL.md "Safety & Control"). */
export function SafetyHandoverForm({ agentId }: { agentId: string }) {
  const { role, currentUser } = useWorkspace();
  const { dispatch } = useAiAgentsStore();
  const policy = useSafetyPolicy(agentId);
  const canManage = can(role, 'ai_agent.manage_safety');
  const [newTopic, setNewTopic] = useState('');

  if (!policy) return null;

  const update = (updates: Partial<AgentSafetyPolicy>) => {
    dispatch({ type: 'UPDATE_SAFETY', agentId, policy: { ...policy, ...updates }, actorId: currentUser.id });
  };

  const setPreset = (preset: AutonomyPreset) => update({ autonomyPreset: preset });

  const toggleSensitiveAction = (key: SensitiveActionKey) =>
    update({
      sensitiveActions: policy.sensitiveActions.map((action) =>
        action.key === key ? { ...action, requiresApproval: !action.requiresApproval } : action,
      ),
    });

  const toggleDataAccess = (scope: DataAccessScope) =>
    update({
      dataAccess: policy.dataAccess.map((entry) => (entry.scope === scope ? { ...entry, allowed: !entry.allowed } : entry)),
    });

  const toggleMasking = (category: MaskedFieldCategory) =>
    update({ masking: policy.masking.map((rule) => (rule.category === category ? { ...rule, masked: !rule.masked } : rule)) });

  const addTopic = () => {
    if (!newTopic.trim()) return;
    update({ restrictedTopics: [...policy.restrictedTopics, newTopic.trim()] });
    setNewTopic('');
  };
  const removeTopic = (topic: string) => update({ restrictedTopics: policy.restrictedTopics.filter((t) => t !== topic) });

  const teamOptions = [{ value: '', label: 'Select a team…' }, ...teams.map((t) => ({ value: t.id, label: t.name }))];
  const fallbackUserOptions = [{ value: '', label: 'No specific fallback user' }, ...users.map((u) => ({ value: u.id, label: u.name }))];

  return (
    <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
      {!policy.handover.defaultTeamId ? (
        <Banner tone="danger" title="Missing human handover destination" description="A default team is required before this agent can be tested or activated." />
      ) : null}

      <section className="crm-aia__section">
        <h3 className="crm-aia__section-title">Answer autonomy</h3>
        <p className="crm-aia__section-hint">{autonomyExplanation[policy.autonomyPreset]}</p>
        <div className="crm-aia__preset-group">
          {(Object.keys(autonomyLabel) as AutonomyPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={!canManage}
              className={`crm-aia__preset-card${policy.autonomyPreset === preset ? ' crm-aia__preset-card--active' : ''}`}
              onClick={() => setPreset(preset)}
            >
              <span className="crm-aia__preset-title">{autonomyLabel[preset]}</span>
              <span className="crm-aia__preset-desc">{autonomyExplanation[preset]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="crm-aia__section">
        <h3 className="crm-aia__section-title">Sensitive actions</h3>
        <p className="crm-aia__section-hint">Require human approval before the agent commits to any of these. Default is to require approval.</p>
        {policy.sensitiveActions.map((action) => (
          <div key={action.key} className="crm-aia__toggle-row">
            <span>{action.label}</span>
            <Toggle label={`Require approval for ${action.label}`} hideLabel checked={action.requiresApproval} onChange={() => toggleSensitiveAction(action.key)} disabled={!canManage} />
          </div>
        ))}
      </section>

      <section className="crm-aia__section">
        <h3 className="crm-aia__section-title">Restricted topics</h3>
        <p className="crm-aia__section-hint">The agent refuses and hands over instead of answering these.</p>
        <div className="crm-aia__tag-list">
          {policy.restrictedTopics.length === 0 ? (
            <span className="crm-aia__muted">No restricted topics configured.</span>
          ) : (
            policy.restrictedTopics.map((topic) => (
              <Badge key={topic} tone="neutral" appearance="outline">
                {topic}
                {canManage ? (
                  <button type="button" aria-label={`Remove ${topic}`} onClick={() => removeTopic(topic)} style={{ marginLeft: 6, border: 'none', background: 'none', cursor: 'pointer' }}>
                    ×
                  </button>
                ) : null}
              </Badge>
            ))
          )}
        </div>
        {canManage ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Input label="Add restricted topic" hideLabel value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="e.g. Legal advice" />
            <Button variant="secondary" size="sm" onClick={addTopic}>Add</Button>
          </div>
        ) : null}
      </section>

      <section className="crm-aia__section">
        <h3 className="crm-aia__section-title">Data access</h3>
        <p className="crm-aia__section-hint">Least privilege by default — only allow what this agent needs.</p>
        {policy.dataAccess.map((entry) => (
          <div key={entry.scope} className="crm-aia__toggle-row">
            <span>{dataAccessLabel[entry.scope]}</span>
            <Toggle label={`Allow ${dataAccessLabel[entry.scope]}`} hideLabel checked={entry.allowed} onChange={() => toggleDataAccess(entry.scope)} disabled={!canManage} />
          </div>
        ))}
      </section>

      <section className="crm-aia__section">
        <h3 className="crm-aia__section-title">Sensitive data</h3>
        <p className="crm-aia__section-hint">Masked fields stay hidden from the agent unless explicitly permitted.</p>
        {policy.masking.map((rule) => (
          <div key={rule.category} className="crm-aia__toggle-row">
            <span>{maskingLabel[rule.category]}</span>
            <Toggle label={`Mask ${maskingLabel[rule.category]}`} hideLabel checked={rule.masked} onChange={() => toggleMasking(rule.category)} disabled={!canManage} />
          </div>
        ))}
      </section>

      <section className="crm-aia__section">
        <h3 className="crm-aia__section-title">Safe failure</h3>
        <p className="crm-aia__section-hint">
          Missing data, an unavailable integration or low confidence → hand over. Restricted topics → refuse and hand over.
          Sensitive actions → request approval. These behaviours are fixed for every agent.
        </p>
      </section>

      <section className="crm-aia__section">
        <h3 className="crm-aia__section-title">Human handover</h3>
        <div className="crm-aia__form-grid">
          <Select
            label="Default team / department"
            required
            options={teamOptions}
            value={policy.handover.defaultTeamId ?? ''}
            disabled={!canManage}
            onChange={(e) => update({ handover: { ...policy.handover, defaultTeamId: e.target.value || null } })}
          />
          <Select
            label="Fallback user (optional)"
            options={fallbackUserOptions}
            value={policy.handover.fallbackUserId ?? ''}
            disabled={!canManage}
            onChange={(e) => update({ handover: { ...policy.handover, fallbackUserId: e.target.value || undefined } })}
          />
          <Select
            label="Outside working hours"
            options={[
              { value: 'queue', label: 'Add to queue for next business hours' },
              { value: 'next-available', label: 'Route to next available agent' },
              { value: 'no-handover-warning', label: 'Warn customer no one is available' },
            ]}
            value={policy.handover.outsideHoursFallback}
            disabled={!canManage}
            onChange={(e) => update({ handover: { ...policy.handover, outsideHoursFallback: e.target.value as AgentSafetyPolicy['handover']['outsideHoursFallback'] } })}
          />
          <Select
            label="No eligible agent available"
            options={[
              { value: 'queue', label: 'Add to shared queue' },
              { value: 'notify-manager', label: 'Notify branch manager' },
            ]}
            value={policy.handover.noEligibleAgentFallback}
            disabled={!canManage}
            onChange={(e) => update({ handover: { ...policy.handover, noEligibleAgentFallback: e.target.value as AgentSafetyPolicy['handover']['noEligibleAgentFallback'] } })}
          />
        </div>
        <HandoverPreview />
      </section>

      <section className="crm-aia__section">
        <Checkbox
          label="I have reviewed this agent's data access and safety configuration."
          checked={policy.dataAccessReviewed}
          disabled={!canManage}
          onChange={(e) => update({ dataAccessReviewed: e.target.checked })}
        />
      </section>
    </div>
  );
}

/** Deterministic handover summary preview (SKILL.md "Human Handover" — conversation summary, collected details, reason, next action). */
function HandoverPreview() {
  return (
    <div className="crm-aia__card" style={{ padding: 'var(--crm-space-3)', background: 'var(--crm-surface-band)' }}>
      <p className="crm-aia__section-hint" style={{ margin: 0 }}>Handover preview</p>
      <p style={{ margin: 0, fontSize: 'var(--crm-font-size-sm)' }}>
        <strong>Summary:</strong> Customer asked about a topic outside the agent's scope.<br />
        <strong>Collected details:</strong> Name, phone number, order reference (if shared).<br />
        <strong>Reason:</strong> Restricted topic / low confidence / explicit request.<br />
        <strong>Recommended next action:</strong> Review the conversation and reply directly in Inbox.
      </p>
    </div>
  );
}
