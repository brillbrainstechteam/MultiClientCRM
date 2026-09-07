import { useState } from 'react';
import { Button, Drawer, Input, Select } from '@crm/design-system';
import { formatDateTime } from '../campaigns-labels';

const timezoneOptions = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4:00)' },
  { value: 'UTC', label: 'UTC' },
];

/** CAM-DR03 — Reschedule. Changes a Scheduled campaign's send time before execution starts. */
export function RescheduleDrawer({
  open,
  currentScheduledAt,
  currentTimezone,
  onClose,
  onConfirm,
}: {
  open: boolean;
  currentScheduledAt: string | null;
  currentTimezone: string | null;
  onClose: () => void;
  onConfirm: (scheduledAt: string, timezone: string) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(currentScheduledAt ? currentScheduledAt.slice(0, 16) : '');
  const [timezone, setTimezone] = useState(currentTimezone ?? 'Asia/Kolkata');

  return (
    <Drawer
      open={open}
      title="Reschedule campaign"
      subtitle={currentScheduledAt ? `Currently scheduled for ${formatDateTime(currentScheduledAt)}` : undefined}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!scheduledAt}
            onClick={() => onConfirm(new Date(scheduledAt).toISOString(), timezone)}
          >
            Save new schedule
          </Button>
        </>
      }
    >
      <div className="crm-camp-reschedule">
        <Input label="Date & time" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        <Select label="Timezone" options={timezoneOptions} value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        <p className="crm-camp-reschedule__note">
          The candidate audience snapshot is retained. Eligibility (opt-outs, data changes) is re-checked again at the new send time.
        </p>
      </div>
    </Drawer>
  );
}
