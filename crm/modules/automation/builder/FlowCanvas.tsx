import { useEffect, useState, type ReactNode } from 'react';
import { Play, Plus, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { IconButton } from '@crm/design-system';
import type { AutomationFlow, CoreNodeType, FlowNode, ValidationIssue } from '../domain/types';
import { createDefaultNode, findNode, hasSingleNext, insertNewNodeAt, nextPointersOf, setPointer, type NextPointer } from './flow-graph';
import { FlowNodeCard } from './FlowNodeCard';
import { NodeConnectionPicker } from './NodeConnectionPicker';

const START_OWNER = '__start__';

interface PickerTarget {
  ownerId: string;
  pointer: NextPointer;
}

export function FlowCanvas({
  flow,
  selectedNodeId,
  triggerSelected,
  issuesByNode,
  onSelectNode,
  onSelectTrigger,
  onChange,
}: {
  flow: AutomationFlow;
  selectedNodeId: string | null;
  triggerSelected: boolean;
  issuesByNode: Map<string, ValidationIssue[]>;
  onSelectNode: (nodeId: string) => void;
  onSelectTrigger: () => void;
  onChange: (nodes: FlowNode[], startNodeId: string, detail?: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const rendered = new Set<string>();

  useEffect(() => {
    if (!selectedNodeId) return;
    const el = document.getElementById(`aut-node-${selectedNodeId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedNodeId]);

  const applyPointer = (ownerId: string, pointerKey: string, value: string | null) => {
    if (ownerId === START_OWNER) {
      if (value) onChange(flow.nodes, value, 'Changed the flow entry step.');
      return;
    }
    const next = flow.nodes.map((n) => (n.id === ownerId ? setPointer(n, pointerKey, value) : n));
    onChange(next, flow.startNodeId, 'Reconnected a step.');
  };

  const createAt = (ownerId: string, pointerKey: string, type: CoreNodeType) => {
    if (ownerId === START_OWNER) {
      // Start has no owning node in `flow.nodes` — create directly and point
      // the trigger's entry step at it, handing off the previous entry step.
      const created = createDefaultNode(type);
      const withNext = hasSingleNext(created) ? ({ ...created, next: flow.startNodeId } as FlowNode) : created;
      onChange([...flow.nodes, withNext], created.id, 'Added a new first step.');
      onSelectNode(created.id);
      return;
    }
    const { nodes, newNodeId } = insertNewNodeAt(flow.nodes, ownerId, pointerKey, type);
    onChange(nodes, flow.startNodeId, `Added a ${type.replace('_', ' ')} step.`);
    onSelectNode(newNodeId);
  };

  const closePicker = () => setPicker(null);

  const renderConnector = (ownerId: string, pointer: NextPointer, laneLabel?: string) => {
    const isOpen = picker?.ownerId === ownerId && picker.pointer.key === pointer.key;
    return (
      <div className="crm-aut-canvas__connector" key={`${ownerId}-${pointer.key}`}>
        {laneLabel ? <span className="crm-aut-canvas__lane-label">{laneLabel}</span> : null}
        <span className="crm-aut-canvas__connector-line" aria-hidden="true" />
        <IconButton
          label={pointer.value ? 'Change connection' : 'Add step'}
          icon={<Plus size={14} />}
          size="sm"
          onClick={() => setPicker({ ownerId, pointer })}
        />
        <NodeConnectionPicker
          open={isOpen}
          onClose={closePicker}
          nodes={flow.nodes}
          excludeNodeIds={[ownerId]}
          hasCurrentValue={ownerId !== START_OWNER && Boolean(pointer.value)}
          onCreate={(type) => {
            closePicker();
            createAt(ownerId, pointer.key, type);
          }}
          onConnectExisting={(nodeId) => {
            closePicker();
            applyPointer(ownerId, pointer.key, nodeId);
          }}
          onDisconnect={() => {
            closePicker();
            applyPointer(ownerId, pointer.key, null);
          }}
        />
        {pointer.value ? renderChain(pointer.value) : null}
      </div>
    );
  };

  function renderChain(nodeId: string): ReactNode {
    if (rendered.has(nodeId)) {
      const existing = findNode(flow.nodes, nodeId);
      return (
        <button className="crm-aut-canvas__rejoin" onClick={() => onSelectNode(nodeId)}>
          ↳ Continues at "{existing?.label ?? nodeId}"
        </button>
      );
    }
    const node = findNode(flow.nodes, nodeId);
    if (!node) return null;
    rendered.add(nodeId);

    const pointers = nextPointersOf(node);
    const isBranch = node.type === 'simple_branch';

    return (
      <div className="crm-aut-canvas__node-wrap" key={nodeId}>
        <FlowNodeCard
          node={node}
          selected={selectedNodeId === nodeId}
          issues={issuesByNode.get(nodeId) ?? []}
          onSelect={() => onSelectNode(nodeId)}
        />
        {pointers.length === 0 ? null : isBranch ? (
          <div className="crm-aut-canvas__lanes">
            {pointers.map((pointer) => (
              <div className="crm-aut-canvas__lane" key={pointer.key}>
                {renderConnector(nodeId, pointer, pointer.label)}
              </div>
            ))}
          </div>
        ) : (
          renderConnector(nodeId, pointers[0])
        )}
      </div>
    );
  }

  return (
    <div className="crm-aut-canvas">
      <div className="crm-aut-canvas__zoom">
        <IconButton label="Zoom out" icon={<ZoomOut />} size="sm" onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))} />
        <span className="crm-aut-canvas__zoom-value">{Math.round(zoom * 100)}%</span>
        <IconButton label="Zoom in" icon={<ZoomIn />} size="sm" onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))} />
        <IconButton label="Fit / reset zoom" icon={<Maximize2 />} size="sm" onClick={() => setZoom(1)} />
      </div>
      <div className="crm-aut-canvas__scroll">
        <div className="crm-aut-canvas__stage" style={{ transform: `scale(${zoom})` }}>
          <div className="crm-aut-canvas__node-wrap">
            <button
              type="button"
              className={`crm-aut-node crm-aut-node--start${triggerSelected ? ' is-selected' : ''}`}
              onClick={onSelectTrigger}
              aria-pressed={triggerSelected}
            >
              <span className="crm-aut-node__icon" aria-hidden="true">
                <Play size={16} />
              </span>
              <span className="crm-aut-node__body">
                <span className="crm-aut-node__type">Start</span>
                <span className="crm-aut-node__label">Trigger</span>
                <span className="crm-aut-node__summary">{flow.trigger.summary}</span>
              </span>
            </button>
            {renderConnector(START_OWNER, { key: 'start', label: 'Start', value: flow.startNodeId })}
          </div>
        </div>
      </div>
    </div>
  );
}
