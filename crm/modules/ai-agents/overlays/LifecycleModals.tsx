import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { ConfirmDialog } from '@crm/design-system';
import { useAgent, useAiAgentsStore } from '../ai-agents-store';

/** Pause / Deactivate / Delete confirmations (CODE_FIRST_ADAPTER.md `?modal=pause|deactivate|delete`). */
export function LifecycleModals({ agentId }: { agentId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { currentUser } = useWorkspace();
  const { dispatch } = useAiAgentsStore();
  const agent = useAgent(agentId);

  const modal = searchParams.get('modal');
  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      return next;
    });

  if (!agent) return null;

  return (
    <>
      <ConfirmDialog
        open={modal === 'pause'}
        title="Pause this agent"
        message="Paused agents stop handling new conversations immediately. Existing handovers already in progress are not affected. You can resume at any time."
        confirmLabel="Pause Agent"
        onCancel={close}
        onConfirm={() => {
          dispatch({ type: 'PAUSE', agentId, actorId: currentUser.id });
          close();
        }}
      />
      <ConfirmDialog
        open={modal === 'deactivate'}
        title="Deactivate this agent"
        message="Deactivating stops the agent from handling any conversations. Setup, knowledge, safety configuration and history are kept — you can reactivate later after re-testing."
        confirmLabel="Deactivate Agent"
        tone="danger"
        onCancel={close}
        onConfirm={() => {
          dispatch({ type: 'DEACTIVATE', agentId, actorId: currentUser.id });
          close();
        }}
      />
      <ConfirmDialog
        open={modal === 'delete'}
        title="Delete this agent"
        message={`Delete "${agent.name}" permanently? This removes its setup, knowledge associations and history. This cannot be undone.`}
        confirmLabel="Delete Agent"
        tone="danger"
        onCancel={close}
        onConfirm={() => {
          dispatch({ type: 'DELETE', agentId, actorId: currentUser.id });
          navigate(scopedHref('/ai-agents'));
        }}
      />
    </>
  );
}
