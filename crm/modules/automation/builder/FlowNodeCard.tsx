import { AlertTriangle, OctagonAlert } from 'lucide-react';
import type { FlowNode, ValidationIssue } from '../domain/types';
import { nodeLabel } from '../automation-labels';
import { nodeIcon } from './node-icons';
import { nodeSummary } from './node-summary';

export function FlowNodeCard({
  node,
  selected,
  issues,
  onSelect,
}: {
  node: FlowNode;
  selected: boolean;
  issues: ValidationIssue[];
  onSelect: () => void;
}) {
  const Icon = nodeIcon[node.type];
  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');

  return (
    <button
      id={`aut-node-${node.id}`}
      type="button"
      className={`crm-aut-node${selected ? ' is-selected' : ''}${hasError ? ' has-error' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="crm-aut-node__icon" aria-hidden="true">
        <Icon size={16} />
      </span>
      <span className="crm-aut-node__body">
        <span className="crm-aut-node__type">{nodeLabel[node.type]}</span>
        <span className="crm-aut-node__label">{node.label}</span>
        <span className="crm-aut-node__summary">{nodeSummary(node)}</span>
      </span>
      {hasError ? (
        <span className="crm-aut-node__flag crm-aut-node__flag--error" title="Has a blocking error" aria-hidden="true">
          <OctagonAlert size={14} />
        </span>
      ) : hasWarning ? (
        <span className="crm-aut-node__flag crm-aut-node__flag--warning" title="Has a warning" aria-hidden="true">
          <AlertTriangle size={14} />
        </span>
      ) : null}
    </button>
  );
}
