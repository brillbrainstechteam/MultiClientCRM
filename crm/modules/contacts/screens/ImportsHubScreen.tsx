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
import { Badge, Button, ConfirmDialog, StatusBadge, Toast } from '@crm/design-system';
import { contacts, importJobs, type ImportMethod } from '@crm/mock-data';
import { ImportRow } from '../components';
import { ProspectingPanel } from '../ProspectingPanel';
import { methodLabels } from '../imports/import-flow';
import { downloadTemplate } from '../imports/import-template';
import { parseCsv, importContacts } from '@crm/app/crm-data';
import { parseVcf, buildVcf } from '../vcf';

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
  const scanRef = useRef<HTMLInputElement>(null);
  const vcfRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  // Candidates (from OCR or vCard) awaiting review before import (req 15).
  const [scanned, setScanned] = useState<Array<Record<string, string>> | null>(null);
  const [scanSource, setScanSource] = useState('OCR scan');

  /** vCard (.vcf) import: parse client-side, then review before importing. */
  const onVcfChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rows = parseVcf(await file.text()) as Array<Record<string, string>>;
      if (rows.length === 0) { setResult('No contacts found in that .vcf file.'); return; }
      setScanSource('vCard import');
      setScanned(rows);
    } catch {
      setResult('Could not read that .vcf file.');
    }
  };

  /** Export the tenant's contacts as a downloadable .vcf (vCard) file. */
  const onExportVcf = () => {
    const vcf = buildVcf(
      contacts.map((c) => ({ name: c.name, company: c.company, contactPerson: c.contactPerson, mobile: c.mobile, email: c.email, city: c.city })),
    );
    const blob = new Blob([vcf], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'talktrack-contacts.vcf'; a.click();
    URL.revokeObjectURL(url);
    setResult(`Exported ${contacts.length} contact(s) as vCard.`);
  };

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

  /** OCR scan: card / register photo / PDF → extract → review → import. */
  const onScanChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScanning(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error('read failed'));
        fr.readAsDataURL(file);
      });
      const fileBase64 = dataUrl.split(',')[1] ?? '';
      const res = await fetch('/api/crm/contacts/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ fileBase64, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) { setResult(data.error ?? 'Scan failed.'); return; }
      const found: Array<Record<string, string>> = data.contacts ?? [];
      if (found.length === 0) { setResult('No contacts could be read from that file.'); return; }
      setScanSource('OCR scan');
      setScanned(found);
    } catch {
      setResult('Scan failed. Try a clearer image.');
    } finally {
      setScanning(false);
    }
  };

  const confirmScanImport = async () => {
    if (!scanned) return;
    const rows = scanned;
    setScanned(null);
    setImporting(true);
    try {
      const r = await importContacts(rows.map((c) => ({ ...c, source: scanSource })), 'skip');
      setResult(`Imported ${r.created} new · ${r.updated} updated · ${r.skipped} skipped (${scanSource}).`);
    } catch {
      setResult('Import failed after scan.');
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
      {scanned ? (
        <ConfirmDialog
          open
          title={`Import ${scanned.length} scanned contact${scanned.length !== 1 ? 's' : ''}?`}
          message={`We read ${scanned.length} contact(s): ${scanned.slice(0, 5).map((c) => c.name || c.company || c.mobile || '—').join(', ')}${scanned.length > 5 ? ', …' : ''}. Duplicates (by mobile) are skipped. Import them into Contacts?`}
          confirmLabel="Import"
          tone="default"
          onConfirm={confirmScanImport}
          onCancel={() => setScanned(null)}
        />
      ) : null}
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
            <input ref={scanRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={onScanChosen} />
            <Button variant="secondary" iconLeft={<ScanLine />} disabled={scanning} onClick={() => scanRef.current?.click()}>
              {scanning ? 'Scanning…' : 'Scan card / photo / PDF'}
            </Button>
            <input ref={vcfRef} type="file" accept=".vcf,text/vcard,text/x-vcard" hidden onChange={onVcfChosen} />
            <Button variant="secondary" iconLeft={<FileText />} onClick={() => vcfRef.current?.click()}>
              Import .vcf
            </Button>
            <Button variant="secondary" iconLeft={<Download />} onClick={onExportVcf}>
              Export vCard
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

      <ProspectingPanel />

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
