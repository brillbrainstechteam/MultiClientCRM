import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Banner, Button, Modal, PermissionRestricted, Select, Toast } from '@crm/design-system';
import { can } from '../permissions';
import { branches } from '../team-access-mock-data';

/**
 * Audit export (`?modal=export`), permission-controlled and itself audited
 * (SKILL.md "Audit" — the export is never a silent action).
 */
export function AuditExportModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useWorkspace();
  const open = searchParams.get('modal') === 'export';
  const [branchId, setBranchId] = useState('');
  const [range, setRange] = useState('30d');
  const [exported, setExported] = useState(false);

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      return next;
    });

  if (!open) return null;

  if (!can(role, 'exportAudit')) {
    return (
      <Modal open title="Export audit history" onClose={close}>
        <PermissionRestricted
          title="Export isn't available for your role"
          description="Audit export is Owner-only in this workspace. Ask a workspace Owner if you need a copy."
        />
      </Modal>
    );
  }

  return (
    <Modal
      open
      title="Export audit history"
      onClose={close}
      footer={
        exported ? (
          <Button variant="secondary" onClick={close}>Close</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button variant="primary" onClick={() => setExported(true)}>Export</Button>
          </>
        )
      }
    >
      {exported ? (
        <div className="crm-audit-event">
          <Badge tone="success">Export started</Badge>
          <p>Your download will be ready shortly and this export has itself been recorded in the audit log.</p>
        </div>
      ) : (
        <div className="crm-audit-event">
          <Select label="Date range" options={[{ value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: '90d', label: 'Last 90 days' }]} value={range} onChange={(e) => setRange(e.target.value)} />
          <Select label="Branch" options={[{ value: '', label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]} value={branchId} onChange={(e) => setBranchId(e.target.value)} />
          <Banner tone="info" title="This export is itself audited" description="A record of who exported what, and when, is added to this same audit history." />
        </div>
      )}
      {exported ? <Toast tone="success" message="Audit export started" onDismiss={() => {}} /> : null}
    </Modal>
  );
}
