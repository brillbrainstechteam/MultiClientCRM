import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, EmptyState, PermissionRestricted, Toast } from '@crm/design-system';
import { BuilderPalette } from '../builder/BuilderPalette';
import { BuilderTopBar } from '../builder/BuilderTopBar';
import { FlowCanvas } from '../builder/FlowCanvas';
import { NodeConfigPanel } from '../builder/NodeConfigPanel';
import { PublishModal } from '../builder/PublishModal';
import { TestRunnerPanel } from '../builder/TestRunnerPanel';
import { TriggerPanel } from '../builder/TriggerPanel';
import { ValidationPanel } from '../builder/ValidationPanel';
import { VersionsPanel } from '../builder/VersionsPanel';
import { ActivityPanel } from '../builder/ActivityPanel';
import { duplicateNode, removeNode } from '../builder/flow-graph';
import { can } from '../permissions';
import type { FlowNode, FlowTestStep, FlowTrigger, ValidationIssue } from '../domain/types';
import { validateFlow } from '../domain/validation';
import {
  publishFlow,
  recordTestRun,
  rollbackFlow,
  sendForApproval,
  updateFlowMeta,
  updateFlowNodes,
  updateFlowTrigger,
  useAuditEvents,
  useFlow,
  useFlows,
  useVersions,
} from '../data';

type RightPanel = 'node' | 'validation' | 'test' | 'versions' | 'activity' | null;

/**
 * AUT-S03 — Flow Builder. One visual canvas with contextual drawers/panels
 * (SKILL.md "First-prototype primary surfaces"). Node/trigger selection,
 * the active side panel, the Publish modal and the active validation issue
 * are all query-state so any of these states is directly reproducible by URL
 * (CLAUDE.md §5).
 */
