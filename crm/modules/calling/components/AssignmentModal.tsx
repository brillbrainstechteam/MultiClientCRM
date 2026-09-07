import { useMemo, useState } from 'react';
import { Button, Checkbox, Modal, Select } from '@crm/design-system';
import { findContact, findUser, users, type User } from '@crm/mock-data';
import type { CallTask } from '../domain';

export interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  taskIds: string[];
  tasks: CallTask[];
  onAssign: (assignments: Record<string, string>) => void;
}

/**
 * CALL-S10 Bulk Assignment, also used for a single-row Reassign (SKILL.md
 * "Contact owner vs call assignee" — reassigning here only ever touches
 * `Call Assignee`, never `Contact Owner`).
 */
export function AssignmentModal({ open, onClose, taskIds, tasks, onAssign }: AssignmentModalProps) {
  const [mode, setMode] = useState<'single' | 'equal'>('single');
  const [agentId, setAgentId] = useState('');
  const [equalAgentIds, setEqualAgentIds] = useState<string[]>([]);

  const selectedTasks = useMemo(() => tasks.filter((t) => taskIds.includes(t.id)), [tasks, taskIds]);
  const agents = users.filter((u) => u.role === 'agent' || u.role === 'manager');

  if (!open) return null;

  const currentAssignees = new Set(selectedTasks.map((t) => t.assigneeId));
  const currentAssigneeSummary =
    currentAssignees.size === 1 && [...currentAssignees][0]
      ? findUser([...currentAssignees][0] as string)?.name ?? 'Unassigned'
      : currentAssignees.size > 1
        ? 'Multiple current assignees'
        : 'Unassigned';

  const toggleEqualAgent = (id: string) => {
    setEqualAgentIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const canConfirm = mode === 'single' ? agentId !== '' : equalAgentIds.length > 0;

  const confirm = () => {
    const assignments: Record<string, string> = {};
    if (mode === 'single') {
      selectedTasks.forEach((task) => {
        assignments[task.id] = agentId;
      });
    } else {
      selectedTasks.forEach((task, index) => {
        assignments[task.id] = equalAgentIds[index % equalAgentIds.length];
      });
    }
    onAssign(assignments);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={taskIds.length > 1 ? `Assign ${taskIds.length} calls` : 'Reassign call'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canConfirm} onClick={confirm}>
            Confirm assignment
          </Button>
        </>
      }
    >
      <div className="crm-assign">
        <div className="crm-assign__summary">
          <div>
            <span className="crm-assign__label">Selected</span>
            <span className="crm-assign__value">{taskIds.length} call{taskIds.length === 1 ? '' : 's'}</span>
          </div>
          <div>
            <span className="crm-assign__label">Current assignee</span>
            <span className="crm-assign__value">{currentAssigneeSummary}</span>
          </div>
        </div>

        <p className="crm-assign__note">
          This changes <strong>Call Assignee</strong> only. Contact Owner is not affected.
        </p>

        {taskIds.length > 1 ? (
          <div className="crm-assign__mode">
            <label>
              <input
                type="radio"
                name="assign-mode"
                checked={mode === 'single'}
                onChange={() => setMode('single')}
              />
              Assign to one agent
            </label>
            <label>
              <input
                type="radio"
                name="assign-mode"
                checked={mode === 'equal'}
                onChange={() => setMode('equal')}
              />
              Distribute equally
            </label>
          </div>
        ) : null}

        {mode === 'single' ? (
          <Select
            label="Assign to"
            options={[{ value: '', label: 'Choose an agent…' }, ...agents.map((a: User) => ({ value: a.id, label: `${a.name} — ${a.roleLabel}` }))]}
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          />
        ) : (
          <fieldset className="crm-assign__equal">
            <legend>Distribute across</legend>
            {agents.map((agent) => (
              <Checkbox
                key={agent.id}
                label={agent.name}
                checked={equalAgentIds.includes(agent.id)}
                onChange={() => toggleEqualAgent(agent.id)}
              />
            ))}
          </fieldset>
        )}

        {taskIds.length <= 4 ? (
          <ul className="crm-assign__preview">
            {selectedTasks.map((task) => {
              const contact = findContact(task.contactId);
              return <li key={task.id}>{contact?.name ?? task.contactId}</li>;
            })}
          </ul>
        ) : null}
      </div>
    </Modal>
  );
}
