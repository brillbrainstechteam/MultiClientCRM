import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@crm/design-system';
import { parseCsv, importContacts } from '@crm/app/crm-data';
import { parseVcf } from '../vcf';
import {
  TARGET_FIELDS, guessMapping, mappedRows, setJob, validateRows,
  type ImportJob,
} from './import-job-store';
import './wizard-steps.css';

/**
 * The working steps of the Import Wizard: a real file is read here, mapped to
 * contact fields, validated with the importer's own rules, previewed, and then
 * POSTed to /api/crm/contacts/import. Replaces the fixture screens that showed
 * invented progress and counts.
 */

/* ---- Source ------------------------------------------------------------- */

export function SourcePick({ job }: { job: ImportJob }) {
  const fileRef = useRef<HTMLInputElement>(null);

  // These three already have working homes on the hub; sending people through
  // this wizard instead would be the dead end we are removing.
  if (job.method === 'google' || job.method === 'sheets' || job.method === 'intelligent') {
    const copy = {
      google: ['Google Contacts', 'Google syncing lives on the Imports & Sync page, with the connection and its status.'],
      sheets: ['Google Sheets', 'Sheet syncing lives on the Imports & Sync page, with the connection and its status.'],
      intelligent: ['Intelligent extraction', 'Use "Scan card / photo / PDF" on the Imports & Sync page — it reads the file and lets you review every contact before importing.'],
    }[job.method];
    return (
      <div className="iw">
        <h3 className="iw__title">{copy[0]}</h3>
        <p className="iw__sub">{copy[1]}</p>
        <Link className="iw__link" to="/crm/contacts/imports">Go to Imports &amp; Sync →</Link>
      </div>
    );
  }

  const wantsVcf = job.method === 'vcf' || job.method === 'mobile';
  const accept = wantsVcf ? '.vcf,text/vcard,text/x-vcard' : '.csv,text/csv';

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setJob({ error: '', busy: true });
    try {
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        throw new Error('Excel files cannot be read directly yet — open it in Excel, Save As CSV, and upload that.');
      }
      const text = await file.text();

      if (wantsVcf || /\.vcf$/i.test(file.name)) {
        const cards = parseVcf(text);
        if (!cards.length) throw new Error('No contacts found in that .vcf file.');
        const rows = cards.map((c) => ({
          name: c.name ?? '', mobile: c.mobile ?? '', company: c.company ?? '',
          email: c.email ?? '', city: c.city ?? '',
        }));
        const headers = ['name', 'mobile', 'company', 'email', 'city'];
        setJob({ fileName: file.name, headers, rows, mapping: guessMapping(headers), busy: false });
        return;
      }

      const rows = parseCsv(text);
      if (!rows.length) throw new Error('That CSV has no data rows, or no header row.');
      const headers = Object.keys(rows[0]);
      setJob({ fileName: file.name, headers, rows, mapping: guessMapping(headers), busy: false });
    } catch (e) {
      setJob({
        busy: false, rows: [], headers: [], fileName: '',
        error: e instanceof Error ? e.message : 'Could not read that file.',
      });
    }
  };

  return (
    <div className="iw">
      <h3 className="iw__title">Upload your file</h3>
      <p className="iw__sub">
        {wantsVcf
          ? 'A .vcf (vCard) export from a phone or address book.'
          : 'A CSV with a header row. The template on Imports & Sync has the exact columns.'}
      </p>

      <input ref={fileRef} type="file" accept={accept} hidden onChange={(e) => void onFile(e.target.files?.[0])} />
      <Button variant="primary" iconLeft={<Upload />} disabled={job.busy} onClick={() => fileRef.current?.click()}>
        {job.busy ? 'Reading…' : 'Choose file'}
      </Button>

      {job.error ? <p className="iw__error"><AlertTriangle size={15} /> {job.error}</p> : null}

      {job.rows.length ? (
        <p className="iw__ok">
          <CheckCircle2 size={15} /> <strong>{job.fileName}</strong> — {job.rows.length} row
          {job.rows.length === 1 ? '' : 's'}, {job.headers.length} column{job.headers.length === 1 ? '' : 's'}
        </p>
      ) : null}
    </div>
  );
}

/* ---- Map fields --------------------------------------------------------- */

