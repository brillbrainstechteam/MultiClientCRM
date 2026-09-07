import { useState, useEffect } from 'react';
import { Drawer, Button, FilterChip } from '@crm/design-system';
import { users, teams, whatsappNumbers } from '@crm/mock-data';
import { conversationLabels } from '../inbox-mock-data';
import type { InboxFilterState } from '../inbox-types';
import { emptyFilterState, isFilterActive } from '../inbox-types';

interface InboxFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  current: InboxFilterState;
  onApply: (f: InboxFilterState) => void;
}

function CheckGroup<T extends string>({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }
  return (
    <div className="crm-flt-group">
      <div className="crm-flt-group__title">{title}</div>
      {options.map((opt) => (
        <label key={opt.value} className="crm-flt-group__row">
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export function InboxFilterDrawer({ open, onClose, current, onApply }: InboxFilterDrawerProps) {
  const [draft, setDraft] = useState<InboxFilterState>(current);

  // Reset draft to current applied filters each time drawer opens
  useEffect(() => {
    if (open) setDraft(current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const statusOptions = [
    { value: 'open' as const, label: 'Open' },
    { value: 'pending' as const, label: 'Pending' },
    { value: 'resolved' as const, label: 'Resolved' },
  ];

  const assigneeOptions = [
    { value: '__unassigned__', label: 'Unassigned' },
    ...users.map((u) => ({ value: u.id, label: `${u.name} (${u.roleLabel})` })),
  ];

  const replyOptions = [
    { value: 'awaiting-agent', label: 'Awaiting agent reply' },
    { value: 'awaiting-customer', label: 'Awaiting customer reply' },
    { value: 'none', label: 'No pending reply' },
  ];

  const windowOptions = [
    { value: 'active', label: 'Active (>60 min)' },
    { value: 'expiring', label: 'Expiring (≤60 min)' },
    { value: 'expired', label: 'Expired / Closed' },
  ];

  const labelOptions = conversationLabels.map((l) => ({ value: l.id, label: l.name }));
  const numberOptions = whatsappNumbers.map((n) => ({ value: n.id, label: n.displayName }));
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  const hasChanges = isFilterActive(draft);

  if (!open) return null;

  return (
    <Drawer
      open={open}
      title="Filter conversations"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(emptyFilterState());
              onApply(emptyFilterState());
            }}
          >
            Reset all
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onApply(draft);
            }}
          >
            Apply filters
          </Button>
        </div>
      }
    >
      <div className="crm-flt-body">
        <CheckGroup
          title="Status"
          options={statusOptions}
          selected={draft.statuses}
          onChange={(v) => setDraft((d) => ({ ...d, statuses: v }))}
        />

        <CheckGroup
          title="Assignee"
          options={assigneeOptions}
          selected={draft.assigneeIds}
          onChange={(v) => setDraft((d) => ({ ...d, assigneeIds: v }))}
        />

        <CheckGroup
          title="Reply status"
          options={replyOptions}
          selected={draft.replyStatuses}
          onChange={(v) => setDraft((d) => ({ ...d, replyStatuses: v }))}
        />

        <CheckGroup
          title="Response window"
          options={windowOptions}
          selected={draft.responseWindowStatuses}
          onChange={(v) => setDraft((d) => ({ ...d, responseWindowStatuses: v as Array<'active' | 'expiring' | 'expired'> }))}
        />

        <CheckGroup
          title="Labels"
          options={labelOptions}
          selected={draft.labelIds}
          onChange={(v) => setDraft((d) => ({ ...d, labelIds: v }))}
        />

        <CheckGroup
          title="WhatsApp number"
          options={numberOptions}
          selected={draft.whatsappNumberIds}
          onChange={(v) => setDraft((d) => ({ ...d, whatsappNumberIds: v }))}
        />

        <CheckGroup
          title="Team"
          options={teamOptions}
          selected={draft.teamIds}
          onChange={(v) => setDraft((d) => ({ ...d, teamIds: v }))}
        />

        {!hasChanges && (
          <div style={{ color: 'var(--crm-text-muted)', fontSize: 12, paddingTop: 8 }}>
            No filters applied. Select options above and click Apply.
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ---- Active filter chip row -----------------------------------------------

interface ActiveFilterChipsProps {
  filters: InboxFilterState;
  onClearFilter: (key: keyof InboxFilterState, value?: string) => void;
  onResetAll: () => void;
}

export function ActiveFilterChips({ filters, onClearFilter, onResetAll }: ActiveFilterChipsProps) {
  const chips: Array<{ field: string; label: string; key: keyof InboxFilterState; value: string }> = [];

  for (const status of filters.statuses) {
    chips.push({ field: 'Status', label: status.charAt(0).toUpperCase() + status.slice(1), key: 'statuses', value: status });
  }

  for (const id of filters.assigneeIds) {
    const label = id === '__unassigned__' ? 'Unassigned' : (users.find((u) => u.id === id)?.name ?? id);
    chips.push({ field: 'Assignee', label, key: 'assigneeIds', value: id });
  }

  for (const id of filters.replyStatuses) {
    const map: Record<string, string> = {
      'awaiting-agent': 'Awaiting agent',
      'awaiting-customer': 'Awaiting customer',
      none: 'No pending reply',
    };
    chips.push({ field: 'Reply', label: map[id] ?? id, key: 'replyStatuses', value: id });
  }

  for (const id of filters.responseWindowStatuses) {
    const map: Record<string, string> = {
      active: 'Active',
      expiring: 'Expiring',
      expired: 'Expired',
    };
    chips.push({ field: 'Window', label: map[id] ?? id, key: 'responseWindowStatuses', value: id });
  }

  for (const id of filters.labelIds) {
    const label = conversationLabels.find((l) => l.id === id)?.name ?? id;
    chips.push({ field: 'Label', label, key: 'labelIds', value: id });
  }

  for (const id of filters.whatsappNumberIds) {
    const label = whatsappNumbers.find((n) => n.id === id)?.displayName ?? id;
    chips.push({ field: 'Number', label, key: 'whatsappNumberIds', value: id });
  }

  for (const id of filters.teamIds) {
    const label = teams.find((t) => t.id === id)?.name ?? id;
    chips.push({ field: 'Team', label, key: 'teamIds', value: id });
  }

  if (chips.length === 0) return null;

  return (
    <div className="crm-inbox-filter-chips">
      {chips.map((chip, i) => (
        <FilterChip
          key={i}
          field={chip.field}
          label={chip.label}
          onRemove={() => onClearFilter(chip.key, chip.value)}
        />
      ))}
      <button className="crm-inbox-filter-chips__reset" onClick={onResetAll}>
        Reset all
      </button>
    </div>
  );
}
