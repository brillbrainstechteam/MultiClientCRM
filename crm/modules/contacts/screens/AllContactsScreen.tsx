import { useMemo, useState } from 'react';
import { MapPin, Plus, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterChip,
  SearchField,
  Select,
  type Column,
} from '@crm/design-system';
import { findUser, users, type Contact } from '@crm/mock-data';
import { ConsentBadge, ContactIdentity, contentStateView, SalesTierBadge, StageBadge } from '../components';
import { assignZone } from '../zones/zone-assignment';
import { getContactZone, useContactZones } from '../zones/contact-zone-store';
import {
  consentOptions,
  distinctSources,
  filterContacts,
  type ContactFilters,
} from '../contact-selectors';
import { consentLabel, stageLabel } from '../contact-labels';
import { can } from '../permissions';

const stageOptions = [
  { value: 'new', label: 'New' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'customer', label: 'Customer' },
  { value: 'dormant', label: 'Dormant' },
];

/**
 * CON-S02 — All Contacts. The default operational repository: multi-field
 * search, removable filter chips, a configurable table, row/page/all-filtered
 * selection and a contextual bulk toolbar. Bulk action targets (Assign, Tags,
 * Export, …) are wired to their drawers in Batch 2.
 */
export default function AllContactsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { branchId, whatsappNumberId, role } = useWorkspace();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useContactZones(); // re-render when bulk zone assignment changes

  const scope = {
    branchId: branchId === 'all' ? null : branchId,
    whatsappNumberId: whatsappNumberId === 'all' ? null : whatsappNumberId,
  };

  const filters: ContactFilters = {
    q: searchParams.get('q'),
    stage: searchParams.get('stage'),
    consent: searchParams.get('consent'),
    ownerId: searchParams.get('ownerId'),
    source: searchParams.get('source'),
  };

  const forcedNoResults = searchParams.get('state') === 'no-results';
  const rows = useMemo(
    () => (forcedNoResults ? [] : filterContacts(scope, filters)),
    [forcedNoResults, scope.branchId, scope.whatsappNumberId, filters.q, filters.stage, filters.consent, filters.ownerId, filters.source],
  );

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      next.delete('state');
      return next;
    });
  };

  /** Open an overlay (drawer/modal) carrying the current bulk selection count. */
  const openOverlay = (params: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(params)) next.set(key, value);
      return next;
    });

  const activeChips = [
    filters.stage ? { key: 'stage', field: 'Stage', label: stageLabel[filters.stage as keyof typeof stageLabel] ?? filters.stage } : null,
    filters.consent ? { key: 'consent', field: 'Consent', label: consentLabel[filters.consent as keyof typeof consentLabel] ?? filters.consent } : null,
    filters.ownerId ? { key: 'ownerId', field: 'Owner', label: findUser(filters.ownerId)?.name ?? filters.ownerId } : null,
    filters.source ? { key: 'source', field: 'Source', label: filters.source } : null,
  ].filter((chip): chip is { key: string; field: string; label: string } => chip !== null);

  const hasFilters = activeChips.length > 0 || Boolean(filters.q);

  const clearAll = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['q', 'stage', 'consent', 'ownerId', 'source', 'state']) next.delete(key);
      return next;
    });
  };

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => (prev.size >= rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const columns: Column<Contact>[] = [
    {
      key: 'identity',
      header: 'Contact',
      render: (c) => <ContactIdentity contact={c} to={scopedHref(`/contacts/customer/${c.id}`)} />,
      width: '24%',
    },
    { key: 'stage', header: 'Stage', render: (c) => <StageBadge stage={c.stage} /> },
    { key: 'consent', header: 'Consent', render: (c) => <ConsentBadge consent={c.consent} /> },
    {
      key: 'owner',
      header: 'Owner',
      render: (c) => {
        // A bulk zone assignment overrides the fixture owner (§5).
        const override = getContactZone(c.id);
        const ownerId = override?.ownerId ?? c.ownerId;
        const owner = ownerId ? findUser(ownerId) : undefined;
        return owner ? (
          <span className="crm-all__owner">
            <Avatar initials={owner.initials} name={owner.name} size="sm" />
            {owner.name}
          </span>
        ) : (
          <span className="crm-all__unassigned">Unassigned</span>
        );
      },
    },
    {
      key: 'zone',
      header: 'Zone',
      render: (c) => {
        const assigned = getContactZone(c.id);
        if (assigned) {
          return (
            <span className="crm-all__zone">
              {assigned.zoneName}
              <Badge tone={assigned.mode === 'manual' ? 'neutral' : 'info'}>{assigned.mode}</Badge>
            </span>
          );
        }
        // Not explicitly assigned — hint the zone its location would route to.
        const auto = assignZone({ city: c.city });
        return auto.zoneName ? (
          <span className="crm-all__zone-hint">{auto.zoneName}</span>
        ) : (
          <span className="crm-all__unassigned">—</span>
        );
      },
    },
    { key: 'tier', header: 'Tier', render: (c) => <SalesTierBadge tier={c.salesTier} /> },
    {
      key: 'city',
      header: 'City',
      render: (c) => <span className="crm-all__muted">{c.city}</span>,
    },
    {
      key: 'activity',
      header: 'Last activity',
      align: 'right',
      render: (c) => <span className="crm-all__muted">{formatDate(c.lastActivityAt)}</span>,
    },
  ];

  const ownerOptions = [
    { value: '', label: 'All owners' },
    ...users.map((u) => ({ value: u.id, label: u.name })),
  ];

  // `no-results` is handled by the table's empty state below; loading/error
  // replace the list body entirely.
  const listState = forcedNoResults ? null : searchParams.get('state');
  const stateView = contentStateView(listState, { onRetry: () => setParam('state', null) });

  return (
    <div className="crm-all">
      <PageHeader
        title="All Contacts"
        description="Search, filter and manage every contact in your access scope."
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft={<SlidersHorizontal />}
              onClick={() => setParam('drawer', 'advanced-filter')}
            >
              Advanced filter
            </Button>
            <Button
              variant="primary"
              iconLeft={<Plus />}
              onClick={() => setParam('drawer', 'contact')}
            >
              Add contact
            </Button>
          </>
        }
      />

      {stateView}
      {stateView ? null : (
      <>
      <div className="crm-all__toolbar">
        <SearchField
          label="Search contacts"
          placeholder="Search name, mobile, email, company…"
          width="320px"
          value={filters.q ?? ''}
          onChange={(e) => setParam('q', e.target.value)}
        />
        <div className="crm-all__filters">
          <Select
            label="Stage"
            hideLabel
            size="sm"
            options={[{ value: '', label: 'All stages' }, ...stageOptions]}
            value={filters.stage ?? ''}
            onChange={(e) => setParam('stage', e.target.value)}
          />
          <Select
            label="Consent"
            hideLabel
            size="sm"
            options={[{ value: '', label: 'All consent' }, ...consentOptions]}
            value={filters.consent ?? ''}
            onChange={(e) => setParam('consent', e.target.value)}
          />
          <Select
            label="Owner"
            hideLabel
            size="sm"
            options={ownerOptions}
            value={filters.ownerId ?? ''}
            onChange={(e) => setParam('ownerId', e.target.value)}
          />
          <Select
            label="Source"
            hideLabel
            size="sm"
            options={[{ value: '', label: 'All sources' }, ...distinctSources().map((s) => ({ value: s, label: s }))]}
            value={filters.source ?? ''}
            onChange={(e) => setParam('source', e.target.value)}
          />
        </div>
      </div>

      {activeChips.length > 0 ? (
        <div className="crm-all__chips">
          {activeChips.map((chip) => (
            <FilterChip
              key={chip.key}
              field={chip.field}
              label={chip.label}
              onRemove={() => setParam(chip.key, null)}
            />
          ))}
          <button className="crm-all__clear" onClick={clearAll}>
            <X aria-hidden="true" /> Clear all
          </button>
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="crm-all__bulkbar" role="region" aria-label="Bulk actions">
          <span className="crm-all__bulkcount">
            {selected.size} selected
            <span className="crm-all__bulkscope"> of {rows.length} filtered</span>
          </span>
          <div className="crm-all__bulkactions">
            {/* Zone assignment is prominent so contacts can be divided among
                team members by geography (optional — §5/§6). */}
            {can(role, 'assign') ? (
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<MapPin />}
                className="crm-all__bulk-zone"
                onClick={() =>
                  openOverlay({
                    drawer: 'assign-zone',
                    count: String(selected.size),
                    selectedIds: [...selected].join(','),
                  })
                }
              >
                Assign zone
              </Button>
            ) : null}
            {/* Hide bulk actions a role can never perform (hide-vs-disable). */}
            {can(role, 'assign') ? (
              <Button variant="ghost" size="sm" onClick={() => openOverlay({ drawer: 'assign', count: String(selected.size), selectedIds: [...selected].join(',') })}>
                Assign owner
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => openOverlay({ drawer: 'tags', count: String(selected.size), selectedIds: [...selected].join(',') })}>
              Tags
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openOverlay({ drawer: 'stage-followup', count: String(selected.size), selectedIds: [...selected].join(',') })}>
              Stage
            </Button>
            {can(role, 'export') ? (
              <Button variant="ghost" size="sm" onClick={() => openOverlay({ drawer: 'export', count: String(selected.size) })}>
                Export
              </Button>
            ) : null}
            {can(role, 'assign') ? (
              <Button variant="ghost" size="sm" onClick={() => openOverlay({ drawer: 'consent', count: String(selected.size), selectedIds: [...selected].join(',') })}>
                Consent
              </Button>
            ) : null}
            {can(role, 'delete') ? (
              <Button variant="ghost" size="sm" onClick={() => openOverlay({ modal: 'confirm', action: 'bulk-delete', count: String(selected.size), selectedIds: [...selected].join(',') })}>
                Delete
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <DataTable
        caption="All contacts"
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        selectable
        selectedIds={selected}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        onRowClick={(c) => navigate(scopedHref(`/contacts/customer/${c.id}`))}
        emptyState={
          <EmptyState
            title={hasFilters ? 'No contacts match these filters' : 'No contacts in scope'}
            description={
              hasFilters
                ? 'Try widening the filters, or clear them to see every contact.'
                : 'Add a contact or import a list to get started.'
            }
            actions={
              hasFilters ? (
                <Button variant="secondary" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" iconLeft={<Plus />} onClick={() => setParam('drawer', 'contact')}>
                  Add contact
                </Button>
              )
            }
          />
        }
      />

      <p className="crm-all__count">{rows.length} contacts</p>
      </>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
