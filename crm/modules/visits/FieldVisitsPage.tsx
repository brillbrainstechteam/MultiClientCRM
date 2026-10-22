import { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus, CalendarClock, AlertTriangle, IndianRupee, Weight } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Badge, Button, Input, Modal, Select, Textarea, type BadgeTone } from '@crm/design-system';
import './FieldVisitsPage.css';

/**
 * Field visits (PRD §15, §21.5).
 *
 * A visit used to be a follow-up date on the contact plus a disposition
 * afterwards, so the business could never answer "how many visits did we plan
 * and not make?". A planned visit is now a record from the moment it is
 * scheduled, and the report below is the one §21.5 asks for.
 */

interface Visit {
  id: string;
  contactId: string;
  contactName: string;
  company: string | null;
  city: string | null;
  assigneeName: string | null;
  status: string;
  effectiveStatus: string;
  plannedAt: string;
  visitedAt: string | null;
  purpose: string | null;
  itemsPresented: string | null;
  expenseAmount: number | null;
  outcome: string | null;
  expectedGrams: number | null;
  actualGrams: number | null;
  discussion: string | null;
}

interface Report {
  planned: number; visited: number; pending: number; missed: number; cancelled: number;
  totalExpense: number; interested: number; converted: number;
  volumeGrams: number; expectedGrams: number; completionPercent: number;
}

const OUTCOMES = [
  { value: '', label: 'Not recorded' },
  { value: 'interested', label: 'Interested' },
  { value: 'converted', label: 'Converted — bought' },
  { value: 'follow_up', label: 'Needs a follow-up' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'no_meeting', label: 'Could not meet' },
];

const STATUS_TONE: Record<string, BadgeTone> = {
  planned: 'info', visited: 'success', missed: 'danger', cancelled: 'neutral',
};

const OUTCOME_TONE: Record<string, BadgeTone> = {
  interested: 'info', converted: 'success', follow_up: 'warning',
  not_interested: 'neutral', no_meeting: 'neutral',
};

const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const grams = (n: number) => (n >= 1000
  ? `${(n / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`
  : `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} g`);