export function MapFields({ job }: { job: ImportJob }) {
  if (!job.rows.length) return <NeedsFile />;
  const taken = new Set(Object.values(job.mapping).filter(Boolean));

  return (
    <div className="iw">
      <h3 className="iw__title">Map your columns</h3>
      <p className="iw__sub">
        Recognised columns are matched already. Name and Mobile are required — rows missing either are skipped.
      </p>
      <div className="iw__scroll">
        <table className="iw__map">
          <thead>
            <tr><th>Column in your file</th><th>Example value</th><th>Import as</th></tr>
          </thead>
          <tbody>
            {job.headers.map((h) => {
              const sample = job.rows.find((r) => (r[h] ?? '').trim())?.[h] ?? '—';
              return (
                <tr key={h}>
                  <td><strong>{h}</strong></td>
                  <td className="iw__sample">{sample}</td>
                  <td>
                    <select
                      className="iw__select"
                      value={job.mapping[h] ?? ''}
                      onChange={(e) => setJob({ mapping: { ...job.mapping, [h]: e.target.value } })}
                    >
                      <option value="">Do not import</option>
                      {TARGET_FIELDS.map((f) => (
                        <option key={f.value} value={f.value} disabled={taken.has(f.value) && job.mapping[h] !== f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Validate ----------------------------------------------------------- */

export function Validate({ job }: { job: ImportJob }) {
  if (!job.rows.length) return <NeedsFile />;
  const issues = validateRows(mappedRows(job));
  const problems = issues.missingName + issues.missingMobile + issues.duplicateInFile;

  return (
    <div className="iw">
      <h3 className="iw__title">Check before importing</h3>
      <div className="iw__stats">
        <Stat label="Rows in file" value={issues.total} />
        <Stat label="Will import" value={issues.importable} tone="good" />
        <Stat label="Will be skipped" value={problems} tone={problems ? 'warn' : undefined} />
      </div>
      {problems ? (
        <ul className="iw__issues">
          {issues.missingName ? <li>{issues.missingName} row(s) have no <strong>Name</strong></li> : null}
          {issues.missingMobile ? <li>{issues.missingMobile} row(s) have no <strong>Mobile</strong></li> : null}
          {issues.duplicateInFile ? <li>{issues.duplicateInFile} row(s) repeat a mobile from earlier in the file</li> : null}
        </ul>
      ) : (
        <p className="iw__ok"><CheckCircle2 size={15} /> Every row has what it needs.</p>
      )}
      {issues.importable === 0 ? (
        <p className="iw__error"><AlertTriangle size={15} /> Nothing would be imported. Go back and check the mapping.</p>
      ) : null}
    </div>
  );
}

/* ---- Preview ------------------------------------------------------------ */

export function Preview({ job }: { job: ImportJob }) {
  if (!job.rows.length) return <NeedsFile />;
  const rows = mappedRows(job);
  const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const sample = rows.slice(0, 10);

  return (
    <div className="iw">
      <h3 className="iw__title">Preview</h3>
      <p className="iw__sub">First {sample.length} of {rows.length} rows, exactly as they will be imported.</p>
      <div className="iw__scroll">
        <table className="iw__preview">
          <thead><tr>{fields.map((f) => <th key={f}>{f}</th>)}</tr></thead>
          <tbody>
            {sample.map((r, i) => <tr key={i}>{fields.map((f) => <td key={f}>{r[f] ?? ''}</td>)}</tr>)}
          </tbody>
        </table>
      </div>

      <fieldset className="iw__dupes">
        <legend>When a mobile already exists in your CRM</legend>
        <label>
          <input type="radio" name="dupe" checked={job.onDuplicate === 'skip'} onChange={() => setJob({ onDuplicate: 'skip' })} />
          Skip it — leave the existing contact untouched
        </label>
        <label>
          <input type="radio" name="dupe" checked={job.onDuplicate === 'update'} onChange={() => setJob({ onDuplicate: 'update' })} />
          Update it — merge these values into the existing contact
        </label>
      </fieldset>
    </div>
  );
}

/* ---- Processing --------------------------------------------------------- */

export function Processing({ job }: { job: ImportJob }) {
  const started = useRef(false);

  useEffect(() => {
    // Ref guard: React double-invokes effects in development, and importing
    // twice would create duplicate contacts.
    if (started.current || job.result || !job.rows.length) return;
    started.current = true;
    setJob({ busy: true, error: '' });
    importContacts(mappedRows(job), job.onDuplicate)
      .then((result) => setJob({ result, busy: false }))
      .catch((e: Error) => setJob({ busy: false, error: e.message || 'Import failed.' }));
  }, [job]);

  if (!job.rows.length) return <NeedsFile />;

  return (
    <div className="iw">
      <h3 className="iw__title">
        {job.busy ? 'Importing…' : job.error ? 'Import failed' : 'Import complete'}
      </h3>
      {job.busy ? (
        <p className="iw__sub">Writing {validateRows(mappedRows(job)).importable} contact(s). Keep this tab open.</p>
      ) : null}
      {job.error ? <p className="iw__error"><AlertTriangle size={15} /> {job.error}</p> : null}
      {job.result ? <p className="iw__ok"><CheckCircle2 size={15} /> Done — continue to the results.</p> : null}
    </div>
  );
}

/* ---- Results ------------------------------------------------------------ */

export function Results({ job }: { job: ImportJob }) {
  if (!job.result) return <NeedsFile message="This import has not run yet." />;
  const { created, updated, skipped } = job.result;
  return (
    <div className="iw">
      <h3 className="iw__title">Imported{job.fileName ? ` from ${job.fileName}` : ''}</h3>
      <div className="iw__stats">
        <Stat label="Created" value={created} tone="good" />
        <Stat label="Updated" value={updated} tone={updated ? 'good' : undefined} />
        <Stat label="Skipped" value={skipped} tone={skipped ? 'warn' : undefined} />
      </div>
      <p className="iw__sub">
        Rows are skipped when they have no name or mobile, repeat a mobile from the file, or already exist
        {job.onDuplicate === 'skip' ? ' (you chose to skip existing contacts)' : ''}.
      </p>
    </div>
  );
}

/* ---- Shared ------------------------------------------------------------- */

function NeedsFile({ message = 'No file loaded yet.' }: { message?: string }) {
  return (
    <div className="iw">
      <p className="iw__sub">
        <FileSpreadsheet size={15} /> {message} Go back to the Source step and choose a file.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' }) {
  return (
    <div className={`iw__stat${tone ? ` iw__stat--${tone}` : ''}`}>
      <span className="iw__stat-value">{value}</span>
      <span className="iw__stat-label">{label}</span>
    </div>
  );
}
