import { useMemo, useState } from 'react';
import { mergeContacts } from '@crm/app/crm-data';
import { ArrowLeft, GitMerge, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, ConfirmDialog, ErrorState } from '@crm/design-system';
import {
  activityForContact,
  findContact,
  findDuplicateCluster,
  findUser,
  type Contact,
  type ConsentState,
} from '@crm/mock-data';
import { DuplicateComparisonRow } from '../components';
import { consentLabel, stageLabel } from '../contact-labels';

/** Higher rank = more restrictive; the most restrictive consent is preserved. */
function consentRank(consent: ConsentState): number {
  return consent === 'opted-out' ? 2 : consent === 'pending' ? 1 : 0;
}

interface FieldDef {
  key: string;
  label: string;
  get: (c: Contact) => string;
  /** Fields the source spec requires an explicit winner for when they differ. */
  requiresChoice: boolean;
}

const fieldDefs: FieldDef[] = [
  { key: 'name', label: 'Name', get: (c) => c.name, requiresChoice: false },
  { key: 'mobile', label: 'Mobile', get: (c) => c.mobile, requiresChoice: false },
  { key: 'company', label: 'Company', get: (c) => c.company ?? '', requiresChoice: true },
  { key: 'city', label: 'City', get: (c) => c.city, requiresChoice: false },
  { key: 'owner', label: 'Owner', get: (c) => findUser(c.ownerId)?.name ?? 'Unassigned', requiresChoice: true },
  { key: 'stage', label: 'Stage', get: (c) => stageLabel[c.stage], requiresChoice: true },
  { key: 'source', label: 'Source', get: (c) => c.source, requiresChoice: false },
];

/**
 * CON-S11 — Duplicate Merge Review. Side-by-side records, match reason, a
 * field-by-field winner with an explicit choice required for conflicting
 * owner/company/stage, consent preserved as the most restrictive, and linked
 * history that is appended (never lost). Merge → confirm → canonical Customer 360.
 */
