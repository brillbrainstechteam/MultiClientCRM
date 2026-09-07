import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Banner, Button, Modal, Select, Toast } from '@crm/design-system';
import { findUser, teamWorkload, unassignedWorkCount } from '@crm/mock-data';

const LARGE_IMPACT_THRESHOLD = 5;

/**
 * DASH-S15 — Reassign Pending Work. Affected work, current owner, replacement
 * owner and an explicit count; large impact is called out before Confirm.
 * "Open full workload manager" hands the complex case to Team & Access.
 */
export function ReassignWorkModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [fromUserId, setFromUserId] = useState('unassigned');
  const [toUserId, setToUserId] = useState('');
  const [done, setDone] = useState(false);

  const open = searchParams.get('modal') === 'reassign-work';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      return next;
    });

  if (!open) return null;

  const fromOptions = [
    { value: 'unassigned', label: `Unassigned (${unassignedWorkCount})` },
    ...teamWorkload
      .filter((row) => row.status === 'overloaded' || row.status === 'inactive')
      .map((row) => ({ value: row.userId, label: `${findUser(row.userId)?.name ?? row.userId} (${row.openCount})` })),
  ];

  const toOptions = teamWorkload
    .filter((row) => row.userId !== fromUserId && row.status !== 'overloaded')
    .map((row) => ({ value: row.userId, label: findUser(row.userId)?.name ?? row.userId }));

  const affectedCount =
    fromUserId === 'unassigned' ? unassignedWorkCount : teamWorkload.find((row) => row.userId === fromUserId)?.openCount ?? 0;

  if (done) {
    return (
      <Toast
        tone="success"
        message={`${affectedCount} item(s) reassigned to ${findUser(toUserId)?.name ?? 'the selected owner'}.`}
        onDismiss={() => {
          setDone(false);
          close();
        }}
      />
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reassign pending work"
      footer={
        <>
          <Button variant="secondary" onClick={() => navigate(scopedHref('/team-access', { tab: 'workload' }))}>
            Open workload manager
          </Button>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!toUserId} onClick={() => setDone(true)}>
            Confirm reassignment
          </Button>
        </>
      }
    >
      <div className="crm-reassign-modal">
        <Select label="From" options={fromOptions} value={fromUserId} onChange={(e) => { setFromUserId(e.target.value); setToUserId(''); }} />
        <Select
          label="Reassign to"
          options={[{ value: '', label: 'Select a team member' }, ...toOptions]}
          value={toUserId}
          onChange={(e) => setToUserId(e.target.value)}
        />

        <p className="crm-reassign-modal__count">
          <strong>{affectedCount}</strong> item(s) will be reassigned.
        </p>

        {affectedCount >= LARGE_IMPACT_THRESHOLD ? (
          <Banner
            tone="warning"
            title="This is a large reassignment"
            description="Double-check the receiving team member has capacity before confirming."
          />
        ) : null}
      </div>
    </Modal>
  );
}
