import { FileSpreadsheet, ScanLine, Sheet, Smartphone, Contact as ContactIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import type { ImportJob, ImportJobStatus, ImportMethod } from '@crm/mock-data';

const methodIcon: Record<ImportMethod, LucideIcon> = {
  csv: FileSpreadsheet,
  sheets: Sheet,
  intelligent: ScanLine,
  google: ContactIcon,
  mobile: Smartphone,
  vcf: ContactIcon,
};

const methodLabel: Record<ImportMethod, string> = {
  csv: 'CSV / Excel',
  sheets: 'Google Sheets',
  intelligent: 'Intelligent extraction',
  google: 'Google Contacts',
  mobile: 'Mobile contacts',
  vcf: 'VCF file',
};

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

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

/** One import-history row for the Imports & Sync hub (CON-S07 → CON-S08). */
export function ImportRow({ job }: { job: ImportJob }) {
  const Icon = methodIcon[job.method];
  const startedBy = findUser(job.startedByUserId)?.name ?? job.startedByUserId;

  return (
    <Link to={`/contacts/imports/jobs/${job.id}`} className="crm-import-row">
      <span className="crm-import-row__icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="crm-import-row__primary">
        <span className="crm-import-row__title">{job.fileName ?? methodLabel[job.method]}</span>
        <span className="crm-import-row__meta">
          {methodLabel[job.method]} · {job.sourceTag} · {startedBy} · {formatWhen(job.createdAt)}
        </span>
      </span>
      <span className="crm-import-row__counts">
        <span className="crm-import-row__count crm-import-row__count--added">+{job.counts.added}</span>
        <span className="crm-import-row__count">{job.counts.updated} upd</span>
        <span className="crm-import-row__count">{job.counts.skipped} skip</span>
        <span className="crm-import-row__count crm-import-row__count--rejected">
          {job.counts.rejected} rej
        </span>
        {job.zoneExceptions ? (
          <Badge tone="warning">{job.zoneExceptions} to route</Badge>
        ) : null}
      </span>
      <Badge tone={statusTone[job.status]}>{statusLabel[job.status]}</Badge>
    </Link>
  );
}