export default function DuplicateMergeScreen() {
  const { clusterId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const cluster = clusterId ? findDuplicateCluster(clusterId) : undefined;
  const a = cluster ? findContact(cluster.contactIds[0]) : undefined;
  const b = cluster ? findContact(cluster.contactIds[1]) : undefined;

  const [primaryIndex, setPrimaryIndex] = useState(() =>
    cluster && a && cluster.suggestedPrimaryId === a.id ? 0 : 1,
  );
  const [choices, setChoices] = useState<Record<string, number | null>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Which required fields actually conflict (differing values).
  const conflictKeys = useMemo(() => {
    if (!a || !b) return [];
    return fieldDefs.filter((f) => f.requiresChoice && f.get(a) !== f.get(b)).map((f) => f.key);
  }, [a, b]);

  if (!cluster || !a || !b) {
    return (
      <ErrorState
        title="Duplicate cluster not found"
        description="This merge review is no longer available — the records may already have been merged."
        actions={
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/contacts/data-quality', { tab: 'duplicates' }))}>
            Back to Data Quality
          </Button>
        }
      />
    );
  }

  const records = [a, b];
  const unresolved = conflictKeys.filter((key) => choices[key] === undefined || choices[key] === null);
  const canMerge = unresolved.length === 0;

  const winnerFor = (f: FieldDef): number | null => {
    if (conflictKeys.includes(f.key)) return choices[f.key] ?? null;
    return primaryIndex; // non-conflicts follow the canonical record
  };

  const restrictiveConsent = consentRank(a.consent) >= consentRank(b.consent) ? a.consent : b.consent;
  const canonical = records[primaryIndex];
  const activityCount = activityForContact(a.id).length + activityForContact(b.id).length;

  const doMerge = async () => {
    setConfirmOpen(false);
    const dupId = records[1 - primaryIndex].id;
    try {
      await mergeContacts(canonical.id, [dupId]);
    } catch {
      return; // leave the review open if the merge fails
    }
    navigate(scopedHref(`/contacts/customer/${canonical.id}`, { flash: 'Contacts merged' }));
  };

  return (
    <div className="crm-merge">
      <PageHeader
        breadcrumbs={[
          { label: 'Contacts', to: scopedHref('/contacts') },
          { label: 'Data Quality', to: scopedHref('/contacts/data-quality', { tab: 'duplicates' }) },
          { label: 'Merge review' },
        ]}
        title="Duplicate merge review"
        description={cluster.matchReason}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(scopedHref('/contacts/data-quality', { tab: 'duplicates' }))}>
              Keep separate
            </Button>
            <Button variant="secondary" onClick={() => navigate(scopedHref(`/contacts/customer/${a.id}`))}>
              Open records
            </Button>
            <Button variant="primary" iconLeft={<GitMerge />} disabled={!canMerge} onClick={() => setConfirmOpen(true)} title={canMerge ? undefined : 'Resolve every conflict first'}>
              Merge contacts
            </Button>
          </>
        }
      />

      <div className="crm-merge__match">
        <Badge tone={cluster.matchStrength === 'strong' ? 'danger' : 'warning'}>
          {cluster.matchStrength === 'strong' ? 'Strong match' : 'Possible match'}
        </Badge>
        {conflictKeys.length > 0 ? (
          <span className={canMerge ? 'crm-merge__conflicts crm-merge__conflicts--ok' : 'crm-merge__conflicts'}>
            {canMerge ? 'All conflicts resolved' : `${unresolved.length} conflict${unresolved.length > 1 ? 's' : ''} need a choice`}
          </span>
        ) : (
          <span className="crm-merge__conflicts crm-merge__conflicts--ok">No field conflicts</span>
        )}
      </div>

      {/* Canonical selector */}
      <div className="crm-merge__primary">
        <span className="crm-merge__primary-label">Keep as canonical record</span>
        <div className="crm-merge__primary-opts">
          {records.map((rec, i) => (
            <label key={rec.id} className={`crm-merge__primary-opt${primaryIndex === i ? ' crm-merge__primary-opt--active' : ''}`}>
              <input type="radio" name="canonical" checked={primaryIndex === i} onChange={() => setPrimaryIndex(i)} />
              <span>
                <strong>{rec.name}</strong>
                <span className="crm-merge__primary-meta">{rec.mobile}{rec.company ? ` · ${rec.company}` : ''}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Field-by-field comparison */}
      <section className="crm-merge__compare">
        <div className="crm-merge__compare-head">
          <span />
          {records.map((rec, i) => (
            <span key={rec.id} className="crm-merge__col-head">
              {rec.name}
              {primaryIndex === i ? <Badge tone="brand">Canonical</Badge> : null}
            </span>
          ))}
        </div>
        {fieldDefs.map((f) => {
          const conflict = conflictKeys.includes(f.key);
          return (
            <DuplicateComparisonRow
              key={f.key}
              field={f.label}
              values={[f.get(a), f.get(b)]}
              winnerIndex={winnerFor(f)}
              conflict={conflict}
              readOnly={!conflict}
              onChoose={(index) => setChoices((prev) => ({ ...prev, [f.key]: index }))}
            />
          );
        })}
        {/* Consent is not a free choice — preserve the most restrictive. */}
        <div className="crm-merge__consent">
          <span className="crm-merge__consent-label">Consent</span>
          <span className="crm-merge__consent-value">
            Preserved as most restrictive: <Badge tone={restrictiveConsent === 'opted-out' ? 'danger' : restrictiveConsent === 'pending' ? 'warning' : 'success'}>{consentLabel[restrictiveConsent]}</Badge>
          </span>
        </div>
      </section>

      {/* History preservation */}
      <div className="crm-merge__history">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>History is preserved.</strong> All source history and {activityCount} linked activities
          (messages, calls, campaigns, orders) from both records are appended to the canonical contact. Nothing is deleted.
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Merge these contacts?"
        message={`${a.name} and ${b.name} will be merged into ${canonical.name}. This cannot be undone.`}
        confirmLabel="Merge contacts"
        tone="default"
        onConfirm={doMerge}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
