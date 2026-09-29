import { useMemo, useState } from 'react';
import { Search, Copy, Send, X, Check, BookOpenCheck } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Select } from '@crm/design-system';
import { STARTER_TEMPLATES, STARTER_CATEGORIES, type StarterTemplate } from '../data/starter-library';
import './ReadyLibraryScreen.css';

/** Marketing department's ready WhatsApp templates, shipped as an editable
 *  starter library. Each can be tweaked and submitted to Meta for approval. */
export default function ReadyLibraryScreen() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [editing, setEditing] = useState<StarterTemplate | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return STARTER_TEMPLATES.filter((t) => {
      if (cat && t.category !== cat) return false;
      if (needle && !`${t.name} ${t.category} ${t.body}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, cat]);

  const byCat = useMemo(() => {
    const m = new Map<string, StarterTemplate[]>();
    for (const t of filtered) { const a = m.get(t.category) ?? []; a.push(t); m.set(t.category, a); }
    return [...m.entries()];
  }, [filtered]);

  return (
    <div className="rl">
      <PageHeader title="Marketing templates" description={`${STARTER_TEMPLATES.length} ready templates — edit and submit for WhatsApp approval.`} />

      <div className="rl-toolbar">
        <div className="rl-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" /></div>
        <Select label="Category" hideLabel size="sm" options={[{ value: '', label: 'All categories' }, ...STARTER_CATEGORIES.map((c) => ({ value: c, label: c }))]} value={cat} onChange={(e) => setCat(e.target.value)} />
      </div>

      {byCat.length === 0 ? <p className="rl-muted">No templates match.</p> : byCat.map(([category, items]) => (
        <section key={category} className="rl-cat">
          <h2 className="rl-cat__title"><BookOpenCheck size={15} /> {category} <span>{items.length}</span></h2>
          <div className="rl-grid">
            {items.map((t, i) => (
              <button key={`${t.suggestedName}-${i}`} className="rl-card" onClick={() => setEditing(t)}>
                <strong className="rl-card__name">{t.name}</strong>
                <span className="rl-card__when">{t.whenToUse}</span>
                <span className="rl-card__body">{t.body}</span>
                <code className="rl-card__slug">{t.suggestedName}</code>
              </button>
            ))}
          </div>
        </section>
      ))}

      {editing ? <EditorModal template={editing} onClose={() => setEditing(null)} onToast={setToast} /> : null}
      {toast ? <div className="rl-toast" role="status" onAnimationEnd={() => setToast(null)}>{toast}</div> : null}
    </div>
  );
}

function EditorModal({ template, onClose, onToast }: { template: StarterTemplate; onClose: () => void; onToast: (s: string) => void }) {
  const [name, setName] = useState(template.suggestedName);
  const [body, setBody] = useState(template.body);
  const [category, setCategory] = useState('marketing');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => { try { await navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const draft = { name: name.trim(), language: 'en', category, components: { headerFormat: 'none', headerText: '', body: body.trim(), footer: '', buttons: [] } };
      const r = await fetch('/api/crm/templates/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ draft }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? 'Could not submit to Meta.'); return; }
      onToast(`Submitted “${name}” for approval (${d.status ?? 'PENDING'}).`);
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <div className="rl-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="rl-box" onClick={(e) => e.stopPropagation()}>
        <button className="rl-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h3 className="rl-modal__title">{template.name}</h3>
        <p className="rl-modal__sub">{template.category} · {template.whenToUse}</p>

        <label className="rl-field"><span>Template name (Meta naming convention)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="rl-field"><span>Category</span>
          <Select label="Category" hideLabel options={[{ value: 'marketing', label: 'Marketing' }, { value: 'utility', label: 'Utility' }]} value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="rl-field"><span>Message body</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
        </label>
        <p className="rl-hint">Approval is done by Meta. Use <code>{'{{1}}'}</code> style placeholders for variables. Keep it within WhatsApp policy.</p>
        {err ? <p className="rl-err">{err}</p> : null}
        <div className="rl-modal__foot">
          <Button variant="ghost" onClick={copy}>{copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy text</>}</Button>
          <Button variant="primary" onClick={submit} disabled={busy || !body.trim() || !name.trim()}><Send size={15} /> {busy ? 'Submitting…' : 'Submit for approval'}</Button>
        </div>
      </div>
    </div>
  );
}
