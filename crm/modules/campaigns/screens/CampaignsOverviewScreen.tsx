import { useMemo, useState } from 'react';
import { Copy, GitCompareArrows, Plus, SlidersHorizontal } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Banner,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterChip,
  LoadingSkeleton,
  PermissionRestricted,
  SearchField,
  Select,
  Tabs,
  Toast,
  type Column,
  type TabItem,
} from '@crm/design-system';
import { findWhatsAppNumber, findUser } from '@crm/mock-data';
import { findTemplate } from '@crm/modules/templates/data';
import { findItem } from '@crm/modules/catalogue-orders/data';
import { CampaignStatusBadge } from '../components';
import { formatDate, typeLabel } from '../campaigns-labels';
import { campaignsInScope, sortCampaigns, type CampaignView } from '../campaigns-selectors';
import type { Campaign } from '../domain/types';
import { can } from '../permissions';
import { ArchiveConfirmModal } from '../overlays/ArchiveConfirmModal';

const primaryTabs: { id: CampaignView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'live', label: 'Live' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'archived', label: 'Archived' },
];

function countFor(counts: Record<CampaignView, number>, view: CampaignView): number {
  return counts[view] ?? 0;
}

/** Resolves a campaign's one-line performance/summary column by lifecycle. */
function summaryFor(campaign: Campaign): string {
  if (campaign.status === 'draft') {
    return `Draft · last edited ${formatDate(campaign.updatedAt)}`;
  }
  if (campaign.status === 'scheduled') {
    return campaign.scheduledAt ? `Scheduled for ${formatDate(campaign.scheduledAt)}` : 'Scheduled';
  }
  if (campaign.status === 'cancelled') {
    return 'Cancelled before send';
  }
  if (campaign.progress) {
    const { sent, failed, totalEligible } = campaign.progress;
    return `${sent.toLocaleString('en-IN')} sent of ${totalEligible.toLocaleString('en-IN')}${failed ? ` · ${failed} failed` : ''}`;
  }
  return `${campaign.audience.finalEligible.toLocaleString('en-IN')} eligible`;
}

/**
 * CAM-S01 — Campaigns Overview & Campaign List. Status views, search/filter/
 * sort, WhatsApp-number filter and list actions (Create/Open/Duplicate/
 * Archive/Compare/Resume Draft).
 */
