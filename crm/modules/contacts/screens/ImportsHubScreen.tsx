import {
  Contact as ContactIcon,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  ScanLine,
  Sheet,
  Smartphone,
  Upload,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button, StatusBadge, Toast } from '@crm/design-system';
import { importJobs, type ImportMethod } from '@crm/mock-data';
import { ImportRow } from '../components';
import { methodLabels } from '../imports/import-flow';
import { downloadTemplate } from '../imports/import-template';
import { parseCsv, importContacts } from '@crm/app/crm-data';

/**
 * CON-S07 — Imports & Sync Hub. Import methods, connected-source status, import
 * history (each row → CON-S08) and a sample template download.
 */
export default function ImportsHubScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const googleConnected = searchParams.get('googleAuth') === 'connected';

  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  /** Real CSV upload: parse client-side and import via the API. */
  const onCsvChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length === 0) { setResult('No valid rows found in that file.'); return; }
      const r = await importContacts(rows, 'skip');
      setResult(`Imported ${r.created} new · ${r.updated} updated · ${r.skipped} skipped.`);
    } catch {
      setResult('Import failed. Check the file and try again.');
    } finally {
      setImporting(false);
    }
  };

  const startImport = (method?: ImportMethod) =>
    navigate(scopedHref('/contacts/imports/new/method', method ? { method } : undefined));

  const methods: { id: ImportMethod; icon: ReactNode; blurb: string }[] = [
    { id: 'csv', icon: <FileSpreadsheet />, blurb: 'Upload a CSV or Excel export.' },
    { id: 'sheets', icon: <Sheet />, blurb: 'Template or existing Google Sheet.' },
    { id: 'intelligent', icon: <ScanLine />, blurb: 'Extract from images, PDFs or cards.' },
    { id: 'google', icon: <ContactIcon />, blurb: 'Sync from Google Contacts.' },
    { id: 'mobile', icon: <Smartphone />, blurb: 'Export from a phone.' },
    { id: 'vcf', icon: <FileText />, blurb: 'Upload a .vcf file.' },
  ];

  return (
    <div className="crm-hub">
      {result ? <Toast tone="success" message={result} onDismiss={() => setResult(null)} /> : null}
      <PageHeader
        title="Imports & Sync"
        description="Bring contacts in from files, images or connected sources — and track every import."
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft={<Download />}
              title="Download the contact import template (CSV)"
              onClick={() => downloadTemplate('csv')}
            >
              Download Import Template
            </Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onCsvChosen} />
            <Button variant="primary" iconLeft={<Upload />} disabled={importing} onClick={() => fileRef.current?.click()}>
              {importing ? 'Importing…' : 'Upload CSV'}
            </Button>
            <Button variant="secondary" iconLeft={<Plus />} onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('drawer', 'contact'); n.set('mode', 'add'); return n; })}>
              Add manually
            </Button>
            <Button variant="primary" iconLeft={<Upload />} onClick={() => startImport()}>
              Start import
            </Button>
          </>
        }
      />

      <section className="crm-hub__section">
        <h2 className="crm-hub__title">Import methods</h2>
        <div className="crm-hub__methods">
          {methods.map((m) => (
            <button key={m.id} className="crm-hub__method" onClick={() => startImport(m.id)}>
              <span className="crm-hub__method-icon" aria-hidden="true">{m.icon}</span>
              <span className="crm-hub__method-name">{methodLabels[m.id]}</span>
              <span className="crm-hub__method-blurb">{m.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="crm-hub__section">
        <h2 className="crm-hub__title">Connected sources</h2>
        <div className="crm-hub__source">
          <div className="crm-hub__source-left">
            <ContactIcon aria-hidden="true" />
            <div>
              <p className="crm-hub__source-name">Google Contacts</p>
              <p className="crm-hub__source-meta">Read-only · CRM is source of truth</p>
            </div>
          </div>
          {googleConnected ? (
            <StatusBadge tone="success">Connected</StatusBadge>
          ) : (
            <div className="crm-hub__source-actions">
              <StatusBadge tone="danger">Disconnected</StatusBadge>
              <Button variant="secondary" size="sm" onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('modal', 'google-contacts'); return n; })}>
                Connect
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="crm-hub__section">
        <div className="crm-hub__history-head">
          <h2 className="crm-hub__title">Import history</h2>
          <Badge tone="neutral">{importJobs.length} jobs</Badge>
        </div>
        <div className="crm-hub__history">
          {importJobs.map((job) => (
            <ImportRow key={job.id} job={job} />
          ))}
        </div>
      </section>
    </div>
  );
}