export default function FlowBuilderScreen() {
  const { flowId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();

  const flow = useFlow(flowId);
  const allFlows = useFlows();
  const versions = useVersions(flowId ?? '');
  const auditEvents = useAuditEvents(flowId ?? '');

  const canView = can(role, 'view');
  const canEdit = can(role, 'edit');
  const canTest = can(role, 'test');
  const canPublish = can(role, 'publish');
  const canRollback = can(role, 'rollback');
  const canViewAudit = can(role, 'view_audit');
  const canExportAudit = can(role, 'export_audit');

  const nodeParam = searchParams.get('node');
  const panelParam = searchParams.get('panel') as RightPanel;
  const modalParam = searchParams.get('modal');
  const issueParam = searchParams.get('issue');
  const toastParam = searchParams.get('toast');

  const issues = useMemo(() => (flow ? validateFlow(flow, { allFlows }) : []), [flow, allFlows]);
  const issuesByNode = useMemo(() => {
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      if (!issue.nodeId) continue;
      map.set(issue.nodeId, [...(map.get(issue.nodeId) ?? []), issue]);
    }
    return map;
  }, [issues]);

  const updateParams = (mutate: (next: URLSearchParams) => void) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      mutate(next);
      return next;
    });
  };

  const selectNode = (nodeId: string) =>
    updateParams((next) => {
      next.set('node', nodeId);
      next.set('panel', 'node');
      next.delete('issue');
    });

  const selectTrigger = () =>
    updateParams((next) => {
      next.set('node', 'start');
      next.set('panel', 'node');
      next.delete('issue');
    });

  /** Highlights a node on the canvas without leaving the panel currently open (validation/test deep-links). */
  const highlightNode = (nodeId: string) => updateParams((next) => next.set('node', nodeId));

  const closeRightPanel = () =>
    updateParams((next) => {
      next.delete('node');
      next.delete('panel');
      next.delete('issue');
    });

  const setPanel = (panel: 'validation' | 'test' | 'versions' | 'activity' | null) =>
    updateParams((next) => {
      if (panel) next.set('panel', panel);
      else next.delete('panel');
    });

  const openPublish = () => updateParams((next) => next.set('modal', 'publish'));
  const closePublish = () => updateParams((next) => next.delete('modal'));
  const dismissToast = () => updateParams((next) => next.delete('toast'));

  const onSelectIssue = (issue: ValidationIssue) =>
    updateParams((next) => {
      if (issue.nodeId) next.set('node', issue.nodeId);
      next.set('panel', 'validation');
      next.set('issue', issue.id);
    });

  if (!canView) {
    return (
      <PermissionRestricted
        title="You do not have access to this flow"
        description={`Your role cannot open the Flow Builder. Ask a workspace owner or manager if you need access.`}
        actions={
          <Button variant="secondary" onClick={() => navigate(scopedHref('/automation'))}>
            Back to Library
          </Button>
        }
      />
    );
  }

  if (!flow) {
    return (
      <div className="crm-aut-builder__missing">
        <EmptyState
          title="Flow not found"
          description="This flow may have been deleted, or the link is out of date."
          actions={
            <Button variant="primary" onClick={() => navigate(scopedHref('/automation'))}>
              Back to Library
            </Button>
          }
        />
      </div>
    );
  }

  const selectedNode: FlowNode | undefined =
    nodeParam && nodeParam !== 'start' ? flow.nodes.find((n) => n.id === nodeParam) : undefined;
  const triggerSelected = nodeParam === 'start';

  const handleCanvasChange = (nodes: FlowNode[], startNodeId: string, detail?: string) =>
    updateFlowNodes(flow.id, nodes, startNodeId, currentUser.id, detail);

  const handleUpdateNode = (node: FlowNode) => {
    const nodes = flow.nodes.map((n) => (n.id === node.id ? node : n));
    updateFlowNodes(flow.id, nodes, flow.startNodeId, currentUser.id, `Edited "${node.label}".`);
  };

  const handleDuplicateNode = () => {
    if (!selectedNode) return;
    const { nodes, newNodeId } = duplicateNode(flow.nodes, selectedNode.id);
    updateFlowNodes(flow.id, nodes, flow.startNodeId, currentUser.id, `Duplicated "${selectedNode.label}".`);
    if (newNodeId) selectNode(newNodeId);
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    const nodes = removeNode(flow.nodes, selectedNode.id);
    updateFlowNodes(flow.id, nodes, flow.startNodeId, currentUser.id, `Deleted "${selectedNode.label}".`);
    closeRightPanel();
  };

  const handleRename = (name: string) => updateFlowMeta(flow.id, { name }, currentUser.id);

  const handleTriggerChange = (trigger: FlowTrigger) => updateFlowTrigger(flow.id, trigger, currentUser.id);

  const handleTestComplete = (result: {
    testContactId: string;
    path: FlowTestStep[];
    updates: { label: string; value: string }[];
    status: 'complete' | 'failed';
    errorMessage?: string;
  }) => recordTestRun(flow.id, result.testContactId, result.path, result.updates, currentUser.id, result.status, result.errorMessage);

  const handlePublish = (options: { scheduledStart?: string | null; stopDate?: string | null }) =>
    publishFlow(flow.id, currentUser.id, options);

  const handleSendForApproval = () => sendForApproval(flow.id, currentUser.id);

  const handleRollback = (versionId: string) => rollbackFlow(flow.id, versionId, currentUser.id);

  const handleExportAudit = () => updateParams((next) => next.set('toast', 'audit-exported'));

  return (
    <div className="crm-aut-builder">
      <BuilderTopBar
        flow={flow}
        issues={issues}
        canEdit={canEdit}
        canPublish={canPublish}
        canTest={canTest}
        canViewAudit={canViewAudit}
        activePanel={panelParam === 'node' ? null : panelParam}
        onRename={handleRename}
        onSetPanel={setPanel}
        onOpenPublish={openPublish}
      />

      <div className="crm-aut-builder__body">
        <BuilderPalette />

        <FlowCanvas
          flow={flow}
          selectedNodeId={selectedNode?.id ?? null}
          triggerSelected={triggerSelected}
          issuesByNode={issuesByNode}
          onSelectNode={selectNode}
          onSelectTrigger={selectTrigger}
          onChange={handleCanvasChange}
        />

        <aside className="crm-aut-builder__panel">
          {panelParam === 'validation' ? (
            <ValidationPanel issues={issues} activeIssueId={issueParam} onSelectIssue={onSelectIssue} onClose={closeRightPanel} />
          ) : panelParam === 'test' ? (
            <TestRunnerPanel flow={flow} canTest={canTest} onClose={closeRightPanel} onSelectNode={highlightNode} onComplete={handleTestComplete} />
          ) : panelParam === 'versions' ? (
            <VersionsPanel versions={versions} canRollback={canRollback} onRollback={handleRollback} onClose={closeRightPanel} />
          ) : panelParam === 'activity' ? (
            <ActivityPanel events={auditEvents} canExport={canExportAudit} onExport={handleExportAudit} onClose={closeRightPanel} />
          ) : triggerSelected ? (
            <TriggerPanel flow={flow} canEdit={canEdit} onChange={handleTriggerChange} onClose={closeRightPanel} />
          ) : selectedNode ? (
            <NodeConfigPanel
              flow={flow}
              node={selectedNode}
              canEdit={canEdit}
              onUpdateNode={handleUpdateNode}
              onDuplicate={handleDuplicateNode}
              onDelete={handleDeleteNode}
              onClose={closeRightPanel}
            />
          ) : (
            <div className="crm-aut-builder__hint">
              <p>Select a step on the canvas to configure it.</p>
              <p>Or use Validate, Test, Versions or Activity above.</p>
            </div>
          )}
        </aside>
      </div>

      <PublishModal
        open={modalParam === 'publish'}
        flow={flow}
        issues={issues}
        onClose={closePublish}
        onPublish={handlePublish}
        onSendForApproval={handleSendForApproval}
        onOpenValidation={() => {
          closePublish();
          setPanel('validation');
        }}
      />

      {toastParam === 'audit-exported' ? (
        <div className="crm-aut-builder__toast">
          <Toast tone="success" message="Audit log exported." onDismiss={dismissToast} />
        </div>
      ) : null}
    </div>
  );
}
