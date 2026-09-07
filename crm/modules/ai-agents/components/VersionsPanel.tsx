import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, ConfirmDialog } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import { useAiAgentsStore, useVersions } from '../ai-agents-store';
import { can } from '../permissions';

/** AIA-S02 Versions tab — Draft/Active/history + rollback (SKILL.md "Versions": lightweight, no diff/merge tooling). */
export function VersionsPanel({ agentId }: { agentId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();
  const { dispatch } = useAiAgentsStore();
  const versions = useVersions(agentId);
  const canManage = can(role, 'ai_agent.edit');

  const rollbackVersionNumber = searchParams.get('version');
  const rollbackTarget = versions.find((v) => String(v.number) === rollbackVersionNumber?.replace('v', ''));
  const rollbackOpen = searchParams.get('modal') === 'rollback' && Boolean(rollbackTarget);

  const closeRollback = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      next.delete('version');
      return next;
    });

  return (
    <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
      <p className="crm-aia__section-hint">Every meaningful change creates a new draft version. Rollback restores an older version as a new draft — it must be re-tested before activation.</p>
      <div className="crm-aia__picker-list">
        {versions.map((version) => (
          <div key={version.id} className="crm-aia__source-row">
            <div className="crm-aia__source-main">
              <span className="crm-aia__source-name">Version {version.number} {version.label === 'active' ? '(Active)' : version.label === 'draft' ? '(Draft)' : ''}</span>
              <span className="crm-aia__source-meta">{version.snapshotSummary}</span>
              <span className="crm-aia__source-meta">
                By {findUser(version.createdBy)?.name ?? version.createdBy} · Created {new Date(version.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {version.testedAt ? ` · Tested ${new Date(version.testedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                {version.activatedAt ? ` · Activated ${new Date(version.activatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
              </span>
              {version.note ? <span className="crm-aia__source-meta">{version.note}</span> : null}
            </div>
            <div className="crm-aia__badge-row">
              <Badge tone={version.label === 'active' ? 'success' : version.label === 'draft' ? 'info' : 'neutral'}>
                {version.label === 'active' ? 'Active' : version.label === 'draft' ? 'Draft' : 'Archived'}
              </Badge>
              {canManage && version.label !== 'draft' ? (
                <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref(`/ai-agents/${agentId}`, { tab: 'versions', modal: 'rollback', version: `v${version.number}` }))}>
                  Restore as new draft
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={rollbackOpen}
        title="Restore this version"
        message={`Restore version ${rollbackTarget?.number} as a new draft? The current draft will be replaced, and re-testing is required before this agent can be activated.`}
        confirmLabel="Restore as new draft"
        onCancel={closeRollback}
        onConfirm={() => {
          if (rollbackTarget) dispatch({ type: 'ROLLBACK', agentId, toVersionId: rollbackTarget.id, actorId: currentUser.id });
          closeRollback();
        }}
      />
    </div>
  );
}
