import { UserPlus, UploadCloud, Save } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Banner, Button, Checkbox } from '@crm/design-system';
import { AudienceBreakdownPanel } from '../../components';
import { calculateAudienceBreakdown } from '../../domain/audienceCalculation';
import type { AudienceExclusionRef, AudienceSourceRef, Campaign } from '../../domain/types';
import { entireDatabaseCount, estimateAudienceDecay, exclusionSources, filterSources, segmentSources } from '../../data/audienceSources';
import { AudienceUploadWizard } from './AudienceUploadWizard';

const ENTIRE_DB_ID = 'src_entire_database';

/** CAM-S05 — Builder Audience: include/exclude sources and the authoritative eligibility waterfall. */
export function AudienceStep({
  draft,
  setDraft,
  branchId,
  builderUrl,
}: {
  draft: Campaign;
  setDraft: (updater: (d: Campaign) => Campaign) => void;
  branchId: string;
  builderUrl: string;
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();

  const uploadOpen = searchParams.get('uploadStep') !== null;
  const openUpload = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('uploadStep', 'file');
      return next;
    });
  const closeUpload = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('uploadStep');
      next.delete('uploadResult');
      return next;
    });

  const resultAudienceSources = draft.includedSources.filter((s) => s.kind === 'result-audience');
  const pickedSources = draft.includedSources.filter((s) => s.kind !== 'result-audience');
  const usingEntireDatabase = pickedSources.some((s) => s.id === ENTIRE_DB_ID);

  const recalculate = (included: AudienceSourceRef[], excluded: AudienceExclusionRef[]) => {
    const decay = estimateAudienceDecay(
      included.reduce((sum, s) => sum + s.count, 0),
      included.length,
    );
    setDraft((d) => ({
      ...d,
      includedSources: included,
      excludedSources: excluded,
      audience: calculateAudienceBreakdown({
        includedSources: included,
        excludedSources: excluded,
        duplicatesRemoved: decay.duplicatesRemoved,
        consentIneligible: decay.consentIneligible,
        invalidContactData: decay.invalidContactData,
        invalidPersonalisation: d.audience.invalidPersonalisation,
      }),
      updatedAt: new Date().toISOString(),
    }));
  };

  const toggleEntireDatabase = () => {
    if (usingEntireDatabase) {
      recalculate([...resultAudienceSources], draft.excludedSources);
    } else {
      recalculate(
        [...resultAudienceSources, { id: ENTIRE_DB_ID, kind: 'contacts', label: 'Entire accessible database', count: entireDatabaseCount(branchId) }],
        draft.excludedSources,
      );
    }
  };

  const toggleSource = (source: AudienceSourceRef) => {
    const exists = pickedSources.some((s) => s.id === source.id);
    const nextPicked = exists ? pickedSources.filter((s) => s.id !== source.id) : [...pickedSources, source];
    recalculate([...resultAudienceSources, ...nextPicked], draft.excludedSources);
  };

  const toggleExclusion = (exclusion: AudienceExclusionRef) => {
    const exists = draft.excludedSources.some((e) => e.id === exclusion.id);
    const next = exists ? draft.excludedSources.filter((e) => e.id !== exclusion.id) : [...draft.excludedSources, exclusion];
    recalculate(draft.includedSources, next);
  };

  const addUploadSource = (source: AudienceSourceRef) => {
    recalculate([...draft.includedSources, source], draft.excludedSources);
  };

  const saveAsSegment = () => navigate(scopedHref('/contacts/segments/new', { returnTo: builderUrl }));

  const hasAnySource = draft.includedSources.length > 0;

  return (
    <div className="crm-camp-audience-step">
      {resultAudienceSources.length > 0 ? (
        <div className="crm-camp-audience-step__section">
          <h3>Carried over from source campaign</h3>
          {resultAudienceSources.map((source) => (
            <div key={source.id} className="crm-camp-audience-step__source-row crm-camp-audience-step__source-row--locked">
              <span>{source.label}</span>
              <span className="crm-camp-audience-step__count">{source.count.toLocaleString('en-IN')}</span>
            </div>
          ))}
          <p className="crm-camp-audience-step__hint">
            This follow-up audience will be revalidated for current eligibility before it can send.
          </p>
        </div>
      ) : null}

      <div className="crm-camp-audience-step__section">
        <h3>Included audience</h3>
        <Checkbox
          label={`Entire accessible database (${entireDatabaseCount(branchId).toLocaleString('en-IN')} contacts in scope)`}
          checked={usingEntireDatabase}
          onChange={toggleEntireDatabase}
        />

        {!usingEntireDatabase ? (
          <>
            <p className="crm-camp-audience-step__group-label">Segments</p>
            {segmentSources(branchId).map((source) => (
              <Checkbox
                key={source.id}
                label={`${source.label} (${source.count.toLocaleString('en-IN')})`}
                checked={pickedSources.some((s) => s.id === source.id)}
                onChange={() => toggleSource(source)}
              />
            ))}

            <p className="crm-camp-audience-step__group-label">Filters</p>
            {filterSources.map((source) => (
              <Checkbox
                key={source.id}
                label={`${source.label} (${source.count.toLocaleString('en-IN')})`}
                checked={pickedSources.some((s) => s.id === source.id)}
                onChange={() => toggleSource(source)}
              />
            ))}

            {pickedSources
              .filter((s) => s.kind === 'upload')
              .map((source) => (
                <Checkbox key={source.id} label={`${source.label} (${source.count.toLocaleString('en-IN')})`} checked disabled />
              ))}

            <div className="crm-camp-audience-step__actions">
              <Button variant="secondary" iconLeft={<UserPlus />} onClick={() => navigate(scopedHref('/contacts', { returnTo: builderUrl }))}>
                Add contacts from Contacts
              </Button>
              <Button variant="secondary" iconLeft={<UploadCloud />} onClick={openUpload}>
                Upload a file (this campaign only, or save to Contacts)
              </Button>
            </div>
          </>
        ) : (
          <p className="crm-camp-audience-step__hint">
            Other sources are disabled while "Entire accessible database" is selected — it already includes them.
          </p>
        )}
      </div>

      {!usingEntireDatabase ? (
        <div className="crm-camp-audience-step__section">
          <h3>Exclusions</h3>
          {exclusionSources.map((exclusion) => (
            <Checkbox
              key={exclusion.id}
              label={`${exclusion.label} (${exclusion.count.toLocaleString('en-IN')})`}
              checked={draft.excludedSources.some((e) => e.id === exclusion.id)}
              onChange={() => toggleExclusion(exclusion)}
            />
          ))}
        </div>
      ) : null}

      <div className="crm-camp-audience-step__section">
        <h3>Audience breakdown</h3>
        {hasAnySource ? (
          <AudienceBreakdownPanel breakdown={draft.audience} snapshotAt={draft.audienceSnapshotAt} provisional />
        ) : (
          <Banner tone="info" title="No audience selected yet" description="Choose at least one source above to see the eligible-recipient breakdown." />
        )}
        {hasAnySource && !usingEntireDatabase ? (
          <Button variant="ghost" iconLeft={<Save />} onClick={saveAsSegment}>
            Save this audience as a Contacts segment
          </Button>
        ) : null}
      </div>

      <AudienceUploadWizard open={uploadOpen} onClose={closeUpload} onComplete={addUploadSource} />
    </div>
  );
}
