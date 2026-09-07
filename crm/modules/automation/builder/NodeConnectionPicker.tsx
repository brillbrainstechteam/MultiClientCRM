import { Unlink } from 'lucide-react';
import { Button, Popover } from '@crm/design-system';
import { coreNodeLabel } from '../automation-labels';
import { coreNodeTypes, type CoreNodeType, type FlowNode } from '../domain/types';
import { nodeIcon } from './node-icons';

export function NodeConnectionPicker({
  open,
  onClose,
  nodes,
  excludeNodeIds,
  hasCurrentValue,
  onCreate,
  onConnectExisting,
  onDisconnect,
}: {
  open: boolean;
  onClose: () => void;
  nodes: FlowNode[];
  excludeNodeIds: string[];
  hasCurrentValue: boolean;
  onCreate: (type: CoreNodeType) => void;
  onConnectExisting: (nodeId: string) => void;
  onDisconnect: () => void;
}) {
  const connectable = nodes.filter((n) => !excludeNodeIds.includes(n.id));

  return (
    <Popover open={open} title="Add or connect a step" onClose={onClose}>
      <div className="crm-aut-picker">
        <section>
          <h4 className="crm-aut-picker__heading">Add a new step</h4>
          <ul className="crm-aut-picker__list">
            {coreNodeTypes.map((type) => {
              const Icon = nodeIcon[type];
              return (
                <li key={type}>
                  <button className="crm-aut-picker__option" onClick={() => onCreate(type)}>
                    <Icon size={16} aria-hidden="true" />
                    {coreNodeLabel[type]}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {connectable.length > 0 ? (
          <section>
            <h4 className="crm-aut-picker__heading">Connect to an existing step</h4>
            <ul className="crm-aut-picker__list">
              {connectable.map((node) => {
                const Icon = nodeIcon[node.type];
                return (
                  <li key={node.id}>
                    <button className="crm-aut-picker__option" onClick={() => onConnectExisting(node.id)}>
                      <Icon size={16} aria-hidden="true" />
                      {node.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {hasCurrentValue ? (
          <Button variant="ghost" size="sm" iconLeft={<Unlink />} onClick={onDisconnect}>
            Disconnect this path
          </Button>
        ) : null}
      </div>
    </Popover>
  );
}
