import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useWorkspace } from '@crm/app/workspace-context';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { Badge, Button, DataTable, EmptyState, SearchField, Select, type Column } from '@crm/design-system';
import { ConnectorStateBadge, SourceModeBadge } from '../components';
import { catalogues } from '../data';
import type { Catalogue } from '../domain/types';
import { catalogueStatusLabel } from '../catalogue-orders-labels';
import { can } from '../permissions';

const sourceOptions = [
  { value: 'all', label: 'All sources' },
  { value: 'integrated', label: 'Integrated' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'crm-managed', label: 'CRM-managed' },
];

const modeOptions = [
  { value: 'all', label: 'All business modes' },
  { value: 'b2b', label: 'B2B' },
  { value: 'b2c', label: 'B2C' },
  { value: 'hybrid', label: 'Hybrid' },
];

/** ECO-S02 — Catalogue List. */
export default function CatalogueListScreen() {
  const { role, branchId } = useWorkspace();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, patch] = useQueryPatch();

  const q = searchParams.get('q') ?? '';
  const sourceMode = searchParams.get('sourceMode') ?? 'all';
  const businessMode = searchParams.get('businessMode') ?? 'all';

  const filtered = useMemo(() => {
    return catalogues.filter((catalogue) => {
      if (branchId !== 'all' && !catalogue.branchIds.includes(branchId)) return false;
      if (sourceMode !== 'all' && catalogue.sourceMode !== sourceMode) return false;
      if (businessMode !== 'all' && catalogue.businessMode !== businessMode) return false;
      if (q && !`${catalogue.name} ${catalogue.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [branchId, sourceMode, businessMode, q]);

  const columns: Column<Catalogue>[] = [
    {
      key: 'name',
      header: 'Catalogue',
      render: (catalogue) => (
        <div className="crm-eco-catlist__name-cell">
          <p className="crm-eco-catlist__name">{catalogue.name}</p>
          <p className="crm-eco-catlist__description">{catalogue.description}</p>
        </div>
      ),
    },
    { key: 'businessMode', header: 'Business mode', render: (c) => <Badge tone="neutral" appearance="outline">{c.businessMode.toUpperCase()}</Badge> },
    { key: 'source', header: 'Source', render: (c) => <SourceModeBadge mode={c.sourceMode} /> },
    { key: 'status', header: 'Sync status', render: (c) => <ConnectorStateBadge state={c.sourceStatus} /> },
    { key: 'items', header: 'Items', align: 'right', render: (c) => String(c.itemCount) },
    { key: 'branches', header: 'Branches', align: 'right', render: (c) => String(c.branchIds.length) },
    { key: 'catalogueStatus', header: 'Status', render: (c) => <Badge tone={c.status === 'active' ? 'success' : 'neutral'}>{catalogueStatusLabel[c.status]}</Badge> },
  ];

  return (
    <div className="crm-eco-catlist">
      <PageHeader
        title="Catalogues"
        description="Create, connect and manage every catalogue this workspace sells from — jewellery, décor, apparel or anything else."
        actions={
          can(role, 'catalogue.create') ? (
            <Button variant="primary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues/new'))}>
              Create catalogue
            </Button>
          ) : undefined
        }
      />

      <div className="crm-eco-catlist__toolbar">
        <SearchField
          label="Search catalogues"
          placeholder="Search by name or description…"
          width="320px"
          value={q}
          onChange={(e) => patch({ q: e.target.value || null })}
        />
        <Select
          label="Source"
          hideLabel
          size="sm"
          options={sourceOptions}
          value={sourceMode}
          onChange={(e) => patch({ sourceMode: e.target.value === 'all' ? null : e.target.value })}
        />
        <Select
          label="Business mode"
          hideLabel
          size="sm"
          options={modeOptions}
          value={businessMode}
          onChange={(e) => patch({ businessMode: e.target.value === 'all' ? null : e.target.value })}
        />
      </div>

      {filtered.length === 0 && catalogues.length > 0 ? (
        <EmptyState
          title="No catalogues match your filters"
          description="Try a different source, business mode or search term."
          actions={<Button variant="secondary" onClick={() => patch({ q: null, sourceMode: null, businessMode: null })}>Clear filters</Button>}
        />
      ) : catalogues.length === 0 ? (
        <EmptyState
          title="No catalogues yet"
          description="Connect an ERP or storefront, upload a spreadsheet, or start a CRM-managed catalogue from scratch."
          actions={
            can(role, 'catalogue.create') ? (
              <Button variant="primary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues/new'))}>Create catalogue</Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          caption="Catalogues"
          columns={columns}
          rows={filtered}
          rowKey={(catalogue) => catalogue.id}
          onRowClick={(catalogue) => navigate(scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/explorer`))}
        />
      )}
    </div>
  );
}
