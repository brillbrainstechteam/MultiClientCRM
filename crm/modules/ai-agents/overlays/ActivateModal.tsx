import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, Modal } from '@crm/design-system';
import { teams } from '@crm/mock-data';
import { ReadinessChecklist } from '../components/ReadinessChecklist';
import { useAiAgentsStore, useSafetyPolicy, useVersions } from '../ai-agents-store';
import { useAgentReadiness } from '../use-agent-readiness';

/** AIA-S02 Activate modal (SKILL.md "Mandatory before activation" — a true safety gate). */
export function ActivateModal({ agentId }: { agentId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { currentUser } = useWorkspace();
  const { dispatch } = useAiAgentsStore();
  const readiness = useAgentReadiness(agentId);
  const safety = useSafetyPolicy(agentId);
  const versions = useVersions(agentId);
  const draftVersion = versions.find((v) => v.label === 'draft' || v.label === 'active');

  const open = searchParams.get('modal') === 'activate';
  const activated = searchParams.get('state') === 'success';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      next.delete('state');
      return next;
    });

  if (!open || !readiness || !safety) return null;

  const team = safety.handover.defaultTeamId ? teams.find((t) => t.id === safety.handover.defaultTeamId) : undefined;

  if (activated) {
    return (
      <Modal open title="Agent activated" onClose={() => { close(); navigate(scopedHref(`/ai-agents/${agentId}`)); }} footer={<Button variant="primary" onClick={() => { close(); navigate(scopedHref(`/ai-agents/${agentId}`)); }}>Done</Button>}>
        <p>The agent is now Active and can handle conversations within its configured safety boundaries.</p>
      </Modal>
    );
  }

  return (
    <Modal
      open
      title="Activate this agent"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!readiness.readyToActivate}
            onClick={() => {
              dispatch({ type: 'ACTIVATE', agentId, actorId: currentUser.id });
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('state', 'success');
                return next;
              });
            }}
          >
            Activate Agent
          </Button>
        </>
      }
    >
      <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
        <ReadinessChecklist
          readiness={readiness}
          onNavigate={(to) => {
            close();
            navigate(to === 'test' ? scopedHref(`/ai-agents/${agentId}/test`) : scopedHref(`/ai-agents/${agentId}`, { tab: to }));
          }}
        />
        {!readiness.readyToActivate ? (
          <Badge tone="danger">This agent cannot be activated until every item above is resolved.</Badge>
        ) : (
          <>
            <p className="crm-aia__section-hint">
              Version {draftVersion?.number ?? '—'} · Handover destination: {team?.name ?? 'Not set'}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
