import { useMemo } from 'react';
import { Layers, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  IconButton,
  SearchField,
  Select,
  type Column,
} from '@crm/design-system';
import { Trash2, SquarePen } from 'lucide-react';
import { findUser, segments, type Segment } from '@crm/mock-data';

/**
 * CON-S04 — Segments. Lists dynamic and snapshot segments with match count,
 * owner, last update and campaign usage. Reuses the shared DataTable.
 */
export default function SegmentsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const q = searchParams.get('q') ?? '';
  const typeFilter = searchParams.get('type') ?? '';

  const setParam = (key: string, value: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return segments.filter((s) => {
      if (typeFilter && s.type !== typeFilter) return false;
      if (needle && !s.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, typeFilter]);

  const columns: Column<Segment>[] = [
    {
      key: 'name',
      header: 'Segment',
      width: '30%',
      render: (s) => (
        <div className="crm-seg__name">
          <span className="crm-seg__name-text">{s.name}</span>
          {s.description ? <span className="crm-seg__desc">{s.description}</span> : null}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (s) => (
        <Badge tone={s.type === 'dynamic' ? 'info' : 'neutral'} appearance="outline">
          {s.type === 'dynamic' ? 'Dynamic' : 'Snapshot'}
        </Badge>
      ),
    },
    {
      key: 'count',
      header: 'Matches',
      align: 'right',
      render: (s) => <span className="crm-seg__count">{s.count.toLocaleString('en-IN')}</span>,
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (s) => <span>{findUser(s.ownerId)?.name ?? '—'}</span>,
    },
    {
      key: 'usage',
      header: 'Used by',
      render: (s) =>
        s.usedByCampaignIds.length ? (
          <Badge tone="brand" appearance="soft">
            {s.usedByCampaignIds.length} campaign{s.usedByCampaignIds.length > 1 ? 's' : ''}
          </Badge>
        ) : (
          <span className="crm-seg__muted">—</span>
        ),
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (s) => <span className="crm-seg__muted">{formatDate(s.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <div className="crm-seg__actions" onClick={(e) => e.stopPropagation()}>
          <IconButton
            label="Edit segment"
            icon={<SquarePen />}
            size="sm"
            onClick={() => navigate(scopedHref(`/contacts/segments/${s.id}/edit`))}
          />
          <IconButton
            label="Delete segment"
            icon={<Trash2 />}
            size="sm"
            onClick={() =>
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('modal', 'confirm');
                next.set('action', 'delete-segment');
                next.set('segmentId', s.id);
                return next;
              })
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div className="crm-seg">
      <PageHeader
        title="Segments"
        description="Reusable audiences. Dynamic segments recalculate automatically; snapshots are frozen at capture."
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus />}
            onClick={() => navigate(scopedHref('/contacts/segments/new'))}
          >
            Create segment
          </Button>
        }
      />

      <div className="crm-seg__toolbar">
        <SearchField
          label="Search segments"
          placeholder="Search segments…"
          width="280px"
          value={q}
          onChange={(e) => setParam('q', e.target.value)}
        />
        <Select
          label="Type"
          hideLabel
          size="sm"
          options={[
            { value: '', label: 'All types' },
            { value: 'dynamic', label: 'Dynamic' },
            { value: 'snapshot', label: 'Snapshot' },
          ]}
          value={typeFilter}
          onChange={(e) => setParam('type', e.target.value)}
        />
      </div>

      <DataTable
        caption="Segments"
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        onRowClick={(s) => navigate(scopedHref(`/contacts/segments/${s.id}`))}
        emptyState={
          <EmptyState
            title="No segments yet"
            description="Create a segment to target a reusable audience for campaigns and journeys."
            actions={
              <Button
                variant="primary"
                iconLeft={<Layers />}
                onClick={() => navigate(scopedHref('/contacts/segments/new'))}
              >
                Create segment
              </Button>
            }
          />
        }
      />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
