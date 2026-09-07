import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ImageOff, Plus, Star, Trash2 } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, EmptyState, ErrorState, Toggle } from '@crm/design-system';
import { findCatalogue, itemsForCatalogue } from '../data';
import type { MediaAsset } from '../domain/types';

let mediaSeq = 9000;

/** ECO-S11 — Media Manager: append/reorder/remove media after import. */
export default function MediaManagerScreen() {
  const { catalogueId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const catalogue = catalogueId ? findCatalogue(catalogueId) : undefined;
  const [, forceRerender] = useState(0);

  const items = useMemo(() => (catalogue ? itemsForCatalogue(catalogue.id) : []), [catalogue]);
  const selectedItemId = searchParams.get('itemId') ?? items[0]?.id ?? null;
  const selectedItem = items.find((item) => item.id === selectedItemId);

  if (!catalogue) {
    return (
      <ErrorState
        title="Catalogue not found"
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>Back to Catalogues</Button>}
      />
    );
  }

  function selectItem(id: string) {
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('itemId', id); return next; });
  }

  function refresh() {
    forceRerender((n) => n + 1);
  }

  function addSampleMedia() {
    if (!selectedItem) return;
    mediaSeq += 1;
    const asset: MediaAsset = {
      id: `media_${mediaSeq}`,
      itemId: selectedItem.id,
      kind: 'image',
      url: `https://picsum.photos/seed/${selectedItem.id}-${mediaSeq}/640/640`,
      fileName: `${selectedItem.itemCode}_${mediaSeq}.jpg`,
      isCover: selectedItem.media.length === 0,
      order: selectedItem.media.length + 1,
      caption: selectedItem.title,
      customerVisible: true,
      status: 'ok',
      source: 'upload',
    };
    selectedItem.media = [...selectedItem.media, asset];
    refresh();
  }

  function setCover(mediaId: string) {
    if (!selectedItem) return;
    selectedItem.media = selectedItem.media.map((m) => ({ ...m, isCover: m.id === mediaId }));
    refresh();
  }

  function removeMedia(mediaId: string) {
    if (!selectedItem) return;
    const wasCover = selectedItem.media.find((m) => m.id === mediaId)?.isCover;
    const remaining = selectedItem.media.filter((m) => m.id !== mediaId);
    if (wasCover && remaining.length > 0) remaining[0].isCover = true;
    selectedItem.media = remaining;
    refresh();
  }

  function move(mediaId: string, direction: -1 | 1) {
    if (!selectedItem) return;
    const media = [...selectedItem.media];
    const index = media.findIndex((m) => m.id === mediaId);
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    [media[index], media[target]] = [media[target], media[index]];
    selectedItem.media = media.map((m, i) => ({ ...m, order: i + 1 }));
    refresh();
  }

  function toggleCustomerVisible(mediaId: string) {
    if (!selectedItem) return;
    selectedItem.media = selectedItem.media.map((m) => (m.id === mediaId ? { ...m, customerVisible: !m.customerVisible } : m));
    refresh();
  }

  return (
    <div className="crm-eco-media">
      <PageHeader
        breadcrumbs={[
          { label: 'Catalogues', to: scopedHref('/catalogue-orders/catalogues') },
          { label: catalogue.name, to: scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/explorer`) },
          { label: 'Media Manager' },
        ]}
        title="Media Manager"
        description="Add, reorder and enrich media after import — the catalogue's source never has to carry images or video."
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/media/bulk-match`))}>Bulk media match</Button>}
      />

      <div className="crm-eco-media__layout">
        <nav className="crm-eco-media__item-list" aria-label="Items">
          {items.map((item) => {
            const cover = item.media.find((m) => m.isCover);
            const broken = item.media.some((m) => m.status === 'broken');
            return (
              <button
                key={item.id}
                type="button"
                className={`crm-eco-media__item-row${item.id === selectedItemId ? ' is-selected' : ''}`}
                onClick={() => selectItem(item.id)}
              >
                <span className="crm-eco-media__item-thumb">
                  {cover && cover.status === 'ok' ? <img src={cover.url} alt="" /> : <ImageOff size={16} aria-hidden="true" />}
                </span>
                <span className="crm-eco-media__item-info">
                  <span className="crm-eco-media__item-title">{item.title}</span>
                  <span className="crm-eco-media__item-meta">
                    {item.media.length} asset{item.media.length === 1 ? '' : 's'}
                    {item.media.length === 0 ? <Badge tone="warning">No media</Badge> : broken ? <Badge tone="danger">Broken link</Badge> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="crm-eco-media__panel">
          {!selectedItem ? (
            <EmptyState title="No items in this catalogue yet" description="Import or add items before managing media." />
          ) : (
            <>
              <div className="crm-eco-media__panel-header">
                <h2>{selectedItem.title}</h2>
                <Button variant="secondary" size="sm" iconLeft={<Plus />} onClick={addSampleMedia}>Add media</Button>
              </div>

              {selectedItem.media.length === 0 ? (
                <EmptyState title="No media yet" description="This item has no images or video — add media to make it shareable on WhatsApp." actions={<Button variant="primary" iconLeft={<Plus />} onClick={addSampleMedia}>Add media</Button>} />
              ) : (
                <div className="crm-eco-media__grid">
                  {selectedItem.media.map((asset, index) => (
                    <div key={asset.id} className="crm-eco-media__tile">
                      <div className="crm-eco-media__tile-media">
                        {asset.status === 'ok' && asset.kind === 'image' ? (
                          <img src={asset.url} alt={asset.caption} />
                        ) : (
                          <span className="crm-eco-media__tile-placeholder"><ImageOff size={18} />{asset.status === 'broken' ? 'Broken link' : asset.kind}</span>
                        )}
                        {asset.isCover ? <Badge tone="brand">Cover</Badge> : null}
                      </div>
                      <div className="crm-eco-media__tile-actions">
                        <Button variant="ghost" size="sm" onClick={() => setCover(asset.id)} disabled={asset.isCover} aria-label="Set as cover"><Star size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => move(asset.id, -1)} disabled={index === 0} aria-label="Move earlier"><ArrowUp size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => move(asset.id, 1)} disabled={index === selectedItem.media.length - 1} aria-label="Move later"><ArrowDown size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => removeMedia(asset.id)} aria-label="Remove"><Trash2 size={14} /></Button>
                      </div>
                      <Toggle label="Customer-visible" checked={asset.customerVisible} onChange={() => toggleCustomerVisible(asset.id)} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
