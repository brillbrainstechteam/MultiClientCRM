import { ArrowLeft, Download, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, ErrorState } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';
import { findBranch, findImportJob, findUser, type ImportJobStatus } from '@crm/mock-data';
import { methodLabels } from '../imports/import-flow';

const statusTone: Record<ImportJobStatus, BadgeTone> = {
  queued: 'neutral',
  processing: 'info',
  completed: 'success',
  'partial-success': 'warning',
  failed: 'danger',
};

const statusLabel: Record<ImportJobStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  'partial-success': 'Partial success',
  failed: 'Failed',
};

/**
 * CON-S08 — Import Job Detail. Source metadata, counts, rejected rows/reasons
 * and report downloads. "View added contacts" drills into a filtered CON-S02.
 */
export default function ImportJobDetailScreen() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  const job = jobId ? findImportJob(jobId) : undefined;

  if (!job) {
    // A freshly-completed wizard job id has no fixture; show a friendly summary.
    return (
      <ErrorState
        title="Import job details are not available"
        description="This import job has no stored detail record in the prototype. Open a job from the import history instead."
        actions={
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/contacts/imports'))}>
            Back to Imports & Sync
          </Button>
        }
      />
    );
  }

  const startedBy = findUser(job.startedByUserId)?.name ?? job.startedByUserId;
  const branch = findBranch(job.branchId)?.name ?? job.branchId;
  const hasRejected = job.counts.rejected > 0;

  return (
    <div className="crm-job">
      <PageHeader
        breadcrumbs={[
          { label: 'Contacts', to: scopedHref('/contacts') },
          { label: 'Imports & Sync', to: scopedHref('/contacts/imports') },
          { label: job.fileName ?? methodLabels[job.method] },
        ]}
        title={job.fileName ?? methodLabels[job.method]}
        description={`${methodLabels[job.method]} · started by ${startedBy}`}
        actions={
          <>
            <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/contacts/imports'))}>
              Back
            </Button>
            <Button variant="secondary" iconLeft={<Download />} title="Download the full import report">
              Download report
            </Button>
            <Button variant="primary" iconLeft={<Users />} onClick={() => navigate(scopedHref('/contacts/all', { source: job.sourceTag }))}>
              View added contacts
            </Button>
          </>
        }
      />

      <section className="crm-job__status">
        <Badge tone={statusTone[job.status]}>{statusLabel[job.status]}</Badge>
        <span className="crm-job__status-meta">{formatDateTime(job.createdAt)}</span>
      </section>

      <section className="crm-job__counts">
        <Count label="Added" value={job.counts.added} tone="success" />
        <Count label="Updated" value={job.counts.updated} tone="info" />
        <Count label="Skipped" value={job.counts.skipped} tone="neutral" />
        <Count label="Rejected" value={job.counts.rejected} tone={hasRejected ? 'danger' : 'neutral'} />
        <Count label="Total rows" value={job.counts.total} tone="neutral" />
      </section>

      <section className="crm-job__grid">
        <div className="crm-job__panel">
          <h2 className="crm-job__panel-title">Source & settings</h2>
          <dl className="crm-job__meta">
            <Meta label="Method" value={methodLabels[job.method]} />
            <Meta label="Source tag" value={job.sourceTag} />
            <Meta label="Branch" value={branch} />
            <Meta label="Duplicate policy" value={dupLabel(job.duplicatePolicy)} />
            <Meta label="Sync authority" value="CRM is source of truth" />
            <Meta label="Started by" value={startedBy} />
          </dl>
        </div>

        <div className="crm-job__panel">
          <h2 className="crm-job__panel-title">Rejected rows</h2>
          {hasRejected ? (
            <div className="crm-job__rejected">
              <div className="crm-job__rejected-head">
                <span>Row</span>
                <span>Reason</span>
              </div>
              <div className="crm-job__rejected-row"><span>3</span><span>Mobile too short</span></div>
              <div className="crm-job__rejected-row"><span>7</span><span>Invalid mobile number</span></div>
              {job.counts.rejected > 2 ? (
                <div className="crm-job__rejected-row"><span>18</span><span>Missing name and company</span></div>
              ) : null}
              <div className="crm-job__rejected-foot">
                <Button variant="ghost" size="sm" iconLeft={<Download />}>
                  Download rejected rows
                </Button>
              </div>
            </div>
          ) : (
            <p className="crm-job__ok">No rows were rejected in this import.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: BadgeTone }) {
  return (
    <div className="crm-job__count">
      <span className="crm-job__count-value">{value.toLocaleString('en-IN')}</span>
      <Badge tone={tone}>{label}</Badge>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="crm-job__meta-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function dupLabel(policy: string): string {
  return policy === 'skip' ? 'Skip duplicates' : policy === 'update' ? 'Update existing (fill blanks)' : 'Create anyway';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
