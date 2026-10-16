import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Sparkles, CalendarDays, ListFilter, Bell } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Select } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import { FESTIVALS_2026 } from '../data/festivals';
import { REMINDER_PRESETS, MAX_REMINDERS_PER_EVENT } from '@/lib/crm/reminders';
import './PlannerScreen.css';

interface PlanEvent { id: string; title: string; type: string; date: string; endDate: string | null; note: string | null; remindDaysBefore?: number | null; remindOffsets?: number[]; allDay?: boolean; assigneeUserIds?: string[]; notifyWhatsapp?: boolean; }

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
  const [editing, setEditing] = useState<PlanEvent | null>(null); // event being viewed/edited
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
                  <div key={e.id} className={`pn-ev pn-ev--${TYPE_META[e.type]?.cls ?? 'camp'} pn-ev--clickable`} title={e.note ?? e.title} role="button" tabIndex={0} onClick={() => setEditing(e)} onKeyDown={(k) => { if (k.key === 'Enter') setEditing(e); }}>
                    {hasReminder(e) ? <Bell size={9} aria-label="Has reminder" /> : null}
                    <span>{e.title}</span>
                    {canEdit ? <button className="pn-ev__x" onClick={(ev) => { ev.stopPropagation(); remove(e.id); }} aria-label="Remove"><Trash2 size={10} /></button> : null}
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
          ) : agenda.map((r, i) => {
            const ev = r.kind === 'event' && r.id ? events.find((e) => e.id === r.id) : null;
            return (
              <div
                key={`${r.kind}-${r.id ?? i}`}
                className={`pn-agenda__row pn-ev--${r.kind === 'festival' ? 'fest' : (TYPE_META[r.type ?? '']?.cls ?? 'camp')}${ev ? ' pn-agenda__row--clickable' : ''}`}
                role={ev ? 'button' : undefined} tabIndex={ev ? 0 : undefined}
                onClick={ev ? () => setEditing(ev) : undefined}
                onKeyDown={ev ? (k) => { if (k.key === 'Enter') setEditing(ev); } : undefined}
              >
                <span className="pn-agenda__date">{prettyDate(r.date)}</span>
                <span className="pn-agenda__badge">{r.kind === 'festival' ? 'Festival' : (TYPE_META[r.type ?? '']?.label ?? r.type)}</span>
                <span className="pn-agenda__title">{r.title}{r.note ? <em> — {r.note}</em> : null}{ev && hasReminder(ev) ? <Bell size={11} className="pn-agenda__bell" /> : null}</span>
                {canEdit && r.kind === 'event' && r.id ? <button className="pn-agenda__x" onClick={(e) => { e.stopPropagation(); remove(r.id!); }} aria-label="Remove"><Trash2 size={13} /></button> : null}
              </div>
            );
          })}
        </div>
      )}

      {(adding || editing) ? (
        <PlanModal
          date={adding ?? undefined}
          event={editing ?? undefined}
          canEdit={canEdit}
          onClose={() => { setAdding(null); setEditing(null); }}
          onDone={(msg) => { setAdding(null); setEditing(null); setToast(msg); load(); }}
        />
      ) : null}
      {toast ? <div className="pn-toast" role="status" onAnimationEnd={() => setToast(null)}>{toast}</div> : null}
    </div>
  );
}

interface Member { id: string; name: string; role?: string; department?: string | null }

/** Lead times already on an event, falling back to the superseded single value. */
function initialOffsets(event?: PlanEvent): number[] {
  if (event?.remindOffsets?.length) return event.remindOffsets;
  if (event?.remindDaysBefore != null) return [event.remindDaysBefore * 1440];
  return [];
}

function hasReminder(e: PlanEvent): boolean {
  return (e.remindOffsets?.length ?? 0) > 0 || e.remindDaysBefore != null;
}

