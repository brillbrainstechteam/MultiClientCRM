import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { findBranch, findWhatsAppNumber } from '@crm/mock-data';
import { Badge, Banner, Button } from '@crm/design-system';
import { assignmentRules, findFallbackQueue } from '../team-access-mock-data';
import { conflictingRules, rulesWithConflicts, rulesWithLoopRisk, rulesWithoutFallback } from '../team-access-selectors';

const strategyLabel: Record<string, string> = {
  owner_first_round_robin: 'Existing owner first, then round-robin',
  round_robin: 'Round-robin',
  named_user: 'Named user',
  named_team: 'Named team',
};

/** TSET-S05 — Assignment Rules. Ordered rule list; create/edit and test live in overlays. */
export default function AssignmentRulesScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const forcedState = searchParams.get('state');

  const openWizard = (extra: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(extra).forEach(([key, value]) => next.set(key, value));
      return next;
    });

  const conflicted = rulesWithConflicts();
  const noFallback = rulesWithoutFallback();
  const loopRisk = rulesWithLoopRisk();
  const orderedRules = [...assignmentRules].sort((a, b) => a.priority - b.priority);

  return (
    <div className="crm-rules">
      <PageHeader
        title="Assignment Rules"
        description="Automatic routing for new conversations, leads and calls. Ordered by priority within each branch/number scope."
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Team & Access' }, { label: 'Assignment Rules' }]}
        actions={
          <Button variant="primary" iconLeft={<Plus />} onClick={() => openWizard({ wizard: 'create', step: 'scope' })}>
            Create rule
          </Button>
        }
      />

      {forcedState === 'conflict' || conflicted.length > 0 ? (
        <Banner
          tone="danger"
          title="Priority conflict"
          description={`${(conflicted.length || 1)} rule(s) share the same scope and priority — the engine can't determine which applies first. Give each rule in the same scope a distinct priority.`}
        />
      ) : null}

      {forcedState === 'no-fallback' || noFallback.length > 0 ? (
        <Banner
          tone="warning"
          title="Active rule without a fallback"
          description={`${(noFallback.length || 1)} active rule(s) have no fallback queue. Unmatched work from them has nowhere to land.`}
        />
      ) : null}

      {forcedState === 'loop-risk' || loopRisk.length > 0 ? (
        <Banner
          tone="warning"
          title="Fallback doesn't reach anyone new"
          description={`${(loopRisk.length || 1)} rule(s) have a fallback queue made up of the exact same people as the eligible pool — unmatched work bounces back to the same destination instead of finding someone new.`}
        />
      ) : null}

      <div className="crm-rules__list">
        {orderedRules.map((rule) => {
          const hasConflict = conflictingRules(rule).length > 0;
          return (
            <div key={rule.id} className="crm-rules__row">
              <div className="crm-rules__row-head">
                <strong>{rule.name}</strong>
                <Badge tone={rule.status === 'active' ? 'success' : rule.status === 'draft' ? 'warning' : 'neutral'}>{rule.status}</Badge>
                {hasConflict ? <Badge tone="danger">Priority conflict</Badge> : null}
                {!rule.fallbackQueueId ? <Badge tone="warning">No fallback</Badge> : null}
                {loopRisk.some((r) => r.id === rule.id) ? <Badge tone="warning">Fallback loop risk</Badge> : null}
              </div>
              <div className="crm-rules__row-grid">
                <span>Scope: {rule.scope.branchId ? findBranch(rule.scope.branchId)?.name : 'All branches'} · {rule.scope.numberId ? findWhatsAppNumber(rule.scope.numberId)?.displayName : 'All numbers'}</span>
                <span>Priority: {rule.priority}</span>
                <span>Strategy: {strategyLabel[rule.strategy]}{rule.ownerFirst ? ' (owner-first)' : ''}</span>
                <span>Fallback: {rule.fallbackQueueId ? findFallbackQueue(rule.fallbackQueueId)?.name : '—'}</span>
                <span>Unmatched (7d): {rule.unmatchedLast7d}</span>
                <span>v{rule.version} · edited {new Date(rule.lastEditedAt).toLocaleDateString('en-IN')} by {rule.lastEditedBy}</span>
              </div>
              <div className="crm-rules__row-actions">
                <Button variant="secondary" size="sm" onClick={() => openWizard({ wizard: 'edit', ruleId: rule.id, step: 'scope' })}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openWizard({ drawer: 'test', ruleId: rule.id })}>
                  Test
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
