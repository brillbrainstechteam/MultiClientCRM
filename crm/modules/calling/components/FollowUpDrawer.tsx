import { useState } from 'react';
import { Button, Checkbox, Drawer, Input, Select, Textarea } from '@crm/design-system';
import { findUser, users } from '@crm/mock-data';
import { findDuplicateFutureTask } from '../domain';
import type { CallTask } from '../domain';
import { canCreateParallelFollowUp } from '../permissions';
import type { RoleKey } from '@crm/mock-data';

export interface FollowUpDetails {
  dueAt: string;
  assigneeId: string;
  reason: string;
  notes: string;
  reminder: boolean;
  addToCalendar: boolean;
}

export interface FollowUpDrawerProps {
  open: boolean;
  task: CallTask;
  contactName: string;
  tasks: CallTask[];
  role: RoleKey;
  onClose: () => void;
  onSchedule: (details: FollowUpDetails) => void;
  onKeepExisting: (existingTaskId: string) => void;
  onRescheduleExisting: (existingTaskId: string, dueAt: string) => void;
}

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

/** CALL-S05 — Follow-Up drawer with mandatory duplicate-conflict handling. */
export function FollowUpDrawer({
  open,
  task,
  contactName,
  tasks,
  role,
  onClose,
  onSchedule,
  onKeepExisting,
  onRescheduleExisting,
}: FollowUpDrawerProps) {
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState('11:00');
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState(true);
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [forceCreate, setForceCreate] = useState(false);
  const [parallelReasonValue, setParallelReasonValue] = useState('');

  if (!open) return null;

  const duplicate = findDuplicateFutureTask(tasks, task.contactId, task.id);
  const showConflict = !!duplicate && !forceCreate;

  const duplicateAssignee = duplicate?.assigneeId ? findUser(duplicate.assigneeId) : null;

  const confirm = () => {
    if (!date || !time || !assigneeId || !reason) return;
    const dueAt = new Date(`${date}T${time}:00+05:30`).toISOString();
    onSchedule({ dueAt, assigneeId, reason, notes, reminder, addToCalendar });
    setDate(defaultDate());
    setTime('11:00');
    setReason('');
    setNotes('');
    setForceCreate(false);
  };

  return (
    <Drawer
      open={open}
      title="Schedule follow-up"
      subtitle={contactName}
      onClose={onClose}
      footer={
        showConflict ? undefined : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!date || !time || !assigneeId || !reason} onClick={confirm}>
              Schedule follow-up
            </Button>
          </>
        )
      }
    >
      {showConflict && duplicate ? (
        <div className="crm-followup__conflict">
          <p className="crm-followup__conflict-title">A future call is already scheduled for this contact</p>
          <p className="crm-followup__conflict-detail">
            {formatDateTime(duplicate.dueAt)} — assigned to {duplicateAssignee ? duplicateAssignee.name : 'Unassigned'}
          </p>
          <div className="crm-followup__conflict-actions">
            <Button variant="secondary" onClick={() => onKeepExisting(duplicate.id)}>
              Keep existing
            </Button>
            <Button
              variant="secondary"
              onClick={() => onRescheduleExisting(duplicate.id, new Date(`${date}T${time}:00+05:30`).toISOString())}
            >
              Reschedule existing
            </Button>
          </div>

          {canCreateParallelFollowUp(role) ? (
            <div className="crm-followup__parallel">
              <Textarea
                label="Reason for a parallel follow-up (required)"
                value={parallelReasonValue}
                onChange={(e) => setParallelReasonValue(e.target.value)}
                hint="Manager/Admin only — creates a second active task for this contact."
              />
              <Button
                variant="danger"
                disabled={!parallelReasonValue}
                onClick={() => setForceCreate(true)}
              >
                Create another anyway
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="crm-followup">
          <div className="crm-followup__row">
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
          <Select
            label="Assignee"
            options={users.filter((u) => u.role !== 'owner').map((u) => ({ value: u.id, label: u.name }))}
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            required
          />
          <Input
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Confirm bulk order pricing"
            required
          />
          <Textarea label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Checkbox label="Remind me before this call" checked={reminder} onChange={(e) => setReminder(e.target.checked)} />
          <Checkbox
            label="Add to calendar"
            checked={addToCalendar}
            onChange={(e) => setAddToCalendar(e.target.checked)}
          />
          {forceCreate && duplicate ? (
            <p className="crm-followup__parallel-note">
              Creating a parallel task alongside the existing follow-up on {formatDateTime(duplicate.dueAt)}.
            </p>
          ) : null}
        </div>
      )}
    </Drawer>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