/** Add a new plan (when `date` is given) or view/edit/delete an existing one (when `event` is given). */
function PlanModal({ date, event, canEdit, onClose, onDone }: { date?: string; event?: PlanEvent; canEdit: boolean; onClose: () => void; onDone: (msg: string) => void }) {
  const isEdit = Boolean(event);
  const baseDate = event ? event.date.slice(0, 10) : (date ?? '');
  const [title, setTitle] = useState(event?.title ?? '');
  const [type, setType] = useState(event?.type ?? 'campaign');
  const [when, setWhen] = useState(baseDate);
  const [endDate, setEndDate] = useState(event?.endDate ? event.endDate.slice(0, 10) : '');
  const [note, setNote] = useState(event?.note ?? '');
  const [offsets, setOffsets] = useState<Set<number>>(() => new Set(initialOffsets(event)));
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [startTime, setStartTime] = useState(
    event && event.allDay === false ? new Date(event.date).toTimeString().slice(0, 5) : '10:00',
  );
  const [assignees, setAssignees] = useState<Set<string>>(new Set(event?.assigneeUserIds ?? []));
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(Boolean(event?.notifyWhatsapp));
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/team/assignable', { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => setMembers((d.allMembers ?? d.members ?? []) as Member[])).catch(() => setMembers([]));
  }, []);

  const toggleOffset = (m: number) => setOffsets((prev) => {
    const n = new Set(prev);
    if (n.has(m)) n.delete(m);
    else if (n.size < MAX_REMINDERS_PER_EVENT) n.add(m);
    return n;
  });

  const toggleAssignee = (id: string) => setAssignees((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async () => {
    if (!title.trim()) { setErr('Add a title.'); return; }
    if (!when) { setErr('Pick a date.'); return; }
    setBusy(true); setErr(null);
    try {
      // A timed activity sends a real local datetime so "an hour before" has
      // something to be an hour before. An all-day one sends the bare date.
      const dateValue = allDay ? when : `${when}T${startTime}`;
      const payload = {
        title, type, date: dateValue, endDate: endDate || (isEdit ? null : undefined), note,
        allDay, remindOffsets: [...offsets],
        assigneeUserIds: [...assignees], notifyWhatsapp,
      };
      const r = isEdit
        ? await fetch('/api/crm/plan-events', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: event!.id, ...payload }) })
        : await fetch('/api/crm/plan-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(payload) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? 'Could not save.'); return; }
      onDone(isEdit ? `Updated “${title}”.` : `Added “${title}” to the plan.`);
    } finally { setBusy(false); }
  };

  const del = async () => {
    if (!event) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/crm/plan-events?id=${event.id}`, { method: 'DELETE', credentials: 'same-origin' });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.error ?? 'Could not delete.'); return; }
      onDone(`Deleted “${event.title}”.`);
    } finally { setBusy(false); }
  };

  const readOnly = isEdit && !canEdit;

  return (
    <div className="pn-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pn-box" onClick={(e) => e.stopPropagation()}>
        <button className="pn-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h3 className="pn-modal__title">{isEdit ? (readOnly ? 'Activity details' : 'Edit plan') : `Add plan — ${new Date(baseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}</h3>

        <label className="pn-field"><span>Activity</span>
          <Select label="Activity" hideLabel disabled={readOnly} options={Object.entries(TYPE_META).map(([value, meta]) => ({ value, label: meta.label }))} value={type} onChange={(e) => setType(e.target.value)} />
        </label>
        <label className="pn-field"><span>Title</span><input value={title} readOnly={readOnly} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dhanteras push · North zone" /></label>
        <label className="pn-field"><span>Date</span><input type="date" value={when} readOnly={readOnly} onChange={(e) => setWhen(e.target.value)} /></label>
        <label className="pn-assignee pn-assignee--wa">
          <input type="checkbox" checked={!allDay} disabled={readOnly} onChange={(e) => {
            const timed = e.target.checked;
            setAllDay(!timed);
            // Dropping the time would leave minute-level reminders pointing at
            // nothing, so they come off with it rather than silently misfiring.
            if (!timed) setOffsets((prev) => new Set([...prev].filter((m) => m % 1440 === 0)));
          }} />
          <span>This activity has a start time</span>
        </label>
        {!allDay && (
          <label className="pn-field"><span>Starts at</span>
            <input type="time" value={startTime} readOnly={readOnly} onChange={(e) => setStartTime(e.target.value)} />
          </label>
        )}

        <label className="pn-field"><span>End date (optional, for multi-day)</span><input type="date" value={endDate} min={when} readOnly={readOnly} onChange={(e) => setEndDate(e.target.value)} /></label>
        <label className="pn-field"><span>Note (optional)</span><textarea value={note} readOnly={readOnly} onChange={(e) => setNote(e.target.value)} rows={2} /></label>

        <div className="pn-reminder">
          <div className="pn-field">
            <span>Remind me {offsets.size ? `(${offsets.size} of ${MAX_REMINDERS_PER_EVENT})` : ''}</span>
            <div className="pn-remind-grid">
              {REMINDER_PRESETS.map((pre) => {
                const on = offsets.has(pre.minutes);
                // An hours- or minutes-before reminder is meaningless without
                // a start time, so those are offered only once there is one.
                const unavailable = pre.timedOnly && allDay;
                return (
                  <button
                    key={pre.minutes}
                    type="button"
                    className={`pn-remind-chip${on ? ' pn-remind-chip--on' : ''}`}
                    disabled={readOnly || unavailable || (!on && offsets.size >= MAX_REMINDERS_PER_EVENT)}
                    title={unavailable ? 'Give the activity a start time to use this' : undefined}
                    aria-pressed={on}
                    onClick={() => toggleOffset(pre.minutes)}
                  >
                    {pre.label}
                  </button>
                );
              })}
            </div>
            {offsets.size === 0 && <p className="pn-remind-none">No reminder will be sent.</p>}
          </div>
          <div className="pn-field">
            <span>Assign to {assignees.size ? `(${assignees.size})` : ''}</span>
            <div className="pn-assignees">
              {members.length === 0 ? <p className="pn-assignees__empty">No team members found.</p> : members.map((m) => (
                <label key={m.id} className="pn-assignee">
                  <input type="checkbox" checked={assignees.has(m.id)} disabled={readOnly} onChange={() => toggleAssignee(m.id)} />
                  <span>{m.name}{m.department ? <em> · {m.department}</em> : null}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="pn-assignee pn-assignee--wa">
            <input type="checkbox" checked={notifyWhatsapp} disabled={readOnly} onChange={(e) => setNotifyWhatsapp(e.target.checked)} />
            <span>Also notify on WhatsApp <em>(needs the staff member’s number + an approved reminder template — in-app reminder always goes out)</em></span>
          </label>
          {offsets.size > 0 && assignees.size === 0 ? (
            <p className="pn-reminder__hint">No one assigned — the reminder will go to the whole team’s notifications.</p>
          ) : null}
        </div>

        {err ? <p className="pn-err">{err}</p> : null}
        {!readOnly ? (
          <div className="pn-modal__foot">
            {isEdit && canEdit ? <Button variant="ghost" iconLeft={<Trash2 size={15} />} onClick={del} disabled={busy}>Delete</Button> : null}
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add to plan'}</Button>
          </div>
        ) : (
          <div className="pn-modal__foot"><Button variant="primary" onClick={onClose}>Close</Button></div>
        )}
      </div>
    </div>
  );
}
