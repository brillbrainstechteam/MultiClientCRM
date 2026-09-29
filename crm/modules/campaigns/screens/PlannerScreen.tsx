import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Sparkles } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Select } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import { FESTIVALS_2026 } from '../data/festivals';
import './PlannerScreen.css';

interface PlanEvent { id: string; title: string; type: string; date: string; endDate: string | null; note: string | null; }

const TYPE_META: Record<string, { label: string; cls: string }> = {
  field: { label: 'Field marketing', cls: 'field' },
  telecalling: { label: 'Telecalling', cls: 'tele' },
  campaign: { label: 'Campaign', cls: 'camp' },
  exhibition: { label: 'Exhibition', cls: 'exh' },
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Marketing planning calendar — field marketing, telecalling, campaigns and
 *  exhibitions on one month grid, pre-seeded with Indian festival occasions. */
export default function PlannerScreen() {
  const { role } = useWorkspace();
  const canEdit = ['owner'].includes(role); // owner/admin (admin maps to owner)
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [adding, setAdding] = useState<string | null>(null); // date being added to
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/crm/plan-events?year=${year}`, { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => setEvents(d.events ?? [])).catch(() => setEvents([]));
  }, [year]);
  useEffect(() => { load(); }, [load]);

  // festivals for the viewed year (dataset is 2026; reuse its month/day for others)
  const festivalByDate = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const f of FESTIVALS_2026) {
      const key = `${year}-${f.date.slice(5)}`;
      const a = m.get(key) ?? []; a.push(f.name); m.set(key, a);
    }
    return m;
  }, [year]);
  const eventsByDate = useMemo(() => {
    const m = new Map<string, PlanEvent[]>();
    for (const e of events) { const k = e.date.slice(0, 10); const a = m.get(k) ?? []; a.push(e); m.set(k, a); }
    return m;
  }, [events]);

  // build the 6-week grid (Mon-start)
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Mon=0
    const start = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [year, month]);

  const step = (delta: number) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const remove = async (id: string) => {
    setEvents((es) => es.filter((e) => e.id !== id));
    await fetch(`/api/crm/plan-events?id=${id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
  };

  return (
    <div className="pn">
      <PageHeader title="Planning calendar" description="Plan field marketing, telecalling, campaigns & exhibitions around the festive calendar." />

      <div className="pn-bar">
        <div className="pn-nav">
          <button onClick={() => step(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <strong>{MONTHS[month]} {year}</strong>
          <button onClick={() => step(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          <button className="pn-today" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Today</button>
        </div>
        <div className="pn-legend">
          {Object.values(TYPE_META).map((t) => <span key={t.cls} className={`pn-leg pn-leg--${t.cls}`}>{t.label}</span>)}
          <span className="pn-leg pn-leg--fest"><Sparkles size={11} /> Festival</span>
        </div>
      </div>

      <div className="pn-grid">
        {DOW.map((d) => <div key={d} className="pn-dow">{d}</div>)}
        {cells.map((d, i) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === month;
          const isToday = key === ymd(today);
          const fests = festivalByDate.get(key) ?? [];
          const evs = eventsByDate.get(key) ?? [];
          return (
            <div key={i} className={`pn-cell${inMonth ? '' : ' pn-cell--out'}${isToday ? ' pn-cell--today' : ''}`}>
              <div className="pn-cell__head">
                <span className="pn-date">{d.getDate()}</span>
                {canEdit && inMonth ? <button className="pn-add" onClick={() => setAdding(key)} aria-label="Add plan"><Plus size={13} /></button> : null}
              </div>
              {fests.map((f, j) => <div key={`f${j}`} className="pn-ev pn-ev--fest" title={f}><Sparkles size={10} /> {f}</div>)}
              {evs.map((e) => (
                <div key={e.id} className={`pn-ev pn-ev--${TYPE_META[e.type]?.cls ?? 'camp'}`} title={e.note ?? e.title}>
                  <span>{e.title}</span>
                  {canEdit ? <button className="pn-ev__x" onClick={() => remove(e.id)} aria-label="Remove"><Trash2 size={10} /></button> : null}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {adding ? <AddModal date={adding} onClose={() => setAdding(null)} onDone={(msg) => { setAdding(null); setToast(msg); load(); }} /> : null}
      {toast ? <div className="pn-toast" role="status" onAnimationEnd={() => setToast(null)}>{toast}</div> : null}
    </div>
  );
}

function AddModal({ date, onClose, onDone }: { date: string; onClose: () => void; onDone: (msg: string) => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('campaign');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) { setErr('Add a title.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/crm/plan-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ title, type, date, endDate: endDate || undefined, note }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? 'Could not add.'); return; }
      onDone(`Added “${title}” to the plan.`);
    } finally { setBusy(false); }
  };

  return (
    <div className="pn-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pn-box" onClick={(e) => e.stopPropagation()}>
        <button className="pn-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h3 className="pn-modal__title">Add plan — {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</h3>
        <label className="pn-field"><span>Activity</span>
          <Select label="Activity" hideLabel options={[{ value: 'field', label: 'Field marketing' }, { value: 'telecalling', label: 'Telecalling' }, { value: 'campaign', label: 'Campaign' }, { value: 'exhibition', label: 'Exhibition' }]} value={type} onChange={(e) => setType(e.target.value)} />
        </label>
        <label className="pn-field"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dhanteras push · North zone" /></label>
        <label className="pn-field"><span>End date (optional, for multi-day)</span><input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} /></label>
        <label className="pn-field"><span>Note (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></label>
        {err ? <p className="pn-err">{err}</p> : null}
        <div className="pn-modal__foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add to plan'}</Button>
        </div>
      </div>
    </div>
  );
}
