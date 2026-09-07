import { useMemo, useState } from 'react';
import { Copy, LayoutGrid, List, Plus, RefreshCw, Star } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Badge,
  Button,
  DataTable,
  DisconnectedState,
  EmptyState,
  FilterChip,
  LoadingSkeleton,
  PartialDataState,
  Popover,
  SearchField,
  Select,
  Tabs,
  type Column,
  type TabItem,
} from '@crm/design-system';
import { users } from '@crm/mock-data';
import { TemplateStatusBadge } from '../components';
import type { Template } from '../domain/types';
import { metaCategoryLabel, useCaseLabel, formatLabel } from '../templates-labels';
import {
  distinctFolders,
  distinctLanguages,
  filterTemplates,
  lifecycleCounts,
  type LifecycleView,
} from '../templates-selectors';
import { can } from '../permissions';
import { useWabaScope } from '../use-waba-scope';

const moreViews: { value: LifecycleView; label: string }[] = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'in-appeal', label: 'In Appeal' },
  { value: 'archived', label: 'Archived' },
  { value: 'deleted', label: 'Deleted' },
];

const primaryTabs: { id: LifecycleView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

/**
 * TPL-S01 — Templates Repository. Lifecycle filters, search/filter/sort,
 * WABA selector and a state/permission-aware list. `Active` is computed, not
 * stored (spec default). Row/bulk actions wire into the Create/Detail/Bulk
 * surfaces built in later batches.
 */
export default function TemplatesRepositoryScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { branchId, role } = useWorkspace();
  const { multiWaba, selectedWabaId, wabas } = useWabaScope();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [favourites, setFavourites] = useState<Set<string>>(
    () => new Set(),
  );
  const [morePopoverOpen, setMorePopoverOpen] = useState(false);
  const [display, setDisplay] = useState<'list' | 'grid'>('list');

  const scope = {
    wabaId: selectedWabaId === 'all' ? null : selectedWabaId,
    branchId: branchId === 'all' ? null : branchId,
  };

  const view = (searchParams.get('view') as LifecycleView | null) ?? 'all';
  const filters = {
    q: searchParams.get('q'),
    view,
    category: searchParams.get('category'),
    useCase: searchParams.get('useCase'),
    language: searchParams.get('language'),
    creatorId: searchParams.get('creatorId'),
    format: searchParams.get('format'),
    folder: searchParams.get('folder'),
  };

  const forcedState = searchParams.get('state');
  const isLoading = forcedState === 'loading';
  const forcedEmpty = forcedState === 'empty';
  const forcedNoResults = forcedState === 'no-results';
  const disconnected = forcedState === 'connection-disconnected';
  const syncFailure = forcedState === 'sync-failure';

  const rows = useMemo(
    () => (forcedEmpty || forcedNoResults ? [] : filterTemplates(scope, filters)),
    [forcedEmpty, forcedNoResults, scope.wabaId, scope.branchId, filters.q, filters.view, filters.category, filters.useCase, filters.language, filters.creatorId, filters.format, filters.folder],
  );

  const counts = useMemo(() => lifecycleCounts(scope), [scope.wabaId, scope.branchId]);

  const setParam = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      next.delete('state');
      return next;
    });
  };

  const openOverlay = (params: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(params)) next.set(key, value);
      return next;
    });

  const setWaba = (wabaId: string) => setParam('waba', wabaId === 'all' ? null : wabaId);

  const toggleFavourite = (id: string) =>
    setFavourites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const activeChips = [
    filters.category ? { key: 'category', field: 'Category', label: metaCategoryLabel[filters.category as keyof typeof metaCategoryLabel] ?? filters.category } : null,
    filters.useCase ? { key: 'useCase', field: 'Use case', label: useCaseLabel[filters.useCase as keyof typeof useCaseLabel] ?? filters.useCase } : null,
    filters.language ? { key: 'language', field: 'Language', label: filters.language } : null,
    filters.creatorId ? { key: 'creatorId', field: 'Creator', label: users.find((u) => u.id === filters.creatorId)?.name ?? filters.creatorId } : null,
    filters.format ? { key: 'format', field: 'Format', label: formatLabel[filters.format as keyof typeof formatLabel] ?? filters.format } : null,
    filters.folder ? { key: 'folder', field: 'Folder', label: filters.folder } : null,
  ].filter((chip): chip is { key: string; field: string; label: string } => chip !== null);

  const hasFilters = activeChips.length > 0 || Boolean(filters.q);

  const clearAll = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['q', 'category', 'useCase', 'language', 'creatorId', 'format', 'folder', 'state']) next.delete(key);
      return next;
    });

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => (prev.size >= rows.length ? new Set() : new Set(rows.map((r) => r.id))));

  const languages = distinctLanguages(scope);
  const folders = distinctFolders(scope);

  const columns: Column<Template>[] = [
    {
      key: 'name',
      header: 'Template',
      width: '26%',
      render: (t) => (
        <div className="crm-tpl-repo__identity">
          <button
            className="crm-tpl-repo__fav"
            aria-label={isFavouriteResolved(t, favourites) ? 'Remove favourite' : 'Mark favourite'}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavourite(t.id);
            }}
          >
            <Star aria-hidden="true" fill={isFavouriteResolved(t, favourites) ? 'currentColor' : 'none'} />
          </button>
          <div>
            <p className="crm-tpl-repo__name">{t.name}</p>
            <p className="crm-tpl-repo__snippet">{t.components.body}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (t) => metaCategoryLabel[t.metaCategory] },
    { key: 'useCase', header: 'Use case', render: (t) => useCaseLabel[t.useCase] },
    { key: 'language', header: 'Language', render: (t) => t.localeLabel },
    { key: 'format', header: 'Format', render: (t) => formatLabel[t.format] },
    { key: 'status', header: 'Status', render: (t) => <TemplateStatusBadge template={t} /> },
    {
      key: 'creator',
      header: 'Creator',
      render: (t) => users.find((u) => u.id === t.creatorId)?.name ?? 'Unknown',
    },
    {
      key: 'updated',
      header: 'Updated',
      align: 'right',
      render: (t) => <span className="crm-tpl-repo__muted">{formatDate(t.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (
        <div className="crm-tpl-repo__row-actions" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Copy />}
            onClick={() => navigate(scopedHref('/templates/new', { source: 'clone', cloneFrom: t.id, step: 'basics' }))}
          >
            Clone
          </Button>
        </div>
      ),
    },
  ];

  const wabaOptions = [{ value: 'all', label: 'All WhatsApp accounts' }, ...wabas.map((w) => ({ value: w.id, label: w.name }))];
  const categoryOptions = [{ value: '', label: 'All categories' }, ...Object.entries(metaCategoryLabel).map(([value, label]) => ({ value, label }))];
  const useCaseOptions = [{ value: '', label: 'All use cases' }, ...Object.entries(useCaseLabel).map(([value, label]) => ({ value, label }))];
  const languageOptions = [{ value: '', label: 'All languages' }, ...languages.map((l) => ({ value: l.locale, label: l.label }))];
  const formatOptions = [{ value: '', label: 'All formats' }, ...Object.entries(formatLabel).map(([value, label]) => ({ value, label }))];
  const creatorOptions = [{ value: '', label: 'All creators' }, ...users.map((u) => ({ value: u.id, label: u.name }))];
  const folderOptions = [{ value: '', label: 'All folders' }, ...folders.map((f) => ({ value: f, label: f }))];

  const activeTabId: string = moreViews.some((m) => m.value === view) ? 'more' : view;
  const tabItems: TabItem[] = [
    ...primaryTabs.map((tab) => ({ id: tab.id, label: tab.label, count: countFor(counts, tab.id) })),
    { id: 'more', label: moreViews.find((m) => m.value === view)?.label ?? 'More' },
  ];

  const canCreate = can(role, 'create');
  const canBulk = can(role, 'bulkActions');

  return (
    <div className="crm-tpl-repo">
      <PageHeader
        title="Templates"
        description="Find, create and govern every WhatsApp message template."
        actions={
          <>
            {multiWaba ? (
              <Select label="WhatsApp account" hideLabel size="sm" options={wabaOptions} value={selectedWabaId} onChange={(e) => setWaba(e.target.value)} />
            ) : null}
            <Button
              variant="primary"
              iconLeft={<Plus />}
              onClick={() => setParam('modal', 'create')}
              disabled={!canCreate}
              title={canCreate ? undefined : 'Your role cannot create templates.'}
            >
              Create Template
            </Button>
          </>
        }
        toolbar={
          <Tabs
            tabs={tabItems}
            activeId={activeTabId}
            ariaLabel="Template lifecycle"
            onChange={(id) => {
              if (id === 'more') {
                setMorePopoverOpen(true);
                return;
              }
              setParam('view', id === 'all' ? null : id);
            }}
          />
        }
      />

      <Popover open={morePopoverOpen} title="More views" onClose={() => setMorePopoverOpen(false)}>
        <div className="crm-tpl-repo__more-list">
          {moreViews.map((option) => (
            <button
              key={option.value}
              className="crm-tpl-repo__more-item"
              onClick={() => {
                setParam('view', option.value);
                setMorePopoverOpen(false);
              }}
            >
              <span>{option.label}</span>
              <Badge tone="neutral">{countFor(counts, option.value)}</Badge>
            </button>
          ))}
        </div>
      </Popover>

      {syncFailure ? (
        <PartialDataState
          title="Meta sync failed"
          description="We could not refresh statuses from Meta. Showing the last cached data — actions that need a live sync are disabled."
          actions={<Button variant="secondary" iconLeft={<RefreshCw />} onClick={() => setParam('state', null)}>Retry sync</Button>}
        />
      ) : null}

      {disconnected ? (
        <DisconnectedState
          title="WhatsApp Business Account disconnected"
          description="Reconnect this WhatsApp Business Account to submit or sync templates."
          actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/settings'))}>Go to Settings</Button>}
        />
      ) : (
        <>
          <div className="crm-tpl-repo__toolbar">
            <SearchField
              label="Search templates"
              placeholder="Search template name or message text…"
              width="320px"
              value={filters.q ?? ''}
              onChange={(e) => setParam('q', e.target.value)}
            />
            <div className="crm-tpl-repo__filters">
              <Select label="Category" hideLabel size="sm" options={categoryOptions} value={filters.category ?? ''} onChange={(e) => setParam('category', e.target.value)} />
              <Select label="Use case" hideLabel size="sm" options={useCaseOptions} value={filters.useCase ?? ''} onChange={(e) => setParam('useCase', e.target.value)} />
              <Select label="Language" hideLabel size="sm" options={languageOptions} value={filters.language ?? ''} onChange={(e) => setParam('language', e.target.value)} />
              <Select label="Format" hideLabel size="sm" options={formatOptions} value={filters.format ?? ''} onChange={(e) => setParam('format', e.target.value)} />
              <Select label="Creator" hideLabel size="sm" options={creatorOptions} value={filters.creatorId ?? ''} onChange={(e) => setParam('creatorId', e.target.value)} />
              {folders.length ? (
                <Select label="Folder" hideLabel size="sm" options={folderOptions} value={filters.folder ?? ''} onChange={(e) => setParam('folder', e.target.value)} />
              ) : null}
            </div>
            <div className="crm-tpl-repo__display-toggle" role="group" aria-label="Layout">
              <button className={display === 'list' ? 'is-active' : ''} aria-pressed={display === 'list'} onClick={() => setDisplay('list')}>
                <List aria-hidden="true" />
              </button>
              <button className={display === 'grid' ? 'is-active' : ''} aria-pressed={display === 'grid'} onClick={() => setDisplay('grid')}>
                <LayoutGrid aria-hidden="true" />
              </button>
            </div>
          </div>

          {activeChips.length > 0 ? (
            <div className="crm-tpl-repo__chips">
              {activeChips.map((chip) => (
                <FilterChip key={chip.key} field={chip.field} label={chip.label} onRemove={() => setParam(chip.key, null)} />
              ))}
              <button className="crm-tpl-repo__clear" onClick={clearAll}>Clear all</button>
            </div>
          ) : null}

          {selected.size > 0 && canBulk ? (
            <div className="crm-tpl-repo__bulkbar" role="region" aria-label="Bulk actions">
              <span className="crm-tpl-repo__bulkcount">
                {selected.size} selected<span className="crm-tpl-repo__bulkscope"> of {rows.length} filtered</span>
              </span>
              <div className="crm-tpl-repo__bulkactions">
                <Button variant="ghost" size="sm" onClick={() => openOverlay({ mode: 'bulk', modal: 'bulk-action', action: 'favourite', count: String(selected.size) })}>Favourite</Button>
                <Button variant="ghost" size="sm" onClick={() => openOverlay({ mode: 'bulk', modal: 'bulk-action', action: 'archive', count: String(selected.size) })}>Archive</Button>
                <Button variant="ghost" size="sm" onClick={() => openOverlay({ mode: 'bulk', modal: 'bulk-action', action: 'sync', count: String(selected.size) })}>Sync</Button>
                {can(role, 'delete') ? (
                  <Button variant="ghost" size="sm" onClick={() => openOverlay({ mode: 'bulk', modal: 'bulk-action', action: 'delete', count: String(selected.size) })}>Delete</Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="crm-tpl-repo__loading">
              <LoadingSkeleton lines={6} />
            </div>
          ) : (
            <>
              {display === 'list' ? (
                <DataTable
                  caption="Templates"
                  columns={columns}
                  rows={rows}
                  rowKey={(t) => t.id}
                  selectable={canBulk}
                  selectedIds={selected}
                  onToggleRow={toggleRow}
                  onToggleAll={toggleAll}
                  onRowClick={(t) => navigate(scopedHref(`/templates/${t.id}`))}
                  emptyState={
                    <EmptyState
                      title={hasFilters ? 'No templates match these filters' : 'No templates yet'}
                      description={
                        hasFilters
                          ? 'Try widening the filters, or clear them to see every template.'
                          : 'Create your first template or start from the ready-made library.'
                      }
                      actions={
                        hasFilters ? (
                          <Button variant="secondary" onClick={clearAll}>Clear filters</Button>
                        ) : (
                          <>
                            <Button variant="primary" iconLeft={<Plus />} onClick={() => setParam('modal', 'create')} disabled={!canCreate}>
                              Create Template
                            </Button>
                            <Button variant="secondary" onClick={() => navigate(scopedHref('/templates/library'))}>
                              Browse Library
                            </Button>
                          </>
                        )
                      }
                    />
                  }
                />
              ) : (
                <div className="crm-tpl-repo__grid">
                  {rows.length === 0 ? (
                    <EmptyState
                      title={hasFilters ? 'No templates match these filters' : 'No templates yet'}
                      description={hasFilters ? 'Try widening the filters.' : 'Create your first template.'}
                      actions={<Button variant="primary" iconLeft={<Plus />} onClick={() => setParam('modal', 'create')} disabled={!canCreate}>Create Template</Button>}
                    />
                  ) : (
                    rows.map((t) => (
                      <button key={t.id} className="crm-tpl-repo__card" onClick={() => navigate(scopedHref(`/templates/${t.id}`))}>
                        <div className="crm-tpl-repo__card-head">
                          <TemplateStatusBadge template={t} />
                          <span className="crm-tpl-repo__card-format">{formatLabel[t.format]}</span>
                        </div>
                        <p className="crm-tpl-repo__card-name">{t.name}</p>
                        <p className="crm-tpl-repo__card-snippet">{t.components.body}</p>
                        <p className="crm-tpl-repo__card-meta">{t.localeLabel} · {metaCategoryLabel[t.metaCategory]}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
              <p className="crm-tpl-repo__count">{rows.length} templates</p>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** `toggled` holds ids flipped away from their fixture default this session. */
function isFavouriteResolved(template: Template, toggled: Set<string>): boolean {
  const base = Boolean(template.favourite);
  return toggled.has(template.id) ? !base : base;
}

function countFor(counts: ReturnType<typeof lifecycleCounts>, view: LifecycleView): number {
  switch (view) {
    case 'all': return counts.all;
    case 'active': return counts.active;
    case 'draft': return counts.draft;
    case 'pending': return counts.pending;
    case 'approved': return counts.approved;
    case 'rejected': return counts.rejected;
    case 'disabled': return counts.disabled;
    case 'in-appeal': return counts.inAppeal;
    case 'archived': return counts.archived;
    case 'deleted': return counts.deleted;
    default: return 0;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

