import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, CalendarClock, ChevronRight, X } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Badge } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import './CallPlanReal.css';

interface PlanContact {
  id: string; name: string; company: string | null; mobile: string;
  nextFollowUpAt: string | null; leadStatus: string; interestedIn: string | null;
  ownerId: string; ownerName: string | null; businessSegment: string | null; grade: string | null; preferredLanguage: string | null;
}
interface AssigneeRow { ownerId: string; ownerName: string | null; overdue: number; today: number; upcoming: number; total: number; }
interface PlanData { scope: string; overdue: PlanContact[]; today: PlanContact[]; upcoming: PlanContact[]; counts: { overdue: number; today: number; upcoming: number }; assignees: AssigneeRow[]; }

const OUTCOMES = [
  { key: 'follow_up', label: 'Follow-up in progress', tone: 'info' as const },
  { key: 'not_interested', label: 'Not interested', tone: 'danger' as const },
  { key: 'enquiry_received', label: 'Enquiry received', tone: 'success' as const },
];
const SEGMENT: Record<string, string> = { chain_stores: 'Chain', corporate: 'Corporate', boutique: 'Boutique', exports: 'Exports', standalone: 'Standalone', small_store: 'Small store' };

/** Datewise call plan (Phase 4) + call-outcome logging with sales handover (Phase 5). */
export default function CallPlanReal() {
  const { role } = useWorkspace();
  const navigate = useNavigate();
  const isAdmin = role === 'owner';
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [logging, setLogging] = useState<PlanContact | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = assignee ? `?assignee=${encodeURIComponent(assignee)}` : '';
    fetch(`/api/crm/followups${qs}`, { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => { setData(d.error ? null : d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [assignee]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="cp">
      <PageHeader title="Call plan" actions={<Button variant="ghost" onClick={() => navigate('/calling/history')}>Call history <ChevronRight size={15} /></Button>} />

      {/* Admin: per-assignee overview */}
      {isAdmin && data && data.assignees.length > 0 ? (
        <div className="cp-assignees">
          <button className={`cp-assignee${assignee === null ? ' cp-assignee--on' : ''}`} onClick={() => setAssignee(null)}>
            <strong>Everyone</strong><span>{data.counts.overdue + data.counts.today + data.counts.upcoming} to call</span>
          </button>
          {data.assignees.map((a) => (
            <button key={a.ownerId} className={`cp-assignee${assignee === a.ownerId ? ' cp-assignee--on' : ''}`} onClick={() => setAssignee(a.ownerId)}>
              <strong>{a.ownerName ?? 'Unassigned'}</strong>
              <span>{a.overdue > 0 ? `${a.overdue} overdue · ` : ''}{a.today} today · {a.upcoming} upcoming</span>
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <p className="cp-muted">Loading your call plan…</p> : !data ? <p className="cp-muted">Couldn’t load the plan.</p> : (
        <>
          <Bucket title="Overdue" tone="danger" items={data.overdue} showOwner={isAdmin && !assignee} onLog={setLogging} navigate={navigate} />
          <Bucket title="Today" tone="info" items={data.today} showOwner={isAdmin && !assignee} onLog={setLogging} navigate={navigate} />
          <Bucket title="Upcoming" tone="neutral" items={data.upcoming} showOwner={isAdmin && !assignee} onLog={setLogging} navigate={navigate} />
          {data.overdue.length + data.today.length + data.upcoming.length === 0 ? (
            <div className="cp-empty"><CalendarClock size={26} /><strong>No calls scheduled</strong><p>Assign contacts and set a follow-up date to build the plan.</p></div>
          ) : null}
        </>
      )}

      {logging ? <OutcomeModal contact={logging} onClose={() => setLogging(null)} onDone={() => { setLogging(null); load(); }} /> : null}
    </div>
  );
}

function Bucket({ title, tone, items, showOwner, onLog, navigate }: { title: string; tone: 'danger' | 'info' | 'neutral'; items: PlanContact[]; showOwner: boolean; onLog: (c: PlanContact) => void; navigate: (to: string) => void }) {
  if (items.length === 0) return null;
  return (
    <section className="cp-bucket">
      <div className="cp-bucket__head"><h2>{title}</h2><Badge tone={tone === 'neutral' ? 'neutral' : tone}>{items.length}</Badge></div>
      <div className="cp-list">
        {items.map((c) => (
          <div key={c.id} className="cp-row">
            <button className="cp-row__main" onClick={() => navigate(`/contacts/customer/${c.id}`)}>
              <span className="cp-ava">{(c.company ?? c.name).slice(0, 2).toUpperCase()}</span>
              <div className="cp-row__id">
                <strong>{c.company ?? c.name}</strong>
                <span>{c.mobile}{c.interestedIn ? ` · ${c.interestedIn}` : ''}</span>
              </div>
              <div className="cp-row__meta">
                {c.grade ? <span className="cp-chip">Grade {c.grade}</span> : null}
                {c.businessSegment ? <span className="cp-chip">{SEGMENT[c.businessSegment] ?? c.businessSegment}</span> : null}
                {c.preferredLanguage ? <span className="cp-chip">{c.preferredLanguage}</span> : null}
                {showOwner && c.ownerName ? <span className="cp-chip cp-chip--owner">{c.ownerName}</span> : null}
                {c.nextFollowUpAt ? <span className="cp-date">{new Date(c.nextFollowUpAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span> : null}
              </div>
            </button>
            <a className="cp-call" href={`tel:+${c.mobile.replace(/\D/g, '')}`} title="Call"><Phone size={15} /></a>
            <button className="cp-log" onClick={() => onLog(c)}>Log call</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function OutcomeModal({ contact, onClose, onDone }: { contact: PlanContact; onClose: () => void; onDone: () => void }) {
  const [outcome, setOutcome] = useState<string>('follow_up');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [product, setProduct] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = { contactId: contact.id, outcome, note };
      if (outcome === 'follow_up' && nextDate) body.nextFollowUpAt = nextDate;
      if (outcome === 'enquiry_received') body.enquiry = { product, requirements: note };
      const r = await fetch('/api/crm/calls/outcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? 'Could not log the call.'); return; }
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <div className="cp-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="cp-modal__box" onClick={(e) => e.stopPropagation()}>
        <button className="cp-modal__x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h3 className="cp-modal__title">Log call — {contact.company ?? contact.name}</h3>
        <p className="cp-modal__sub">{contact.mobile}</p>

        <div className="cp-out">
          {OUTCOMES.map((o) => (
            <button key={o.key} className={`cp-out__opt${outcome === o.key ? ` cp-out__opt--on cp-out__opt--${o.tone}` : ''}`} onClick={() => setOutcome(o.key)}>{o.label}</button>
          ))}
        </div>

        {outcome === 'enquiry_received' ? (
          <label className="cp-field"><span>Product / interest</span>
            <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Antique bridal set" />
          </label>
        ) : null}
        {outcome === 'follow_up' ? (
          <label className="cp-field"><span>Next follow-up date</span>
            <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </label>
        ) : null}
        <label className="cp-field"><span>Call note</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What was discussed…" />
        </label>

        {outcome === 'enquiry_received' ? <p className="cp-hint">This will create an enquiry and hand it to the Sales team.</p> : null}
        {err ? <p className="cp-err">{err}</p> : null}
        <div className="cp-modal__foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save outcome'}</Button>
        </div>
      </div>
    </div>
  );
}
