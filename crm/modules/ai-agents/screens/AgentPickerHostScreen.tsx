import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Banner, Button, EmptyState } from '@crm/design-system';
import { LifecycleBadge } from '../components/AgentBadges';
import { eligibleForHandoff } from '../ai-agents-selectors';
import { useCaseLabel } from '../ai-agents-labels';
import { useAgents } from '../ai-agents-store';

const sourceLabel: Record<string, string> = {
  automation: 'Automation',
};

/**
 * `/ai-agents/picker` — the only bridge into Automation's canvas
 * (SKILL.md "Exception: Automation handoff connectivity"). Automation only
 * ever gets an `agentId` back — no agent behaviour is configured here.
 */
export default function AgentPickerHostScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const agents = useAgents();
  const eligible = eligibleForHandoff(agents);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const source = searchParams.get('source') ?? 'automation';
  const flowId = searchParams.get('flowId');
  const nodeId = searchParams.get('nodeId');
  const returnTo = searchParams.get('returnTo');
  const selected = eligible.find((agent) => agent.id === selectedId) ?? null;

  const returnParams: Record<string, string> = {};
  if (selectedId) returnParams.agentId = selectedId;
  if (flowId) returnParams.flowId = flowId;
  if (nodeId) returnParams.nodeId = nodeId;

  return (
    <div className="crm-aia__page">
      <PageHeader
        title="Choose an AI Agent"
        description="Only Active agents can be selected for Hand off to AI Agent. Configure the agent's behaviour in AI Agents, not here."
        actions={<Badge tone="brand" appearance="outline">Requested by {sourceLabel[source] ?? source}</Badge>}
      />

      {flowId || nodeId ? (
        <Banner tone="info" title="Flow context preserved" description={`This selection will return to ${flowId ? `flow ${flowId}` : 'Automation'}${nodeId ? `, node ${nodeId}` : ''}.`} />
      ) : null}

      {eligible.length === 0 ? (
        <EmptyState
          title="No active agents yet"
          description="Activate an agent in AI Agents before it can be selected for a Hand off to AI Agent step."
          actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/ai-agents'))}>Go to AI Agents</Button>}
        />
      ) : (
        <div className="crm-aia__picker-list">
          {eligible.map((agent) => (
            <div key={agent.id} className={`crm-aia__picker-card${selectedId === agent.id ? ' crm-aia__picker-card--selected' : ''}`}>
              <div className="crm-aia__source-main">
                <span className="crm-aia__source-name">{agent.name}</span>
                <span className="crm-aia__source-meta">{useCaseLabel[agent.useCase]} · {agent.objective}</span>
              </div>
              <div className="crm-aia__badge-row">
                <LifecycleBadge status={agent.lifecycleStatus} />
                {selectedId === agent.id ? (
                  <Badge tone="success" icon={<CheckCircle2 />}>Selected</Badge>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setSelectedId(agent.id)}>Select</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected ? (
        <div className="crm-aia__card">
          <p>
            Selected <strong>{selected.name}</strong> for {sourceLabel[source] ?? source}.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(returnTo ? scopedHref(returnTo, returnParams) : scopedHref('/automation', returnParams))}
          >
            Return to {sourceLabel[source] ?? source} with this agent
          </Button>
        </div>
      ) : null}
    </div>
  );
}
