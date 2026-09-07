import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Drawer, Select, Toast } from '@crm/design-system';
import { findMember, findWorkload } from '../team-access-mock-data';
import { workTypeLabels, workTypes } from '../team-access-types';

const availabilityOptions = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'away', label: 'Away' },
  { value: 'offline', label: 'Offline' },
];

/**
 * Change availability / capacity (SPEC §8 "Availability"). When work exists,
 * asks explicitly whether to keep it, hand it over now, or only route new
 * work elsewhere — never silently strands or reassigns existing work.
 */
export function AvailabilityDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get('drawer') === 'availability' && Boolean(searchParams.get('memberId'));
  const memberId = searchParams.get('memberId') ?? '';
  const [toast, setToast] = useState<string | null>(null);
  const [handling, setHandling] = useState<'keep' | 'handover' | 'new-only'>('keep');

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'memberId']) next.delete(key);
      return next;
    });

  if (!open) return null;

  const member = findMember(memberId);
  if (!member) return null;

  const workload = findWorkload(memberId);
  const hasOpenWork = workload && (workload.openConversations > 0 || workload.callsDue > 0 || workload.leadsOpen > 0);

  return (
    <>
      <Drawer
        open
        title={`Change availability — ${member.name}`}
        subtitle="Availability affects new work routing immediately. Existing work is never moved without an explicit choice."
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setToast(`Availability updated for ${member.name}.`);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Select label="Availability" options={availabilityOptions} defaultValue={member.availability} />

        <div style={{ marginTop: 'var(--crm-space-4)' }}>
          <strong>Capacity by work type</strong>
          <ul>
            {workTypes.map((wt) => {
              const c = member.capacityByWorkType[wt];
              return (
                <li key={wt}>
                  {workTypeLabels[wt]}: {c.current}/{c.max ?? '∞'}
                </li>
              );
            })}
          </ul>
        </div>

        {hasOpenWork ? (
          <div style={{ marginTop: 'var(--crm-space-4)' }}>
            <Badge tone="warning">This member currently holds open work</Badge>
            <p style={{ marginTop: 8 }}>What should happen to it?</p>
            <Select
              label="Existing work handling"
              hideLabel
              options={[
                { value: 'keep', label: 'Keep existing work with this member' },
                { value: 'handover', label: 'Hand over existing work now' },
                { value: 'new-only', label: 'Route only new work elsewhere — keep existing work' },
              ]}
              value={handling}
              onChange={(e) => setHandling(e.target.value as typeof handling)}
            />
          </div>
        ) : null}
      </Drawer>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  );
}
