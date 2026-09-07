import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ImageOff, Settings2, Upload } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Banner, Button, EmptyState, ErrorState, SearchField, Select } from '@crm/design-system';
import { PriceDisplay, SourceModeBadge } from '../components';
import { findCatalogue, itemsForCatalogue } from '../data';
import type { CatalogueItem } from '../domain/types';
import { can } from '../permissions';

const PATH_SEP = '|';

/** ECO-S03 — Catalogue Explorer: navigates the catalogue's own data-driven hierarchy. */
export default function CatalogueExplorerScreen() {
  const { catalogueId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, patch] = useQueryPatch();
  const { role, branchId } = useWorkspace();

  const catalogue = catalogueId ? findCatalogue(catalogueId) : undefined;

  const q = searchParams.get('q') ?? '';
  const pathParam = searchParams.get('path') ?? '';
  const selectedPath = pathParam ? pathParam.split(PATH_SEP) : [];

  const levels = useMemo(
    () => (catalogue ? [...catalogue.hierarchySchema].sort((a, b) => a.order - b.order) : []),
    [catalogue],
  );

  const attributeFilterKeys = useMemo(
    () => (catalogue ? catalogue.attributeSchema.filter((a) => a.filterable && (a.dataType === 'single-select' || a.dataType === 'boolean')) : []),
    [catalogue],
  );

  const itemsInScope = useMemo(() => {
    if (!catalogue) return [];
    let scoped = itemsForCatalogue(catalogue.id).filter((item) => item.status === 'active');
    if (branchId !== 'all') scoped = scoped.filter((item) => item.branchVisibility.includes(branchId));
    for (const attribute of attributeFilterKeys) {
      const value = searchParams.get(`attr_${attribute.key}`);
      if (!value) continue;
      scoped = scoped.filter((item) => {
        const raw = item.attributes[attribute.key];
        if (attribute.dataType === 'boolean') return String(raw) === value;
        return raw === value;
      });
    }
    return scoped;
  }, [catalogue, branchId, attributeFilterKeys, searchParams]);

  const pathFiltered = useMemo(
    () => itemsInScope.filter((item) => selectedPath.every((value, index) => item.hierarchyPath[index] === value)),
    [itemsInScope, selectedPath],
  );

  const searchFiltered = useMemo(() => {
    if (!q) return null;
    const needle = q.toLowerCase();
    return itemsInScope.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.sku.toLowerCase().includes(needle) ||
        item.itemCode.toLowerCase().includes(needle) ||
        item.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }, [itemsInScope, q]);

  if (!catalogue) {
    return (
      <ErrorState
        title="Catalogue not found"
        description="This catalogue may have been removed, or the link is out of date."
        actions={
          <Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>
            Back to Catalogues
          </Button>
        }
      />
    );
  }

  const atLeaf = !searchFiltered && selectedPath.length >= Math.max(levels.length - 1, 0);
  const showItemGrid = Boolean(searchFiltered) || atLeaf || levels.length === 0;

  const groupValues = showItemGrid
    ? []
    : Array.from(new Set(pathFiltered.map((item) => item.hierarchyPath[selectedPath.length]).filter(Boolean)));

  const displayedItems = searchFiltered ?? pathFiltered;

  function goToDepth(depth: number) {
    const next = selectedPath.slice(0, depth);
    patch({ path: next.length ? next.join(PATH_SEP) : null, q: null });
  }

  function drillInto(value: string) {
    patch({ path: [...selectedPath, value].join(PATH_SEP) });
  }

  return (
    <div className="crm-eco-explorer">
      <PageHeader
        breadcrumbs={[{ label: 'Catalogues', to: scopedHref('/catalogue-orders/catalogues') }, { label: catalogue.name }]}
        title={catalogue.name}
        description={catalogue.description}
        actions={
          <>
            <SourceModeBadge mode={catalogue.sourceMode} />
            {can(role, 'catalogue.configureSchema') ? (
              <Button variant="secondary" iconLeft={<Settings2 />} onClick={() => navigate(scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/schema`))}>
                Hierarchy &amp; attributes
              </Button>
            ) : null}
            {can(role, 'catalogue.import') && catalogue.sourceMode !== 'integrated' ? (
              <Button variant="secondary" iconLeft={<Upload />} onClick={() => navigate(scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/import`, { step: 'upload' }))}>
                Import
              </Button>
            ) : null}
          </>
        }
      />

      {catalogue.sourceStatus === 'stale' ? (
        <Banner tone="warning" title="This catalogue's source is stale" description={`Last synced ${catalogue.lastSync ? new Date(catalogue.lastSync).toLocaleString('en-IN') : 'never'}. Prices and stock may be out of date until the next sync or re-import.`} />
      ) : catalogue.sourceStatus === 'mapping-required' ? (
        <Banner tone="warning" title="Connector mapping required" description="This catalogue is integrated but source mapping has not been completed yet — items will not appear until mapping is finished." />
      ) : null}

      <div className="crm-eco-explorer__toolbar">
        <SearchField
          label="Search this catalogue"
          placeholder="Search by title, SKU or tag…"
          width="280px"
          value={q}
          onChange={(e) => patch({ q: e.target.value || null })}
        />
        {attributeFilterKeys.map((attribute) => (
          <Select
            key={attribute.id}
            label={attribute.name}
            size="sm"
            options={[
              { value: '', label: `All ${attribute.name.toLowerCase()}` },
              ...(attribute.dataType === 'boolean'
                ? [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]
                : (attribute.options ?? []).map((option) => ({ value: option, label: option }))),
            ]}
            value={searchParams.get(`attr_${attribute.key}`) ?? ''}
            onChange={(e) => patch({ [`attr_${attribute.key}`]: e.target.value || null })}
          />
        ))}
      </div>

      {!searchFiltered ? (
        <nav className="crm-eco-explorer__breadcrumb" aria-label="Hierarchy">
          <button type="button" onClick={() => goToDepth(0)} className={selectedPath.length === 0 ? 'is-current' : ''}>
            All
          </button>
          {selectedPath.map((value, index) => (
            <span key={`${value}-${index}`} className="crm-eco-explorer__breadcrumb-segment">
              <ChevronRight size={14} aria-hidden="true" />
              <button type="button" onClick={() => goToDepth(index + 1)} className={index === selectedPath.length - 1 ? 'is-current' : ''}>
                {value}
              </button>
            </span>
          ))}
        </nav>
      ) : null}

      {!showItemGrid ? (
        groupValues.length === 0 ? (
          <EmptyState title="No items at this level" description="Try a different filter, or go back a level." actions={<Button variant="secondary" onClick={() => goToDepth(selectedPath.length - 1)}>Back</Button>} />
        ) : (
          <div className="crm-eco-explorer__groups">
            {groupValues.map((value) => {
              const count = pathFiltered.filter((item) => item.hierarchyPath[selectedPath.length] === value).length;
              return (
                <button key={value} type="button" className="crm-eco-explorer__group-tile" onClick={() => drillInto(value)}>
                  <span className="crm-eco-explorer__group-label">{value}</span>
                  <span className="crm-eco-explorer__group-count">{count} item{count === 1 ? '' : 's'}</span>
                </button>
              );
            })}
          </div>
        )
      ) : displayedItems.length === 0 ? (
        <EmptyState
          title="No items match"
          description="Try a different search, filter or branch scope."
          actions={<Button variant="secondary" onClick={() => patch({ q: null, path: null })}>Clear</Button>}
        />
      ) : (
        <div className="crm-eco-explorer__item-grid">
          {displayedItems.map((item) => (
            <ItemCard key={item.id} item={item} onOpen={() => navigate(scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/items/${item.id}`))} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, onOpen }: { item: CatalogueItem; onOpen: () => void }) {
  const cover = item.media.find((m) => m.isCover) ?? item.media[0];
  return (
    <button type="button" className="crm-eco-explorer__item-card" onClick={onOpen}>
      <div className="crm-eco-explorer__item-media">
        {cover && cover.status === 'ok' ? (
          <img src={cover.url} alt="" loading="lazy" />
        ) : (
          <span className="crm-eco-explorer__item-media-placeholder">
            <ImageOff size={20} aria-hidden="true" />
            {cover?.status === 'broken' ? 'Broken media link' : 'No media yet'}
          </span>
        )}
        {item.sourceStale ? (
          <span className="crm-eco-explorer__item-stale">
            <Badge tone="warning">Stale</Badge>
          </span>
        ) : null}
      </div>
      <div className="crm-eco-explorer__item-body">
        <p className="crm-eco-explorer__item-code">{item.itemCode}</p>
        <p className="crm-eco-explorer__item-title">{item.title}</p>
        <PriceDisplay price={item.price} />
        {item.tags.length ? (
          <div className="crm-eco-explorer__item-tags">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} tone="neutral" appearance="outline">{tag}</Badge>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
}
