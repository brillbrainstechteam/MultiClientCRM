import { useState } from 'react';
import { Button, Drawer, Textarea } from '@crm/design-system';
import type { OnboardingNumberRecord } from '@crm/mock-data';

export interface ManualSummaryDrawerProps {
  open: boolean;
  record: OnboardingNumberRecord;
  onClose: () => void;
  onSave: () => void;
}

/** H03 — Add a manual history summary. Quick notes, not a real importer (SKILL.md "History"). */
export function ManualSummaryDrawer({ open, record, onClose, onSave }: ManualSummaryDrawerProps) {
  const [notes, setNotes] = useState('');

  return (
    <Drawer
      open={open}
      title="Add a manual history summary"
      subtitle={record.displayName}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!notes.trim()} onClick={onSave}>Save summary</Button>
        </>
      }
    >
      <Textarea
        label="Summary of past orders, quotes and follow-ups"
        placeholder="e.g. Long-time sales customer since 2023, mostly bulk orders, prefers Hindi..."
        rows={8}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
    </Drawer>
  );
}
