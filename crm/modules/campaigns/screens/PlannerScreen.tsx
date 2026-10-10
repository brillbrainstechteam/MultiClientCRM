import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Sparkles, CalendarDays, ListFilter } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Select } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import { FESTIVALS_2026 } from '../data/festivals';
import './PlannerScreen.css';

interface PlanEvent { id: string; title: string; type: string; date: string; endDate: string | null; note: string | null; }

const TYPE_META: Record<string, { label: string; cls: string }> = {
  field: { label: 'Field marketing', cls: 'field' },
  telecalling: { label: 'Calling', cls: 'tele' },
  campaign: { label: 'Marketing', cls: 'camp' },
  exhibition: { label: 'Exhibition', cls: 'exh' },
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const prettyDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

/** Marketing planning calendar — field marketing, calling, marketing campaigns and
 *  exhibitions on one month grid or a custom-range agenda, pre-seeded with Indian festivals. */
export default function PlannerScreen() {
  const { role } = useWorkspace();
  const canEdit = ['owner'].includes(role); // owner/admin (admin maps to owner)
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [rangeFrom, setRangeFrom] = useState(ymd(today));
  const [rangeTo, setRangeTo] = useState(ymd(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())));
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [adding, setAdding] = useState<string | null>(null); // date being added to
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    const url = view === 'agenda'
      ? `/api/crm/plan-events?from=${rangeFrom}&to=${rangeTo}`
      : `/api/crm/plan-events?year=${year}`;
    fetch(url, { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => setEvents(d.events ?? [])).catch(() => setEvents([]));
  }, [view, year, rangeFrom, rangeTo]);
  useEffect(() => { load(); }, [load]);

  const typeShown = (t: string) => !hiddenTypes.has(t);
  const toggleType = (t: string) => setHiddenTypes((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  // festivals keyed by date for the viewed year (dataset is 2026; reuse month/day)
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
    for (const e of events) { if (!typeShown(e.type)) continue; const k = e.date.slice(0, 10); const a = m.get(k) ?? []; a.push(e); m.set(k, a); }
    return m;
  }, [events, hiddenTypes]);

  // build the 6-week grid (Mon-start)
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7; // Mon=0
    const start = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [year, month]);

  // agenda rows: events (type-filtered) + festivals within the range, sorted by date
  const agenda = useMemo(() => {
    const rows: { date: string; kind: 'event' | 'festival'; title: string; type?: string; note?: string | null; id?: string }[] = [];
    for (const e of events) { if (typeShown(e.type)) rows.push({ date: e.date.slice(0, 10), kind: 'event', title: e.title, type: e.type, note: e.note, id: e.id }); }
    if (typeShown('festival')) {
      const fromY = new Date(rangeFrom).getFullYear(), toY = new Date(rangeTo).getFullYear();
      for (let y = fromY; y <= toY; y++) {
        for (const f of FESTIVALS_2026) {
          const key = `${y}-${f.date.slice(5)}`;
          if (key >= rangeFrom && key <= rangeTo) rows.push({ date: key, kind: 'festival', title: f.name });
        }
      }
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [events, hiddenTypes, rangeFrom, rangeTo]);

  const step = (delta: number) => {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const remove = async (id: string) => {
    setEvents((es) => es.filter((e) => e.id !== id));
    await fetch(`/api/crm/plan-events?id=${id}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => today.getFullYear() - 1 + i).map((y) => ({ value: String(y), label: String(y) }));

  return (
    <div className="pn">
      <PageHeader title="Planning calendar" description="Plan field marketing, calling, campaigns & exhibitions around the festive calendar — and get reminded before each one." />

      <div className="pn-bar">
        <div className="pn-nav">
          {view === 'month' ? (
            <>
              <button onClick={() => step(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
              <Select label="Month" hideLabel size="sm" options={MONTHS.map((m, i) => ({ value: String(i), label: m }))} value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} />
              <Select label="Year" hideLabel size="sm" options={yearOptions} value={String(year)} onChange={(e) => setYear(Number(e.target.value))} />
              <button onClick={() => step(1)} aria-label="Next month"><ChevronRight size={18} /></button>
              <button className="pn-today" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>Today</button>
            </>
          ) : (
            <div className="pn-range">
              <label>From <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} /></label>
              <label>To <input type="date" value={rangeTo} min={rangeFrom} onChange={(e) => setRangeTo(e.target.value)} /></label>
            </div>
          )}
        </div>

        <div className="pn-viewtoggle" role="tablist" aria-label="Calendar view">
          <button role="tab" aria-selected={view === 'month'} className={view === 'month' ? 'is-active' : ''} onClick={() => setView('month')}><CalendarDays size={14} /> Month</button>
          <button role="tab" aria-selected={view === 'agenda'} className={view === 'agenda' ? 'is-active' : ''} onClick={() => setView('agenda')}><ListFilter size={14} /> Range</button>
        </div>
      </div>

      <div className="pn-legend">
        {Object.entries(TYPE_META).map(([t, meta]) => (
          <button key={meta.cls} className={`pn-leg pn-leg--${meta.cls}${typeShown(t) ? '' : ' pn-leg--off'}`} onClick={() => toggleType(t)} aria-pressed={typeShown(t)}>{meta.label}</button>
        ))}
        <button className={`pn-leg pn-leg--fest${typeShown('festival') ? '' : ' pn-leg--off'}`} onClick={() => toggleType('festival')} aria-pressed={typeShown('festival')}><Sparkles size={11} /> Festival</button>
      </div>

      {view === 'month' ? (
        <div className="pn-grid">
          {DOW.map((d) => <div key={d} className="pn-dow">{d}</div>)}
          {cells.map((d, i) => {
            const key = ymd(d);
            const inMonth = d.getMonth() === month;
            const isToday = key === ymd(today);
            const fests = typeShown('festival') ? (festivalByDate.get(key) ?? []) : [];
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
      ) : (
        <div className="pn-agenda">
          {agenda.length === 0 ? (
            <p className="pn-agenda__empty">No activities or festivals between {prettyDate(rangeFrom)} and {prettyDate(rangeTo)}.</p>
          ) : agenda.map((r, i) => (
            <div key={`${r.kind}-${r.id ?? i}`} className={`pn-agenda__row pn-ev--${r.kind === 'festival' ? 'fest' : (TYPE_META[r.type ?? '']?.cls ?? 'camp')}`}>
              <span className="pn-agenda__date">{prettyDate(r.date)}</span>
              <span className="pn-agenda__badge">{r.kind === 'festival' ? 'Festival' : (TYPE_META[r.type ?? '']?.label ?? r.type)}</span>
              <span className="pn-agenda__title">{r.title}{r.note ? <em> — {r.note}</em> : null}</span>
              {canEdit && r.kind === 'event' && r.id ? <button className="pn-agenda__x" onClick={() => remove(r.id!)} aria-label="Remove"><Trash2 size={13} /></button> : null}
            </div>
          ))}
        </div>
      )}

      {adding ? <AddModal date={adding} onClose={() => setAdding(null)} onDone={(msg) => { setAdding(null); setToast(msg); load(); }} /> : null}
      {toast ? <div className="pn-toast" role="status" onAnimationEnd={() => setToast(null)}>{toast}</div> : null}
    </div>
  );
}

interface Member { id: string; name: string; role?: string; department?: string | null }

function AddModal({ date, onClose, onDone }: { date: string; onClose: () => void; onDone: (msg: string) => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('campaign');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [remindDays, setRemindDays] = useState('');
  const [assignees, setAssignees] = useState<Set<string>>(new Set());
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/team/assignable', { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => setMembers((d.allMembers ?? d.members ?? []) as Member[])).catch(() => setMembers([]));
  }, []);

  const toggleAssignee = (id: string) => setAssignees((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async () => {
    if (!title.trim()) { setErr('Add a title.'); return; }
    setBusy(true); setErr(null);
    try {
      const remindDaysBefore = remindDays.trim() === '' ? undefined : Math.max(0, Number(remindDays));
      const r = await fetch('/api/crm/plan-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ title, type, date, endDate: endDate || undefined, note, remindDaysBefore, assigneeUserIds: [...assignees], notifyWhatsapp }) });
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
          <Select label="Activity" hideLabel options={Object.entries(TYPE_META).map(([value, meta]) => ({ value, label: meta.label }))} value={type} onChange={(e) => setType(e.target.value)} />
        </label>
        <label className="pn-field"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dhanteras push · North zone" /></label>
        <label className="pn-field"><span>End date (optional, for multi-day)</span><input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} /></label>
        <label className="pn-field"><span>Note (optional)</span><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></label>

        <div className="pn-reminder">
          <label className="pn-field pn-field--inline"><span>Remind before</span>
            <span className="pn-remind-input">
              <input type="number" min={0} max={365} value={remindDays} onChange={(e) => setRemindDays(e.target.value)} placeholder="—" /> days ahead
            </span>
          </label>
          <div className="pn-field">
            <span>Assign to {assignees.size ? `(${assignees.size})` : ''}</span>
            <div className="pn-assignees">
              {members.length === 0 ? <p className="pn-assignees__empty">No team members found.</p> : members.map((m) => (
                <label key={m.id} className="pn-assignee">
                  <input type="checkbox" checked={assignees.has(m.id)} onChange={() => toggleAssignee(m.id)} />
                  <span>{m.name}{m.department ? <em> · {m.department}</em> : null}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="pn-assignee pn-assignee--wa">
            <input type="checkbox" checked={notifyWhatsapp} onChange={(e) => setNotifyWhatsapp(e.target.checked)} />
            <span>Also notify on WhatsApp <em>(needs the staff member’s number + an approved reminder template — in-app reminder always goes out)</em></span>
          </label>
          {remindDays.trim() !== '' && assignees.size === 0 ? (
            <p className="pn-reminder__hint">No one assigned — the reminder will go to the whole team’s notifications.</p>
          ) : null}
        </div>

        {err ? <p className="pn-err">{err}</p> : null}
        <div className="pn-modal__foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add to plan'}</Button>
        </div>
      </div>
    </div>
  );
}
