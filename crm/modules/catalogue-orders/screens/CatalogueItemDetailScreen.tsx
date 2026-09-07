import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ExternalLink, ImageOff, Images, SquarePen } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Badge,
  Banner,
  Button,
  Drawer,
  ErrorState,
  Tabs,
  Textarea,
  Toast,
  Input,
  type TabItem,
} from '@crm/design-system';
import { FieldOwnershipTag, PriceDisplay, SourceModeBadge } from '../components';
import { findCatalogue, findConnector, findItem, inventoryForItem } from '../data';
import { formatDualQuantity } from '../domain/units';
import { catalogueItemStatusLabel, catalogueItemStatusTone } from '../catalogue-orders-labels';
import { can } from '../permissions';

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'media', label: 'Media' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'activity', label: 'Sync & Activity' },
];

/** ECO-S04 — Catalogue Item / Design Detail. */
export default function CatalogueItemDetailScreen() {
  const { catalogueId, itemId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [tagsText, setTagsText] = useState('');

  const item = itemId ? findItem(itemId) : undefined;
  const catalogue = item ? findCatalogue(item.catalogueId) : catalogueId ? findCatalogue(catalogueId) : undefined;

  if (!item || !catalogue) {
    return (
      <ErrorState
        title="Item not found"
        description="This catalogue item may have been removed, or the link is out of date."
        actions={
          <Button variant="secondary" onClick={() => navigate(scopedHref(`/catalogue-orders/catalogues/${catalogueId ?? ''}/explorer`))}>
            Back to catalogue
          </Button>
        }
      />
    );
  }

  const connector = findConnector(catalogue.connectorId);
  const activeTab = searchParams.get('tab') ?? 'overview';
  const setTab = (id: string) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('tab', id); return next; });

  const cover = item.media.find((m) => m.isCover) ?? item.media[0];
  const positions = inventoryForItem(item.id);
  const canEditCrm = can(role, 'catalogue.editCrmFields');
  const hasSourceOwnedFields = Object.values(item.fieldOwnership).some((o) => o.owner === 'source');

  const safeItem = item;

  function openEdit() {
    setCaption(safeItem.whatsappCaption);
    setTagsText(safeItem.tags.join(', '));
    setEditOpen(true);
  }

  function saveEdit() {
    safeItem.whatsappCaption = caption;
    safeItem.tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    setEditOpen(false);
    setToast('CRM-owned fields saved (prototype — not sent to any connector).');
  }

  return (
    <div className="crm-eco-itemdetail">
      <PageHeader
        breadcrumbs={[
          { label: 'Catalogues', to: scopedHref('/catalogue-orders/catalogues') },
          { label: catalogue.name, to: scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/explorer`) },
          { label: item.title },
        ]}
        title={item.title}
        description={`${item.itemCode} · SKU ${item.sku}${item.externalId ? ` · External ID ${item.externalId}` : ''}`}
        actions={
          <>
            <SourceModeBadge mode={catalogue.sourceMode} />
            <Badge tone={catalogueItemStatusTone[item.status]}>{catalogueItemStatusLabel[item.status]}</Badge>
            {canEditCrm ? (
              <Button variant="secondary" iconLeft={<SquarePen />} onClick={openEdit}>
                Edit CRM fields
              </Button>
            ) : null}
            {hasSourceOwnedFields && connector ? (
              <Button
                variant="ghost"
                iconLeft={<ExternalLink />}
                onClick={() => setToast(`Would open ${item.externalId ?? item.sku} in ${connector.name} — read-only fields are edited at the source.`)}
              >
                Open in source
              </Button>
            ) : null}
          </>
        }
      />

      {item.sourceStale ? (
        <Banner tone="warning" title="Source fields may be out of date" description="This item's source-owned fields (weight, price, stock) were last refreshed before the catalogue's staleness threshold." />
      ) : null}

      <div className="crm-eco-itemdetail__hero">
        <div className="crm-eco-itemdetail__media">
          {cover && cover.status === 'ok' ? (
            <img src={cover.url} alt="" />
          ) : (
            <span className="crm-eco-itemdetail__media-placeholder">
              <ImageOff size={24} aria-hidden="true" />
              {cover?.status === 'broken' ? 'Broken media link' : 'No media yet'}
            </span>
          )}
        </div>
        <div className="crm-eco-itemdetail__summary">
          <PriceDisplay price={item.price} />
          <p className="crm-eco-itemdetail__path">{item.hierarchyPath.join(' / ')}</p>
          <p className="crm-eco-itemdetail__caption">{item.whatsappCaption}</p>
          <div className="crm-eco-itemdetail__chips">
            {item.collections.map((c) => <Badge key={c} tone="brand" appearance="outline">{c}</Badge>)}
            {item.tags.map((t) => <Badge key={t} tone="neutral" appearance="outline">{t}</Badge>)}
          </div>
          <p className="crm-eco-itemdetail__branches">Visible at: {item.branchVisibility.length} branch{item.branchVisibility.length === 1 ? '' : 'es'} · {item.customerVisible ? 'Customer-visible' : 'Internal only'}</p>
        </div>
      </div>

      <Tabs tabs={tabs} activeId={activeTab} onChange={setTab} ariaLabel="Item detail sections" />

      {activeTab === 'overview' ? (
        <div className="crm-eco-itemdetail__panel">
          {item.variants.length > 0 ? (
            <table className="crm-eco-itemdetail__variant-table">
              <caption>Variants</caption>
              <thead><tr><th>Variant</th><th>SKU</th><th>Available</th></tr></thead>
              <tbody>
                {item.variants.map((v) => (
                  <tr key={v.id}>
                    <td>{v.label}</td>
                    <td>{v.sku}</td>
                    <td>{v.available ? <Badge tone="success">In stock</Badge> : <Badge tone="danger">Out of stock</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="crm-eco-itemdetail__deferred">No variant options for this item — hierarchy leaf and SKU are one-to-one.</p>
          )}
        </div>
      ) : null}

      {activeTab === 'attributes' ? (
        <dl className="crm-eco-itemdetail__attrgrid">
          {Object.entries(item.attributes).map(([key, value]) => (
            <div key={key} className="crm-eco-itemdetail__attrgrid-row">
              <dt>{key}</dt>
              <dd>
                {Array.isArray(value) ? value.join(', ') : String(value)}
                <FieldOwnershipTag ownership={item.fieldOwnership[key]} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {activeTab === 'media' ? (
        <div className="crm-eco-itemdetail__panel">
          {item.media.length === 0 ? (
            <p className="crm-eco-itemdetail__deferred">No media uploaded yet for this item.</p>
          ) : (
            <div className="crm-eco-itemdetail__media-grid">
              {item.media.map((m) => (
                <div key={m.id} className="crm-eco-itemdetail__media-tile">
                  {m.status === 'ok' && m.kind === 'image' ? <img src={m.url} alt={m.caption} /> : <span className="crm-eco-itemdetail__media-placeholder"><ImageOff size={18} /> {m.status === 'broken' ? 'Broken' : m.kind}</span>}
                  {m.isCover ? <Badge tone="brand">Cover</Badge> : null}
                </div>
              ))}
            </div>
          )}
          {can(role, 'catalogue.manageMedia') ? (
            <Button variant="secondary" iconLeft={<Images />} onClick={() => navigate(scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/media`, { itemId: item.id }))}>
              Manage media
            </Button>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'inventory' ? (
        <div className="crm-eco-itemdetail__panel">
          {positions.length === 0 ? (
            <p className="crm-eco-itemdetail__deferred">No inventory positions recorded for this item.</p>
          ) : (
            <table className="crm-eco-itemdetail__variant-table">
              <caption>Inventory by branch</caption>
              <thead><tr><th>Branch</th><th>Quantity</th><th>Source</th><th>Updated</th><th>Status</th></tr></thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={`${p.branchId}-${p.variantId ?? 'base'}`}>
                    <td>{p.branchId.replace('branch_', '')}</td>
                    <td>{formatDualQuantity(p.primaryQuantity, p.primaryUnit, p.secondaryQuantity, p.secondaryUnit)}</td>
                    <td>{p.source}</td>
                    <td>{new Date(p.updatedAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      {p.madeToOrder ? <Badge tone="info">Made to order</Badge> : p.stale ? <Badge tone="warning">Stale</Badge> : p.primaryQuantity === 0 ? <Badge tone="danger">Out of stock</Badge> : <Badge tone="success">In stock</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/inventory', { itemId: item.id }))}>
            Open in Inventory &amp; Availability
          </Button>
        </div>
      ) : null}

      {activeTab === 'activity' ? (
        <ul className="crm-eco-itemdetail__timeline">
          {item.audit.length === 0 ? <p className="crm-eco-itemdetail__deferred">No sync or manual activity recorded yet.</p> : null}
          {item.audit.map((event) => (
            <li key={event.id}>
              <span className="crm-eco-itemdetail__timeline-date">{new Date(event.at).toLocaleString('en-IN')}</span>
              <span className="crm-eco-itemdetail__timeline-action">{event.action}</span>
              <span className="crm-eco-itemdetail__timeline-detail">{event.detail}</span>
              <span className="crm-eco-itemdetail__timeline-actor">{event.actorLabel}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Edit CRM-owned fields">
        <div className="crm-eco-itemdetail__edit-form">
          <Textarea label="WhatsApp caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
          <Input label="Tags (comma-separated)" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
          <p className="crm-eco-itemdetail__edit-hint">Weight, price, stock and identifiers are source-owned here and can only be changed at the source.</p>
          <div className="crm-eco-itemdetail__edit-actions">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveEdit}>Save</Button>
          </div>
        </div>
      </Drawer>

      {toast ? <Toast tone="info" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
