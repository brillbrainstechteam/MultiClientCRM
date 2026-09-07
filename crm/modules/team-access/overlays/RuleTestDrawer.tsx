import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Drawer } from '@crm/design-system';
import { simulateAssignmentRule } from '../resolvers';
import { fallbackQueues, findAssignmentRule, teamMembers } from '../team-access-mock-data';

/**
 * Standalone rule Test drawer (`?drawer=test&ruleId=…`) — read-only simulation
 * for an already-published rule, reusing the same trace the wizard's Test
 * step uses so the two can never disagree.
 */
export function RuleTestDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get('drawer') === 'test' && Boolean(searchParams.get('ruleId'));
  const ruleId = searchParams.get('ruleId') ?? '';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'ruleId']) next.delete(key);
      return next;
    });

  if (!open) return null;

  const rule = findAssignmentRule(ruleId);
  if (!rule) return null;

  const simulation = simulateAssignmentRule(rule);

  return (
    <Drawer open title={`Test — ${rule.name}`} subtitle="Matched rule → excluded users → selected destination → fallback." onClose={close} footer={<Button variant="secondary" onClick={close}>Close</Button>}>
      <div className="crm-rule-simulation">
        <div className="crm-rule-simulation__row"><span>Matched rule</span><span>{rule.name}</span></div>
        <div className="crm-rule-simulation__row"><span>Eligible pool</span><span>{simulation.eligiblePoolIds.length} member(s)</span></div>
        <div className="crm-rule-simulation__row">
          <span>Excluded</span>
          <Badge tone={simulation.excluded.length ? 'warning' : 'success'}>{simulation.excluded.length}</Badge>
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
          <span>{rule.fallbackQueueId ? fallbackQueues.find((q) => q.id === rule.fallbackQueueId)?.name : 'Not configured'}</span>
        </div>
      </div>
    </Drawer>
  );
}