export default function FieldVisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [logging, setLogging] = useState<Visit | null>(null);
  const [planning, setPlanning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/visits', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { visits?: Visit[]; report?: Report; error?: string }) => {
        if (d.error) setError(d.error);
        else { setVisits(d.visits ?? []); setReport(d.report ?? null); setError(null); }
      })
      .catch(() => setError('Could not load visits.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = filter === 'all' ? visits : visits.filter((v) => v.effectiveStatus === filter);

  return (
    <div className="fv">
      <PageHeader
        title="Field visits"
        description="Planned and completed customer visits, what they cost and what they brought in."
        actions={<Button variant="primary" iconLeft={<Plus />} onClick={() => setPlanning(true)}>Plan a visit</Button>}
      />

      {error && <p className="fv__error">{error}</p>}
      {loading && <p className="fv__muted">Loading…</p>}

      {report && !loading && (
        <section className="fv__summary">
          <Stat label="Planned" value={String(report.planned)} />
          <Stat label="Visited" value={String(report.visited)} accent />
          {/* Pending and missed are deliberately separate: a backlog that
              reads as "upcoming" is a backlog nobody chases. */}
          <Stat label="Still to go" value={String(report.pending)} />
          <Stat label="Missed" value={String(report.missed)} warn={report.missed > 0} />
          <Stat label="Spend" value={money(report.totalExpense)} />
          <Stat label="Volume bought" value={grams(report.volumeGrams)} accent />
        </section>
      )}

      {report && !loading && report.planned > 0 && (
        <p className="fv__line">
          {report.completionPercent}% of planned visits were made ·{' '}
          {report.interested} customer{report.interested === 1 ? '' : 's'} interested ·{' '}
          {report.converted} converted
          {report.expectedGrams > 0 && ` · ${grams(report.expectedGrams)} expected against ${grams(report.volumeGrams)} actual`}
        </p>
      )}

      {!loading && (
        <div className="fv__filters">
          {['all', 'planned', 'missed', 'visited', 'cancelled'].map((f) => (
            <button
              key={f}
              className={`fv__chip${filter === f ? ' fv__chip--on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'planned' ? 'Still to go' : f[0].toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="fv__chipnum">{visits.filter((v) => v.effectiveStatus === f).length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {!loading && shown.length === 0 && (
        <div className="fv__empty">
          <MapPin size={40} aria-hidden="true" />
          <h2>{visits.length === 0 ? 'No visits planned' : 'Nothing here'}</h2>
          <p>
            {visits.length === 0
              ? 'Plan a visit and it will show here from the moment it is scheduled, so the ones that never happen are visible too.'
              : 'No visits match this filter.'}
          </p>
        </div>
      )}

      {shown.length > 0 && (
        <ul className="fv__list">
          {shown.map((v) => (
            <li key={v.id} className="fv__card">
              <div className="fv__head">
                <strong>{v.contactName}</strong>
                {v.company && <span className="fv__co">{v.company}</span>}
                <Badge tone={STATUS_TONE[v.effectiveStatus] ?? 'neutral'}>
                  {v.effectiveStatus === 'planned' ? 'Planned' : v.effectiveStatus === 'missed' ? 'Missed' : v.effectiveStatus === 'visited' ? 'Visited' : 'Cancelled'}
                </Badge>
                {v.outcome && (
                  <Badge tone={OUTCOME_TONE[v.outcome] ?? 'neutral'}>
                    {OUTCOMES.find((o) => o.value === v.outcome)?.label ?? v.outcome}
                  </Badge>
                )}
              </div>

              <div className="fv__meta">
                <span><CalendarClock size={13} />
                  {new Date(v.plannedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {v.city && <span><MapPin size={13} />{v.city}</span>}
                {v.assigneeName && <span>{v.assigneeName}</span>}
                {v.expenseAmount != null && v.expenseAmount > 0 && (
                  <span><IndianRupee size={13} />{money(v.expenseAmount)}</span>
                )}
                {v.actualGrams != null && v.actualGrams > 0 && (
                  <span className="fv__grams"><Weight size={13} />{grams(v.actualGrams)}</span>
                )}
              </div>

              {v.purpose && <p className="fv__purpose">{v.purpose}</p>}
              {v.discussion && <p className="fv__discussion">{v.discussion}</p>}

              {v.effectiveStatus !== 'cancelled' && (
                <div className="fv__actions">
                  <Button variant="secondary" size="sm" onClick={() => setLogging(v)}>
                    {v.effectiveStatus === 'visited' ? 'Edit' : 'Log the visit'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {planning && <PlanVisit onClose={() => setPlanning(false)} onSaved={() => { setPlanning(false); load(); }} />}
      {logging && <LogVisit visit={logging} onClose={() => setLogging(null)} onSaved={() => { setLogging(null); load(); }} />}
    </div>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`fv__stat${warn ? ' fv__stat--warn' : ''}`}>
      <span className="fv__statlabel">{label}</span>
      <strong className={accent ? 'fv__accent' : undefined}>
        {warn && <AlertTriangle size={14} aria-hidden="true" />}
        {value}
      </strong>
    </div>
  );
}

interface ContactLite { id: string; name: string; company?: string | null }

function PlanVisit({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ContactLite[]>([]);
  const [contactId, setContactId] = useState('');
  const [contactName, setContactName] = useState('');
  const [plannedAt, setPlannedAt] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedGrams, setExpected] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/crm/contacts?q=${encodeURIComponent(q)}&limit=8`, { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((d) => setResults(((d.contacts ?? d.items ?? []) as ContactLite[]).slice(0, 8)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const save = async () => {
    if (!contactId) { setErr('Choose a customer.'); return; }
    if (!plannedAt) { setErr('Pick a date.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/crm/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ contactId, plannedAt, purpose, expectedGrams: Number(expectedGrams) || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr((d as { error?: string }).error ?? 'Could not save.'); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Plan a visit"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Plan visit'}
          </Button>
        </>
      }>
      <div className="fv__form">
        {contactId ? (
          <div className="fv__chosen">
            <span>{contactName}</span>
            <button onClick={() => { setContactId(''); setContactName(''); setQ(''); }}>Change</button>
          </div>
        ) : (
          <>
            <Input label="Customer" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or company" hint="Start typing to find the customer." />
            {results.length > 0 && (
              <ul className="fv__results">
                {results.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => { setContactId(c.id); setContactName(c.name); }}>
                      {c.name}{c.company ? <em> · {c.company}</em> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <Input label="Visit date" type="date" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
        <Input label="Purpose (optional)" value={purpose} onChange={(e) => setPurpose(e.target.value)}
          placeholder="Show the new bangle collection" />
        <Input label="Expected volume (grams, optional)" type="number" value={expectedGrams}
          onChange={(e) => setExpected(e.target.value)}
          hint="Kept beside the actual afterwards, so forecasting habits are visible." />
        {err && <p className="fv__error">{err}</p>}
      </div>
    </Modal>
  );
}

function LogVisit({ visit, onClose, onSaved }: { visit: Visit; onClose: () => void; onSaved: () => void }) {
  const [outcome, setOutcome] = useState(visit.outcome ?? '');
  const [discussion, setDiscussion] = useState(visit.discussion ?? '');
  const [itemsPresented, setItems] = useState(visit.itemsPresented ?? '');
  const [expense, setExpense] = useState(visit.expenseAmount != null ? String(visit.expenseAmount) : '');
  const [actualGrams, setActual] = useState(visit.actualGrams != null ? String(visit.actualGrams) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async (cancel = false) => {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/crm/visits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(cancel ? { id: visit.id, status: 'cancelled' } : {
          id: visit.id, status: 'visited',
          outcome: outcome || undefined,
          discussion, itemsPresented,
          expenseAmount: expense === '' ? null : Number(expense),
          actualGrams: actualGrams === '' ? null : Number(actualGrams),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr((d as { error?: string }).error ?? 'Could not save.'); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`${visit.contactName} — visit`}
      footer={
        <>
          <Button variant="ghost" onClick={() => void save(true)} disabled={busy}>Cancel visit</Button>
          <Button variant="primary" onClick={() => void save(false)} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </>
      }>
      <div className="fv__form">
        <Select label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} options={OUTCOMES} />
        <Textarea label="What was discussed" value={discussion} onChange={(e) => setDiscussion(e.target.value)} rows={3}
          placeholder="Wants 22K bangles for the wedding season; asked for pricing on 200g" />
        <Textarea label="What you showed" value={itemsPresented} onChange={(e) => setItems(e.target.value)} rows={2}
          placeholder="Bridal catalogue, new coin range" />
        <Input label="Spend (₹)" type="number" value={expense} onChange={(e) => setExpense(e.target.value)}
          hint="Travel, samples, hospitality — one number for the visit." />
        <Input label="Volume bought (grams)" type="number" value={actualGrams} onChange={(e) => setActual(e.target.value)}
          hint={visit.expectedGrams ? `You expected ${grams(visit.expectedGrams)}.` : undefined} />
        {err && <p className="fv__error">{err}</p>}
      </div>
    </Modal>
  );
}
