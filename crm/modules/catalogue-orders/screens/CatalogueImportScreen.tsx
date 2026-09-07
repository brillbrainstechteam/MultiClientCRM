import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Banner, Button, ErrorState, Select, WizardShell, type StepperItem } from '@crm/design-system';
import { findCatalogue, findImportJob, importJobsForCatalogue } from '../data';
import type { ImportRowResult, ImportUpdateMode } from '../domain/types';

const steps: StepperItem[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'map', label: 'Map columns' },
  { id: 'validate', label: 'Validate' },
  { id: 'result', label: 'Result' },
];

const updateModeOptions: { value: ImportUpdateMode; label: string }[] = [
  { value: 'create-only', label: 'Create only — skip anything that already exists' },
  { value: 'update-only', label: 'Update only — skip anything new' },
  { value: 'create-and-update', label: 'Create and update' },
  { value: 'inventory-only', label: 'Inventory only — refresh stock, leave everything else' },
  { value: 'media-url-update', label: 'Media URLs only' },
];

/** ECO-S07–S10 — Catalogue Import wizard, driven by the `step` query param (SKILL.md §6). */
export default function CatalogueImportScreen() {
  const { catalogueId } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const catalogue = catalogueId ? findCatalogue(catalogueId) : undefined;

  const [fileName, setFileName] = useState('');
  const [updateMode, setUpdateMode] = useState<ImportUpdateMode>('create-and-update');
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const step = searchParams.get('step') ?? 'upload';
  const jobId = searchParams.get('jobId');

  const pastJobs = catalogue ? importJobsForCatalogue(catalogue.id) : [];
  const reusedJob = jobId ? findImportJob(jobId) : undefined;

  const detectedColumns = useMemo(() => {
    if (!catalogue) return [];
    const fromMapping = Object.values(catalogue.sourceMapping);
    if (fromMapping.length > 0) return [...fromMapping, 'Notes'];
    return [...catalogue.hierarchySchema.map((l) => l.label), ...catalogue.attributeSchema.slice(0, 3).map((a) => a.name), 'SKU', 'Notes'];
  }, [catalogue]);

  const targetOptions = useMemo(() => {
    if (!catalogue) return [];
    return [
      { value: '', label: '— Ignore this column —' },
      ...catalogue.hierarchySchema.map((l) => ({ value: l.key, label: `Hierarchy: ${l.label}` })),
      ...catalogue.attributeSchema.map((a) => ({ value: a.key, label: `Attribute: ${a.name}` })),
      { value: 'sku', label: 'SKU' },
      { value: 'price', label: 'Price' },
      { value: 'inventoryQty', label: 'Inventory quantity' },
    ];
  }, [catalogue]);

  const reverseMapping = useMemo(() => {
    if (!catalogue) return {};
    const out: Record<string, string> = {};
    for (const [target, source] of Object.entries(catalogue.sourceMapping)) out[source] = target;
    return out;
  }, [catalogue]);

  const effectiveMapping = { ...reverseMapping, ...mapping };

  const outcome = useMemo(() => {
    if (reusedJob) {
      return { fileName: reusedJob.fileName, updateMode: reusedJob.updateMode, totalRows: reusedJob.totalRows, counts: reusedJob.counts, rowResults: reusedJob.rowResults };
    }
    if (!catalogue) return null;
    const created = Math.max(catalogue.itemCount, 1);
    const rowResults: ImportRowResult[] = [
      { row: created + 1, identifier: 'DUP-ROW', status: 'skipped', message: 'Duplicate identifier already seen earlier in this file — kept the first occurrence.' },
      { row: created + 2, identifier: 'BAD-UNIT', status: 'failed', message: `Unrecognised unit in a weight/quantity column — expected one of this catalogue's configured units (${catalogue.unitSchema.join(', ')}).` },
    ];
    for (let i = 1; i <= created; i += 1) {
      rowResults.unshift({ row: i + 1, identifier: `ROW-${i}`, status: updateMode === 'update-only' ? 'updated' : 'created', message: null });
    }
    return {
      fileName: fileName || 'new-items.xlsx',
      updateMode,
      totalRows: created + 2,
      counts: { created: updateMode === 'update-only' ? 0 : created, updated: updateMode === 'update-only' ? created : 0, skipped: 1, failed: 1 },
      rowResults,
    };
  }, [reusedJob, catalogue, fileName, updateMode]);

  if (!catalogue) {
    return (
      <ErrorState
        title="Catalogue not found"
        actions={<Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/catalogues'))}>Back to Catalogues</Button>}
      />
    );
  }

  function goStep(next: string, extra: Record<string, string | null> = {}) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('step', next);
      for (const [k, v] of Object.entries(extra)) {
        if (v === null) p.delete(k);
        else p.set(k, v);
      }
      return p;
    });
  }

  const safeCatalogueId = catalogue.id;
  const cancel = () => navigate(scopedHref(`/catalogue-orders/catalogues/${safeCatalogueId}/explorer`));

  if (catalogue.sourceMode === 'integrated' && step === 'upload') {
    return (
      <div className="crm-eco-import-blocked">
        <Banner
          tone="warning"
          title="Manual import isn't available for this catalogue"
          description={`${catalogue.name} syncs automatically from its connected source. To change items, update the source system and re-sync — use Sync & Audit History to check status.`}
          actions={
            <Button variant="secondary" onClick={() => navigate(scopedHref('/catalogue-orders/sync', { catalogueId: catalogue.id }))}>
              Open Sync &amp; Audit History
            </Button>
          }
        />
        <Button variant="ghost" iconLeft={<ArrowLeft />} onClick={cancel}>Back to catalogue</Button>
      </div>
    );
  }

  return (
    <WizardShell
      title={`Import — ${catalogue.name}`}
      subtitle="Nothing is written to the catalogue until you reach Result."
      steps={steps}
      currentId={step}
      onCancel={cancel}
      footer={renderFooter()}
    >
      {renderStep()}
    </WizardShell>
  );

  function renderStep() {
    if (step === 'map') {
      return (
        <div className="crm-eco-import__step">
          <p className="crm-eco-import__hint">Every detected column maps to hierarchy, an attribute, or is ignored. Hierarchy and attributes stay separate even during import.</p>
          <table className="crm-eco-import__table">
            <thead><tr><th>Source column</th><th>Maps to</th></tr></thead>
            <tbody>
              {detectedColumns.map((column) => (
                <tr key={column}>
                  <td>{column}</td>
                  <td>
                    <Select
                      label={`Mapping for ${column}`}
                      hideLabel
                      options={targetOptions}
                      value={effectiveMapping[column] ?? ''}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [column]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (step === 'validate') {
      return (
        <div className="crm-eco-import__step">
          <div className="crm-eco-import__counts">
            <CountTile label="Total rows" value={outcome?.totalRows ?? 0} tone="neutral" />
            <CountTile label="To create" value={outcome?.counts.created ?? 0} tone="success" />
            <CountTile label="To update" value={outcome?.counts.updated ?? 0} tone="info" />
            <CountTile label="Skipped" value={outcome?.counts.skipped ?? 0} tone="warning" />
            <CountTile label="Failed" value={outcome?.counts.failed ?? 0} tone="danger" />
          </div>
          {(outcome?.counts.failed ?? 0) > 0 ? (
            <Banner tone="warning" title="Some rows need attention" description="Failed rows will not be imported. You can still proceed — fix and re-import failed rows afterwards." />
          ) : (
            <Banner tone="info" title="Ready to import" description="No blocking errors found." />
          )}
          <RowResultsTable rows={outcome?.rowResults.filter((r) => r.status === 'skipped' || r.status === 'failed') ?? []} />
        </div>
      );
    }

    if (step === 'result') {
      return (
        <div className="crm-eco-import__step">
          <Banner
            tone={(outcome?.counts.failed ?? 0) > 0 ? 'warning' : 'info'}
            title={(outcome?.counts.failed ?? 0) > 0 ? 'Partial import complete' : 'Import complete'}
            description={`${outcome?.fileName} — ${outcome?.counts.created ?? 0} created, ${outcome?.counts.updated ?? 0} updated, ${outcome?.counts.skipped ?? 0} skipped, ${outcome?.counts.failed ?? 0} failed.`}
          />
          <RowResultsTable rows={outcome?.rowResults ?? []} />
        </div>
      );
    }

    return (
      <div className="crm-eco-import__step">
        <div className="crm-eco-import__upload-card">
          <FileSpreadsheet size={28} aria-hidden="true" />
          <Select
            label="File to import"
            options={[
              { value: '', label: 'Choose a spreadsheet…' },
              { value: 'items-update.xlsx', label: 'items-update.xlsx (new items + updates)' },
              { value: 'inventory-refresh.xlsx', label: 'inventory-refresh.xlsx (stock only)' },
            ]}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
          <Select label="Update mode" options={updateModeOptions} value={updateMode} onChange={(e) => setUpdateMode(e.target.value as ImportUpdateMode)} />
        </div>

        {pastJobs.length > 0 ? (
          <div className="crm-eco-import__history">
            <h2 className="crm-eco-import__history-title">Previous imports</h2>
            <table className="crm-eco-import__table">
              <thead><tr><th>File</th><th>Mode</th><th>Result</th><th>When</th><th></th></tr></thead>
              <tbody>
                {pastJobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.fileName}</td>
                    <td>{job.updateMode}</td>
                    <td>
                      {job.status === 'partial-success' ? <Badge tone="warning">Partial success</Badge> : <Badge tone="success">Completed</Badge>}
                      {' '}({job.counts.created}c / {job.counts.updated}u / {job.counts.skipped}s / {job.counts.failed}f)
                    </td>
                    <td>{new Date(job.startedAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <Button variant="ghost" size="sm" iconLeft={<RotateCcw />} onClick={() => goStep('result', { jobId: job.id })}>
                        View result
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    );
  }

  function renderFooter() {
    if (step === 'result') {
      return (
        <>
          <Button variant="secondary" iconLeft={<RotateCcw />} onClick={() => goStep('upload', { jobId: null })}>
            Import another file
          </Button>
          <Button variant="primary" onClick={() => navigate(scopedHref(`/catalogue-orders/catalogues/${safeCatalogueId}/explorer`))}>
            Go to catalogue
          </Button>
        </>
      );
    }
    const order = ['upload', 'map', 'validate', 'result'];
    const index = order.indexOf(step);
    return (
      <>
        {index > 0 ? (
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => goStep(order[index - 1])}>Back</Button>
        ) : (
          <Button variant="secondary" onClick={cancel}>Cancel</Button>
        )}
        <Button
          variant="primary"
          iconLeft={step === 'validate' ? <Upload /> : undefined}
          iconRight={step === 'validate' ? undefined : <ArrowRight />}
          disabled={step === 'upload' && !fileName}
          onClick={() => goStep(order[index + 1])}
        >
          {step === 'validate' ? 'Start import' : 'Continue'}
        </Button>
      </>
    );
  }
}

function CountTile({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'success' | 'info' | 'warning' | 'danger' }) {
  return (
    <div className={`crm-eco-import__count-tile crm-eco-import__count-tile--${tone}`}>
      <span className="crm-eco-import__count-value">{value}</span>
      <span className="crm-eco-import__count-label">{label}</span>
    </div>
  );
}

function RowResultsTable({ rows }: { rows: ImportRowResult[] }) {
  if (rows.length === 0) return <p className="crm-eco-import__hint">No rows to show.</p>;
  return (
    <table className="crm-eco-import__table">
      <thead><tr><th>Row</th><th>Identifier</th><th>Status</th><th>Message</th></tr></thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.row}-${row.identifier}`}>
            <td>{row.row}</td>
            <td>{row.identifier}</td>
            <td>
              <Badge tone={row.status === 'failed' ? 'danger' : row.status === 'skipped' ? 'warning' : row.status === 'updated' ? 'info' : 'success'}>
                {row.status}
              </Badge>
            </td>
            <td>{row.message ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
