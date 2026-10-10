import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@crm/components';
import { Badge, Button, Drawer, EmptyState, Input, SearchField, Select, Toast } from '@crm/design-system';

/**
 * TPL-S10 — WhatsApp Template Library (live).
 *
 * Browses Meta's own catalogue of pre-written utility/authentication templates
 * via GET /api/crm/templates/library and adds a chosen one to the connected
 * WABA via POST — a template created from the library comes back APPROVED
 * immediately, so there is no review wait. This is the lowest-effort path for
 * an SME and the entries exist in many languages.
 */

interface LibraryButton { type?: string; text?: string; url?: string; phone_number?: string }
interface LibraryEntry {
  id?: string;
  name?: string;
  category?: string;
  language?: string;
  body?: string;
  header?: string;
  footer?: string;
  topic?: string;
  usecase?: string;
  industry?: string[] | string;
  buttons?: LibraryButton[];
  [k: string]: unknown;
}

const languageFilterOptions = [
  { value: '', label: 'All languages' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'hi_IN', label: 'Hindi' },
  { value: 'mr_IN', label: 'Marathi' },
  { value: 'gu_IN', label: 'Gujarati' },
  { value: 'ta_IN', label: 'Tamil' },
  { value: 'te_IN', label: 'Telugu' },
  { value: 'kn_IN', label: 'Kannada' },
  { value: 'bn_IN', label: 'Bengali' },
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 512) || 'template';
}

export default function TemplateLibraryScreen() {
  const [q, setQ] = useState('');
  const [language, setLanguage] = useState('');
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LibraryEntry | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; msg: string } | null>(null);

  // Add-to-WABA form state (in the preview drawer).
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set('search', q.trim());
    if (language) params.set('language', language);
    fetch(`/api/crm/templates/library?${params.toString()}`, { credentials: 'same-origin' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) { setError(d.error ?? 'Could not load the template library.'); setEntries([]); }
        else setEntries(Array.isArray(d.templates) ? d.templates : []);
      })
      .catch(() => { if (!cancelled) setError('Could not load the template library.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q, language]);

  const openPreview = (e: LibraryEntry) => { setPreview(e); setAddName(slugify(e.name ?? '')); };
  const closePreview = () => { setPreview(null); setAdding(false); };

  const addFromLibrary = async () => {
    if (!preview) return;
    setAdding(true);
    try {
      const res = await fetch('/api/crm/templates/library', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          name: slugify(addName || preview.name || ''),
          language: preview.language || 'en_US',
          libraryTemplateName: preview.name,
          category: preview.category,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setToast({ tone: 'error', msg: String(d.error ?? 'Could not add the template.') }); return; }
      setToast({ tone: 'success', msg: `Added "${addName}" — status ${d.status ?? 'APPROVED'}.` });
      closePreview();
    } finally {
      setAdding(false);
    }
  };

  const industryText = (e: LibraryEntry) => Array.isArray(e.industry) ? e.industry.join(', ') : (e.industry ?? '');

  const body = useMemo(() => {
    if (loading) return <p className="crm-tpl-library__muted">Loading Meta's template library…</p>;
    if (error) return <EmptyState title="Can't load the library" description={error} />;
    if (entries.length === 0) return <EmptyState title="No matching templates" description="Try a different search term or language." />;
    return (
      <div className="crm-tpl-library__grid">
        {entries.map((e, i) => (
          <button key={e.id ?? `${e.name}-${i}`} className="crm-tpl-library__card" onClick={() => openPreview(e)}>
            <div className="crm-tpl-library__card-head">
              <Badge tone="info" appearance="outline">{(e.category ?? 'UTILITY').toString().toUpperCase()}</Badge>
              <span className="crm-tpl-library__card-format">{e.language ?? ''}</span>
            </div>
            <p className="crm-tpl-library__card-title">{e.name}</p>
            <p className="crm-tpl-library__card-snippet">{e.body ?? ''}</p>
            <p className="crm-tpl-library__card-meta">{[e.topic, e.usecase, industryText(e)].filter(Boolean).join(' · ')}</p>
          </button>
        ))}
      </div>
    );
  }, [loading, error, entries]);

  return (
    <div className="crm-tpl-library">
      <PageHeader
        title="WhatsApp Template Library"
        description="Meta's pre-written utility & authentication templates. Add one and it's APPROVED instantly — no review wait — and it's available in many languages."
      />

      <div className="crm-tpl-library__toolbar">
        <SearchField label="Search library" placeholder="e.g. order, delivery, payment, OTP…" width="360px" value={q} onChange={(ev) => setQ(ev.target.value)} />
        <Select label="Language" hideLabel options={languageFilterOptions} value={language} onChange={(ev) => setLanguage(ev.target.value)} />
      </div>

      {body}

      <Drawer
        open={Boolean(preview)}
        title={preview?.name ?? ''}
        onClose={closePreview}
        footer={
          preview ? (
            <>
              <Button variant="secondary" onClick={closePreview}>Close</Button>
              <Button variant="primary" onClick={addFromLibrary} disabled={adding || !addName.trim()}>
                {adding ? 'Adding…' : 'Add — instant approval'}
              </Button>
            </>
          ) : undefined
        }
      >
        {preview ? (
          <div className="crm-tpl-library__preview">
            {preview.header ? <p className="crm-tpl-library__preview-header"><strong>{preview.header}</strong></p> : null}
            <p className="crm-tpl-library__preview-body" style={{ whiteSpace: 'pre-wrap' }}>{preview.body}</p>
            {preview.footer ? <p className="crm-tpl-library__preview-footer">{preview.footer}</p> : null}
            {preview.buttons?.length ? (
              <div className="crm-tpl-library__preview-buttons">
                {preview.buttons.map((b, i) => <Badge key={i} tone="neutral" appearance="outline">{b.text ?? b.type}</Badge>)}
              </div>
            ) : null}
            <dl className="crm-tpl-library__preview-meta">
              <div><dt>Category</dt><dd>{(preview.category ?? 'UTILITY').toString().toUpperCase()}</dd></div>
              <div><dt>Language</dt><dd>{preview.language ?? '—'}</dd></div>
              {preview.usecase ? <div><dt>Use case</dt><dd>{preview.usecase}</dd></div> : null}
              {industryText(preview) ? <div><dt>Industry</dt><dd>{industryText(preview)}</dd></div> : null}
            </dl>
            <Input
              label="Template name (your WABA)"
              value={addName}
              onChange={(ev) => setAddName(slugify(ev.target.value))}
              hint="Lowercase letters, numbers and underscores. This is how it appears in your template list."
            />
            {preview.buttons?.some((b) => b.type && ['URL', 'PHONE_NUMBER'].includes(String(b.type).toUpperCase())) ? (
              <p className="crm-tpl-library__muted">This template has a link/call button — if Meta needs a URL or number you’ll be told to finish it in the composer.</p>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      {toast ? <Toast tone={toast.tone} message={toast.msg} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
