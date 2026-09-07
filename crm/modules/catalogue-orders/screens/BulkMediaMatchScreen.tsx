import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Banner, Button, ErrorState, Select, Toast } from '@crm/design-system';
import { findCatalogue, findItem, itemsForCatalogue, mediaMatchBatch, mediaMatchSummary } from '../data';
import { mediaMatchStatusLabel } from '../catalogue-orders-labels';
import type { MediaAsset, MediaMatchCandidate } from '../domain/types';

let mediaSeq = 9500;

/** ECO-S12 — Bulk Media Match: match a batch of uploaded files to catalogue items by filename. */
export default function BulkMediaMatchScreen() {
  const { catalogueId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const catalogue = catalogueId ? findCatalogue(catalogueId) : undefined;

  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, 'applied' | 'discarded'>>({});
  const [toast, setToast] = useState<string | null>(null);

  const items = useMemo(() => (catalogue ? itemsForCatalogue(catalogue.id) : []), [catalogue]);
  const summary = mediaMatchSummary();

  if (!catalogue) {
    return (
      <ErrorState
        title="Catalogue not found"
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>Back to Catalogues</Button>}
      />
    );
  }

  function resolutionFor(candidate: MediaMatchCandidate): string {
    if (resolutions[candidate.id]) return resolutions[candidate.id];
    if (candidate.status === 'matched') return candidate.matchedItemIds[0];
    return '';
  }

  function applyCandidate(candidate: MediaMatchCandidate) {
    const itemId = resolutionFor(candidate);
    const item = itemId ? findItem(itemId) : undefined;
    if (!item) return;
    mediaSeq += 1;
    const asset: MediaAsset = {
      id: `media_${mediaSeq}`,
      itemId: item.id,
      kind: candidate.kind,
      url: candidate.kind === 'image' ? `https://picsum.photos/seed/${item.id}-${mediaSeq}/640/640` : `https://example-cdn.northline.test/videos/${item.id}-${mediaSeq}.mp4`,
      fileName: candidate.fileName,
      isCover: item.media.length === 0,
      order: item.media.length + 1,
      caption: item.title,
      customerVisible: true,
      status: 'ok',
      source: 'bulk-match',
    };
    item.media = [...item.media, asset];
    setApplied((prev) => ({ ...prev, [candidate.id]: 'applied' }));
  }

  function discardCandidate(candidateId: string) {
    setApplied((prev) => ({ ...prev, [candidateId]: 'discarded' }));
  }

  function applyAllMatched() {
    let count = 0;
    for (const candidate of mediaMatchBatch) {
      if (candidate.status === 'matched' && !applied[candidate.id]) {
        applyCandidate(candidate);
        count += 1;
      }
    }
    setToast(`Applied ${count} matched file${count === 1 ? '' : 's'} to their catalogue items.`);
  }

  return (
    <div className="crm-eco-bulkmatch">
      <PageHeader
        breadcrumbs={[
          { label: 'Catalogues', to: scopedHref('/catalogue-orders/catalogues') },
          { label: catalogue.name, to: scopedHref(`/catalogue-orders/catalogues/${catalogue.id}/explorer`) },
          { label: 'Bulk Media Match' },
        ]}
        title="Bulk Media Match"
        description="Files are matched to items by identifier found in the filename. Review multiple-match and unmatched files before confirming."
        actions={<Button variant="primary" iconLeft={<CheckCheck />} onClick={applyAllMatched}>Apply all matched</Button>}
      />

      <div className="crm-eco-bulkmatch__summary">
        <SummaryTile label="Matched" value={summary.matched} tone="success" />
        <SummaryTile label="Multiple matches" value={summary.multiple} tone="warning" />
        <SummaryTile label="Unmatched" value={summary.unmatched} tone="danger" />
        <SummaryTile label="Conflicting" value={summary.conflicting} tone="danger" />
      </div>

      {summary.unmatched + summary.multiple + summary.conflicting > 0 ? (
        <Banner tone="warning" title="Some files need a manual decision" description="Choose the correct item for multiple-match and conflicting files, or assign unmatched files manually — otherwise leave them and discard." />
      ) : null}

      <table className="crm-eco-bulkmatch__table">
        <thead><tr><th>File</th><th>Kind</th><th>Match status</th><th>Assign to</th><th>Action</th></tr></thead>
        <tbody>
          {mediaMatchBatch.map((candidate) => {
            const state = applied[candidate.id];
            const candidates = candidate.status === 'unmatched' ? items : candidate.matchedItemIds.map((id) => findItem(id)).filter(Boolean) as typeof items;
            return (
              <tr key={candidate.id} className={state ? `is-${state}` : ''}>
                <td>{candidate.fileName}</td>
                <td>{candidate.kind}</td>
                <td>
                  <Badge tone={candidate.status === 'matched' ? 'success' : candidate.status === 'unmatched' ? 'danger' : 'warning'}>
                    {mediaMatchStatusLabel[candidate.status]}
                  </Badge>
                </td>
                <td>
                  {state ? (
                    findItem(resolutionFor(candidate))?.title ?? '—'
                  ) : (
                    <Select
                      label={`Assign ${candidate.fileName}`}
                      hideLabel
                      options={[{ value: '', label: 'Choose an item…' }, ...candidates.map((item) => ({ value: item.id, label: item.title }))]}
                      value={resolutionFor(candidate)}
                      onChange={(e) => setResolutions((prev) => ({ ...prev, [candidate.id]: e.target.value }))}
                    />
                  )}
                </td>
                <td>
                  {state === 'applied' ? (
                    <Badge tone="success">Applied</Badge>
                  ) : state === 'discarded' ? (
                    <Badge tone="neutral">Discarded</Badge>
                  ) : (
                    <div className="crm-eco-bulkmatch__row-actions">
                      <Button variant="secondary" size="sm" disabled={!resolutionFor(candidate)} onClick={() => applyCandidate(candidate)}>Apply</Button>
                      <Button variant="ghost" size="sm" onClick={() => discardCandidate(candidate.id)}>Discard</Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'danger' }) {
  return (
    <div className={`crm-eco-bulkmatch__tile crm-eco-bulkmatch__tile--${tone}`}>
      <span className="crm-eco-bulkmatch__tile-value">{value}</span>
      <span className="crm-eco-bulkmatch__tile-label">{label}</span>
    </div>
  );
}