export default function CampaignsOverviewScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { branchId, role, currentUser, visibleModules } = useWorkspace();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archivedThisSession, setArchivedThisSession] = useState<Set<string>>(new Set());
  const [archiveTarget, setArchiveTarget] = useState<Campaign | null>(null);

  const view = (searchParams.get('view') as CampaignView | null) ?? 'all';
  const q = searchParams.get('q');
  const type = searchParams.get('type');
  const creatorId = searchParams.get('creatorId');
  const number = searchParams.get('number');
  const forcedState = searchParams.get('state');
  const flash = searchParams.get('flash');
  // Catalogue & Orders "Send as Campaign" handoff (SKILL.md §10 Campaigns —
  // "Accept catalogue selection/filter payload"). Campaign sends only go
  // through approved WhatsApp templates, so this doesn't inject items into a
  // draft directly — it points the user at a new campaign and names the
  // items so they pick/create a catalogue-content template for them.
  const catalogueItemIds = (searchParams.get('catalogueItemIds') ?? '').split(',').filter(Boolean);
  const catalogueItems = catalogueItemIds.map((id) => findItem(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const dismissCatalogueHandoff = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('catalogueItemIds');
      return next;
    });
  const dismissFlash = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('flash');
      return next;
    });

  const isLoading = forcedState === 'loading';
  const forcedEmpty = forcedState === 'empty';
  const forcedNoResults = forcedState === 'no-results';
  const forcedError = forcedState === 'error';
  const permissionDenied = forcedState === 'permission-denied';

  const scope = { branchId: branchId === 'all' ? null : branchId, whatsappNumberId: number };

  const isArchivedResolved = (campaign: Campaign) => campaign.isArchived || archivedThisSession.has(campaign.id);

  const searchScoped = useMemo(
    () => (forcedEmpty || forcedNoResults ? [] : campaignsInScope(scope, { q, type, creatorId })),
    [forcedEmpty, forcedNoResults, scope.branchId, scope.whatsappNumberId, q, type, creatorId],
  );
  const rows = useMemo(
    () =>
      sortCampaigns(
        searchScoped.filter((c) => {
          const archived = isArchivedResolved(c);
          if (view === 'archived') return archived;
          if (archived) return false;
          return view === 'all' || c.status === view;
        }),
      ),
    [searchScoped, archivedThisSession, view],
  );

  const countsScoped = useMemo(() => campaignsInScope(scope, {}), [scope.branchId, scope.whatsappNumberId]);
  const counts = useMemo<Record<CampaignView, number>>(() => {
    const base: Record<CampaignView, number> = { all: 0, archived: 0, draft: 0, scheduled: 0, live: 0, paused: 0, completed: 0, cancelled: 0 };
    for (const campaign of countsScoped) {
      if (isArchivedResolved(campaign)) {
        base.archived += 1;
        continue;
      }
      base.all += 1;
      base[campaign.status] += 1;
    }
    return base;
  }, [countsScoped, archivedThisSession]);

  const setParam = (key: string, value: string | null) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      next.delete('state');
      return next;
    });

  const clearAll = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['q', 'type', 'creatorId', 'number', 'state']) next.delete(key);
      return next;
    });

  const activeChips = [
    type ? { key: 'type', field: 'Type', label: typeLabel[type as keyof typeof typeLabel] ?? type } : null,
    creatorId ? { key: 'creatorId', field: 'Created by', label: findUser(creatorId)?.name ?? creatorId } : null,
    number ? { key: 'number', field: 'Number', label: findWhatsAppNumber(number)?.displayName ?? number } : null,
  ].filter((chip): chip is { key: string; field: string; label: string } => chip !== null);
  const hasFilters = activeChips.length > 0 || Boolean(q);

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => (prev.size >= rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const openRow = (campaign: Campaign) => {
    if (campaign.status === 'draft') {
      navigate(scopedHref('/campaigns/new', { draftId: campaign.id, step: campaign.draftLastStep ?? 'setup' }));
      return;
    }
    navigate(scopedHref(`/campaigns/${campaign.id}`));
  };

  const duplicateRow = (campaign: Campaign) => {
    navigate(
      scopedHref('/campaigns/new', {
        source: 'duplicate',
        sourceCampaignId: campaign.id,
        draftId: `cam_dup_${campaign.id}_${Date.now()}`,
        step: 'setup',
      }),
    );
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    setArchivedThisSession((prev) => new Set(prev).add(archiveTarget.id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(archiveTarget.id);
      return next;
    });
    setArchiveTarget(null);
  };

  const bulkArchiveEligible = [...selected]
    .map((id) => rows.find((r) => r.id === id))
    .filter((c): c is Campaign => c !== undefined && (c.status === 'completed' || c.status === 'cancelled') && !archivedThisSession.has(c.id));

  const typeOptions = [{ value: '', label: 'All types' }, ...Object.entries(typeLabel).map(([value, label]) => ({ value, label }))];

  const canCreate = can(role, 'campaign.create');
  const canArchive = can(role, 'campaign.archive');
  const canCompare = can(role, 'campaign.compare');

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      width: '26%',
      render: (c) => (
        <div className="crm-camp-list__identity">
          <p className="crm-camp-list__name">{c.name}</p>
          <p className="crm-camp-list__meta">{typeLabel[c.type]} · {findTemplate(c.templateId ?? '')?.name ?? 'No template'}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (c) => <CampaignStatusBadge campaign={{ ...c, isArchived: c.isArchived || archivedThisSession.has(c.id) }} /> },
    {
      key: 'sender',
      header: 'Sender',
      render: (c) => (c.whatsappNumberId ? findWhatsAppNumber(c.whatsappNumberId)?.displayName ?? c.whatsappNumberId : '—'),
    },
    { key: 'summary', header: 'Progress / audience', render: summaryFor },
    { key: 'creator', header: 'Created by', render: (c) => findUser(c.creatorId)?.name ?? 'Unknown' },
    { key: 'updated', header: 'Updated', align: 'right', render: (c) => <span className="crm-camp-list__muted">{formatDate(c.updatedAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className="crm-camp-list__row-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" iconLeft={<Copy />} onClick={() => duplicateRow(c)}>
            Duplicate
          </Button>
        </div>
      ),
    },
  ];

  if (!visibleModules.includes('campaigns')) {
    return (
      <PermissionRestricted
        title="You do not have access to Campaigns"
        description={`Your role (${currentUser.roleLabel}) cannot open Campaigns.`}
      />
    );
  }

  if (permissionDenied) {
    return (
      <PermissionRestricted
        title="You do not have access to Campaigns"
        description={`Your role (${currentUser.roleLabel}) cannot view campaigns in this scope.`}
      />
    );
  }

  return (
    <div className="crm-camp-list">
      <PageHeader
        title="Campaigns"
        description="Create, launch and track WhatsApp campaigns from one connected lifecycle."
        actions={
          <>
            <Button variant="secondary" iconLeft={<SlidersHorizontal />} onClick={() => setParam('drawer', 'filters')}>
              Filters
            </Button>
            <Button
              variant="primary"
              iconLeft={<Plus />}
              onClick={() => navigate(scopedHref('/campaigns/new', { step: 'setup' }))}
              disabled={!canCreate}
              title={canCreate ? undefined : 'Your role cannot create campaigns.'}
            >
              Create Campaign
            </Button>
          </>
        }
        toolbar={
          <Tabs
            tabs={primaryTabs.map<TabItem>((tab) => ({ id: tab.id, label: tab.label, count: countFor(counts, tab.id) }))}
            activeId={view}
            ariaLabel="Campaign status"
            onChange={(id) => setParam('view', id === 'all' ? null : id)}
          />
        }
      />

      {catalogueItems.length > 0 ? (
        <Banner
          tone="info"
          title={`${catalogueItems.length} item${catalogueItems.length === 1 ? '' : 's'} selected from Catalogue & Orders`}
          description={`${catalogueItems.map((i) => i.title).join(', ')} — start a campaign and choose (or create) a catalogue-content template to send them to a segment.`}
          actions={
            <>
              <Button variant="primary" size="sm" onClick={() => navigate(scopedHref('/campaigns/new', { step: 'setup' }))}>
                Start campaign
              </Button>
              <Button variant="ghost" size="sm" onClick={dismissCatalogueHandoff}>Dismiss</Button>
            </>
          }
        />
      ) : null}

      {forcedError ? (
        <ErrorState
          title="Could not load campaigns"
          description="Something went wrong while loading this list."
          actions={<Button variant="secondary" onClick={() => setParam('state', null)}>Retry</Button>}
        />
      ) : (
        <>
          <div className="crm-camp-list__toolbar">
            <SearchField label="Search campaigns" placeholder="Search by campaign name…" width="320px" value={q ?? ''} onChange={(e) => setParam('q', e.target.value)} />
            <div className="crm-camp-list__filters">
              <Select label="Type" hideLabel size="sm" options={typeOptions} value={type ?? ''} onChange={(e) => setParam('type', e.target.value)} />
            </div>
          </div>

          {activeChips.length > 0 ? (
            <div className="crm-camp-list__chips">
              {activeChips.map((chip) => (
                <FilterChip key={chip.key} field={chip.field} label={chip.label} onRemove={() => setParam(chip.key, null)} />
              ))}
              <button className="crm-camp-list__clear" onClick={clearAll}>Clear all</button>
            </div>
          ) : null}

          {selected.size > 0 ? (
            <div className="crm-camp-list__bulkbar" role="region" aria-label="Bulk actions">
              <span className="crm-camp-list__bulkcount">{selected.size} selected</span>
              <div className="crm-camp-list__bulkactions">
                {canCompare ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<GitCompareArrows />}
                    disabled={selected.size < 2 || selected.size > 4}
                    title={selected.size < 2 ? 'Select at least 2 campaigns to compare' : selected.size > 4 ? 'Compare up to 4 campaigns at a time' : undefined}
                    onClick={() => navigate(scopedHref('/campaigns/compare', { campaigns: [...selected].join(',') }))}
                  >
                    Compare
                  </Button>
                ) : null}
                {canArchive && bulkArchiveEligible.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(bulkArchiveEligible[0])}>
                    Archive {bulkArchiveEligible.length > 1 ? `(${bulkArchiveEligible.length})` : ''}
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="crm-camp-list__loading">
              <LoadingSkeleton lines={6} />
            </div>
          ) : (
            <>
              <DataTable
                caption="Campaigns"
                columns={columns}
                rows={rows}
                rowKey={(c) => c.id}
                selectable
                selectedIds={selected}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
                onRowClick={openRow}
                emptyState={
                  <EmptyState
                    title={hasFilters ? 'No campaigns match these filters' : view === 'archived' ? 'No archived campaigns' : 'No campaigns yet'}
                    description={
                      hasFilters
                        ? 'Try widening the filters, or clear them to see every campaign.'
                        : view === 'archived'
                          ? 'Completed or cancelled campaigns you archive will appear here.'
                          : 'Create your first campaign to reach customers on WhatsApp.'
                    }
                    actions={
                      hasFilters ? (
                        <Button variant="secondary" onClick={clearAll}>Clear filters</Button>
                      ) : view === 'archived' ? undefined : (
                        <Button variant="primary" iconLeft={<Plus />} onClick={() => navigate(scopedHref('/campaigns/new', { step: 'setup' }))} disabled={!canCreate}>
                          Create Campaign
                        </Button>
                      )
                    }
                  />
                }
              />
              <p className="crm-camp-list__count">{rows.length} campaigns</p>
            </>
          )}
        </>
      )}

      <ArchiveConfirmModal
        open={archiveTarget !== null}
        campaignName={archiveTarget?.name ?? ''}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />

      {flash ? <Toast tone="success" message={flash} onDismiss={dismissFlash} /> : null}
    </div>
  );
}
