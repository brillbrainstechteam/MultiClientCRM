import { useState } from 'react';
import { Button, Modal, Select } from '@crm/design-system';

const formatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
];

const scopeOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All recipients' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'excluded', label: 'Excluded' },
];

/** CAM-M06 — Export Options. Deterministic prototype export — no real file generation (CLAUDE.md §Prototype limitations). */
export function ExportRecipientsModal({
  open,
  recipientCount,
  onClose,
  onExport,
}: {
  open: boolean;
  recipientCount: number;
  onClose: () => void;
  onExport: (format: string, scope: string) => void;
}) {
  const [format, setFormat] = useState('csv');
  const [scope, setScope] = useState('all');

  return (
    <Modal
      open={open}
      title="Export recipient results"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onExport(format, scope)}>Export</Button>
        </>
      }
    >
      <div className="crm-camp-export">
        <Select label="Format" options={formatOptions} value={format} onChange={(e) => setFormat(e.target.value)} />
        <Select label="Include" options={scopeOptions} value={scope} onChange={(e) => setScope(e.target.value)} />
        <p className="crm-camp-export__note">{recipientCount.toLocaleString('en-IN')} recipient(s) match the current filter.</p>
      </div>
    </Modal>
  );
}
