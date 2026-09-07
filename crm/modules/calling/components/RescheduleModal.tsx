import { useState } from 'react';
import { Button, Input, Modal, Textarea } from '@crm/design-system';
import type { CallTask } from '../domain';

export interface RescheduleModalProps {
  open: boolean;
  onClose: () => void;
  taskIds: string[];
  tasks: CallTask[];
  onReschedule: (taskIds: string[], dueAt: string, reason: string) => void;
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}
function toTimeInput(iso: string): string {
  return new Date(iso).toTimeString().slice(0, 5);
}

/** Row/bulk reschedule — used by the Queue's Reschedule action. */
export function RescheduleModal({ open, onClose, taskIds, tasks, onReschedule }: RescheduleModalProps) {
  const first = tasks.find((t) => t.id === taskIds[0]);
  const [date, setDate] = useState(first ? toDateInput(first.dueAt) : '');
  const [time, setTime] = useState(first ? toTimeInput(first.dueAt) : '10:00');
  const [reason, setReason] = useState('');

  if (!open) return null;

  const confirm = () => {
    if (!date || !time) return;
    const dueAt = new Date(`${date}T${time}:00+05:30`).toISOString();
    onReschedule(taskIds, dueAt, reason);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={taskIds.length > 1 ? `Reschedule ${taskIds.length} calls` : 'Reschedule call'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!date || !time} onClick={confirm}>
            Save new time
          </Button>
        </>
      }
    >
      <div className="crm-reschedule">
        <div className="crm-reschedule__row">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <Textarea
          label="Reason (optional)"
          hint="Kept on the task's activity history."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </Modal>
  );
}
