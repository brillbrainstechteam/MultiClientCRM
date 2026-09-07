/**
 * Pure graph-editing helpers for the Flow Canvas. The canvas is a
 * structured, deterministic node list rather than a free-form x/y drawing
 * surface (CODE_FIRST_ADAPTER.md §4 — no heavy canvas dependency). "Connect"
 * is expressed as choosing a next-step target from existing nodes or
 * creating a new one inline, which stays fully keyboard-accessible.
 */

import type { CoreNodeType, FlowNode } from '../domain/types';
import { coreNodeLabel } from '../automation-labels';

export function findNode(nodes: FlowNode[], id: string | null | undefined): FlowNode | undefined {
  if (!id) return undefined;
  return nodes.find((node) => node.id === id);
}

/** Every node type that carries a single `next` pointer (as opposed to branch/terminal types). */
export function hasSingleNext(node: FlowNode): node is FlowNode & { next: string | null } {
  return node.type !== 'simple_branch' && node.type !== 'end' && node.type !== 'human_handover' && node.type !== 'ai_agent_handoff' && node.type !== 'advanced_condition' && node.type !== 'random_split';
}

function newId(type: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${type}_${random}`;
}

/** Sensible starting configuration for a freshly added node. */
export function createDefaultNode(type: CoreNodeType, id: string = newId(type)): FlowNode {
  const label = coreNodeLabel[type];
  switch (type) {
    case 'send_message':
      return { id, type, label, next: null, config: { mode: 'text', text: '' } };
    case 'question':
      return { id, type, label, next: null, config: { prompt: '', answerType: 'open_text', required: true } };
    case 'simple_branch':
      return {
        id,
        type,
        label,
        config: {
          mode: 'answer_option',
          branches: [{ id: newId('branch'), label: 'Option 1', matchValue: '', next: null }],
          fallback: { label: 'Otherwise', next: null },
        },
      };
    case 'delay_wait':
      return { id, type, label, next: null, config: { mode: 'duration', durationValue: 1, durationUnit: 'hours' } };
    case 'update_contact':
      return { id, type, label, next: null, config: { updates: [] } };
    case 'human_handover':
      return { id, type, label, next: null, config: { targetType: 'team', reason: '', preserveContext: true } };
    case 'ai_agent_handoff':
      return { id, type, label, next: null, config: {} };
    case 'end':
      return { id, type, label, config: { outcomeLabel: 'Flow complete' } };
    default:
      return { id, type: 'end', label: 'End', config: { outcomeLabel: 'Flow complete' } };
  }
}

/** All pointer locations in a flow that could be re-targeted — feeds the "Next step" selects. */
export interface NextPointer {
  /** Unique key for this pointer within the node (`next`, or `branch:<branchId>`, or `fallback`). */
  key: string;
  label: string;
  value: string | null;
}

export function nextPointersOf(node: FlowNode): NextPointer[] {
  if (node.type === 'simple_branch') {
    return [
      ...node.config.branches.map((b) => ({ key: `branch:${b.id}`, label: `Branch — ${b.label || 'Untitled'}`, value: b.next })),
      { key: 'fallback', label: `Fallback — ${node.config.fallback.label || 'Otherwise'}`, value: node.config.fallback.next },
    ];
  }
  if (node.type === 'delay_wait' && node.config.mode === 'wait_for_reply') {
    return [
      { key: 'next', label: 'Reply received', value: node.next },
      { key: 'noResponseNext', label: 'No response', value: node.config.noResponseNext ?? null },
    ];
  }
  if (hasSingleNext(node)) {
    return [{ key: 'next', label: 'Next step', value: node.next }];
  }
  return [];
}

export function setPointer(node: FlowNode, key: string, value: string | null): FlowNode {
  if (node.type === 'simple_branch') {
    if (key === 'fallback') {
      return { ...node, config: { ...node.config, fallback: { ...node.config.fallback, next: value } } };
    }
    const branchId = key.replace('branch:', '');
    return {
      ...node,
      config: {
        ...node.config,
        branches: node.config.branches.map((b) => (b.id === branchId ? { ...b, next: value } : b)),
      },
    };
  }
  if (node.type === 'delay_wait' && key === 'noResponseNext') {
    return { ...node, config: { ...node.config, noResponseNext: value } };
  }
  if (hasSingleNext(node) && key === 'next') {
    return { ...node, next: value } as FlowNode;
  }
  return node;
}

/** Insert a brand-new node at a pointer, taking over whatever that pointer previously targeted. */
export function insertNewNodeAt(
  nodes: FlowNode[],
  ownerId: string,
  pointerKey: string,
  type: CoreNodeType,
): { nodes: FlowNode[]; newNodeId: string } {
  const owner = findNode(nodes, ownerId);
  if (!owner) return { nodes, newNodeId: '' };
  const pointer = nextPointersOf(owner).find((p) => p.key === pointerKey);
  const downstream = pointer?.value ?? null;

  const created = createDefaultNode(type);
  const withNewNode = [...nodes, hasSingleNext(created) ? { ...created, next: downstream } : created];
  const rewired = withNewNode.map((n) => (n.id === ownerId ? setPointer(n, pointerKey, created.id) : n));
  return { nodes: rewired, newNodeId: created.id };
}

/** Duplicate a node, splicing the copy immediately after the original in its primary chain. */
export function duplicateNode(nodes: FlowNode[], nodeId: string): { nodes: FlowNode[]; newNodeId: string } {
  const original = findNode(nodes, nodeId);
  if (!original) return { nodes, newNodeId: '' };

  const clone: FlowNode = { ...structuredClone(original), id: newId(original.type), label: `${original.label} (copy)` };

  if (hasSingleNext(original)) {
    const cloneWithNext = { ...clone, next: original.next } as FlowNode;
    const rewiredOriginal = { ...original, next: clone.id } as FlowNode;
    return {
      nodes: nodes.map((n) => (n.id === nodeId ? rewiredOriginal : n)).concat(cloneWithNext),
      newNodeId: clone.id,
    };
  }
  // Branch/terminal nodes: append disconnected — the builder highlights it as
  // needing to be wired in, same as a freshly added node would.
  return { nodes: [...nodes, clone], newNodeId: clone.id };
}

/** Remove a node, repointing any single incoming reference to whatever it pointed at next. */
export function removeNode(nodes: FlowNode[], nodeId: string): FlowNode[] {
  const target = findNode(nodes, nodeId);
  const replacement = target && hasSingleNext(target) ? target.next : null;

  return nodes
    .filter((n) => n.id !== nodeId)
    .map((n) => {
      if (n.type === 'simple_branch') {
        return {
          ...n,
          config: {
            ...n.config,
            branches: n.config.branches.map((b) => (b.next === nodeId ? { ...b, next: replacement } : b)),
            fallback: n.config.fallback.next === nodeId ? { ...n.config.fallback, next: replacement } : n.config.fallback,
          },
        };
      }
      if (n.type === 'delay_wait' && n.config.noResponseNext === nodeId) {
        n = { ...n, config: { ...n.config, noResponseNext: replacement } };
      }
      if (hasSingleNext(n) && n.next === nodeId) {
        return { ...n, next: replacement } as FlowNode;
      }
      return n;
    });
}
