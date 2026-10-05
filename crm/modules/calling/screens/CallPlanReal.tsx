import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MapPin, CalendarClock, ChevronRight, X, BookOpen, Navigation, ListPlus } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Badge } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import { CreatePlanModal } from '../components/CreatePlanModal';
import './CallPlanReal.css';

interface PlanContact {
  id: string; name: string; company: string | null; mobile: string;
  nextFollowUpAt: string | null; leadStatus: string; interestedIn: string | null;
  ownerId: string; ownerName: string | null; businessSegment: string | null; grade: string | null; preferredLanguage: string | null;
  city?: string | null;
}
interface AssigneeRow { ownerId: string; ownerName: string | null; overdue: number; today: number; upcoming: number; total: number; }
interface PlanData { scope: string; overdue: PlanContact[]; today: PlanContact[]; upcoming: PlanContact[]; counts: { overdue: number; today: number; upcoming: number }; assignees: AssigneeRow[]; }

type Channel = 'call' | 'visit';

const OUTCOMES = [
  { key: 'interested', label: 'Interested', tone: 'brand' as const },
  { key: 'enquiry_received', label: 'Enquiry generated', tone: 'success' as const },
  { key: 'follow_up', label: 'Follow-up required', tone: 'info' as const },
  { key: 'not_interested', label: 'Not interested', tone: 'danger' as const },
  { key: 'active_customer', label: 'Active customer', tone: 'success' as const },
];
const SEGMENT: Record<string, string> = { chain_stores: 'Chain', corporate: 'Corporate', boutique: 'Boutique', exports: 'Exports', standalone: 'Standalone', small_store: 'Small store' };
const mapsHref = (c: PlanContact) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([c.company ?? c.name, c.city].filter(Boolean).join(', '))}`;

/** Datewise activity plan — Telecalling and Field visits share the same daily
 *  plan (overdue/today/upcoming by follow-up date). Each row studies the contact,
 *  opens a call/route, and logs an outcome that updates the pipeline. */
export default function CallPlanReal() {
  const { role } = useWorkspace();
  const navigate = useNavigate();
  const isAdmin = role === 'owner';
  const [channel, setChannel] = useState<Channel>('call');
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [logging, setLogging] = useState<PlanContact | null>(null);
  const [planning, setPlanning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = assignee ? `?assignee=${encodeURIComponent(assignee)}` : '';
    fetch(`/api/crm/followups${qs}`, { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => { setData(d.error ? null : d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [assignee]);
  useEffect(() => { load(); }, [load]);

  const total = data ? data.counts.overdue + data.counts.today + data.counts.upcoming : 0;

  return (
    <div className="cp">
      <PageHeader
        title="Activity plan"
        description={channel === 'call' ? 'Plan and log your telecalling for the day' : 'Plan field visits by area and log what happened'}
        actions={
          <>
            {isAdmin ? <Button variant="secondary" iconLeft={<ListPlus size={16} />} onClick={() => setPlanning(true)}>Create plan</Button> : null}
            <Button variant="ghost" onClick={() => navigate('/calling/history')}>Activity history <ChevronRight size={15} /></Button>
          </>
        }
      />

      {/* Channel switch — one planner, two activities. */}
      <div className="cp-channel" role="tablist" aria-label="Activity type">
        <button role="tab" aria-selected={channel === 'call'} className={`cp-channel__btn${channel === 'call' ? ' cp-channel__btn--on' : ''}`} onClick={() => setChannel('call')}>
          <Phone size={16} /> Telecalling
        </button>
        <button role="tab" aria-selected={channel === 'visit'} className={`cp-channel__btn${channel === 'visit' ? ' cp-channel__btn--on' : ''}`} onClick={() => setChannel('visit')}>
          <MapPin size={16} /> Field visits
        </button>
      </div>

      {/* Admin: per-assignee overview */}
      {isAdmin && data && data.assignees.length > 0 ? (
        <div className="cp-assignees">
          <button className={`cp-assignee${assignee === null ? ' cp-assignee--on' : ''}`} onClick={() => setAssignee(null)}>
            <strong>Everyone</strong><span>{total} to {channel === 'call' ? 'call' : 'visit'}</span>
          </button>
          {data.assignees.map((a) => (
            <button key={a.ownerId} className={`cp-assignee${assignee === a.ownerId ? ' cp-assignee--on' : ''}`} onClick={() => setAssignee(a.ownerId)}>
              <strong>{a.ownerName ?? 'Unassigned'}</strong>
              <span>{a.overdue > 0 ? `${a.overdue} overdue · ` : ''}{a.today} today · {a.upcoming} upcoming</span>
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <p className="cp-muted">Loading your plan…</p> : !data ? <p className="cp-muted">Couldn’t load the plan.</p> : (
        <>
          <Bucket title="Overdue" tone="danger" items={data.overdue} channel={channel} showOwner={isAdmin && !assignee} onLog={setLogging} navigate={navigate} />
          <Bucket title="Today" tone="info" items={data.today} channel={channel} showOwner={isAdmin && !assignee} onLog={setLogging} navigate={navigate} />
          <Bucket title="Upcoming" tone="neutral" items={data.upcoming} channel={channel} showOwner={isAdmin && !assignee} onLog={setLogging} navigate={navigate} />
          {total === 0 ? (
            <div className="cp-empty">
              <CalendarClock size={26} />
              <strong>No {channel === 'call' ? 'calls' : 'visits'} scheduled</strong>
              <p>{channel === 'call'
                ? 'Assign contacts and set a follow-up date to build the plan.'
                : 'Assign contacts to a zone member and set a visit date to build the route.'}</p>
            </div>
          ) : null}
        </>
      )}

      {logging ? <OutcomeModal contact={logging} channel={channel} onClose={() => setLogging(null)} onDone={() => { setLogging(null); load(); }} /> : null}
      {planning ? <CreatePlanModal channel={channel} onClose={() => setPlanning(false)} onDone={(n) => { setPlanning(false); setToast(`${n} contact${n === 1 ? '' : 's'} added to the plan.`); load(); }} /> : null}
      {toast ? <div className="cp-toast" role="status" onAnimationEnd={() => setToast(null)}>{toast}</div> : null}
    </div>
  );
}

function Bucket({ title, tone, items, channel, showOwner, onLog, navigate }: { title: string; tone: 'danger' | 'info' | 'neutral'; items: PlanContact[]; channel: Channel; showOwner: boolean; onLog: (c: PlanContact) => void; navigate: (to: string) => void }) {
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
                <span>{channel === 'visit' && c.city ? `${c.city} · ` : ''}{c.mobile}{c.interestedIn ? ` · ${c.interestedIn}` : ''}</span>
              </div>
              <div className="cp-row__meta">
                {c.grade ? <span className="cp-chip">Grade {c.grade}</span> : null}
                {c.businessSegment ? <span className="cp-chip">{SEGMENT[c.businessSegment] ?? c.businessSegment}</span> : null}
                {c.preferredLanguage ? <span className="cp-chip">{c.preferredLanguage}</span> : null}
                {showOwner && c.ownerName ? <span className="cp-chip cp-chip--owner">{c.ownerName}</span> : null}
                {c.nextFollowUpAt ? <span className="cp-date">{new Date(c.nextFollowUpAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span> : null}
              </div>
            </button>
            <button className="cp-act cp-act--ghost" title={channel === 'visit' ? 'Pre-visit brief' : 'Pre-call brief'} onClick={() => navigate(`/contacts/customer/${c.id}?tab=kundli`)}><BookOpen size={15} /><span>Study</span></button>
            {channel === 'call'
              ? <a className="cp-act" href={`tel:+${c.mobile.replace(/\D/g, '')}`} title="Call"><Phone size={15} /><span>Call</span></a>
              : <a className="cp-act" href={mapsHref(c)} target="_blank" rel="noreferrer" title="Directions"><Navigation size={15} /><span>Route</span></a>}
            <button className="cp-log" onClick={() => onLog(c)}>{channel === 'call' ? 'Log call' : 'Log visit'}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function OutcomeModal({ contact, channel, onClose, onDone }: { contact: PlanContact; channel: Channel; onClose: () => void; onDone: () => void }) {
  const [outcome, setOutcome] = useState<string>('interested');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [product, setProduct] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const verb = channel === 'call' ? 'call' : 'visit';

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = { contactId: contact.id, outcome, note, channel };
      if (outcome === 'follow_up' && nextDate) body.nextFollowUpAt = nextDate;
      if (outcome === 'enquiry_received') body.enquiry = { product, requirements: note };
      const r = await fetch('/api/crm/calls/outcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? `Could not log the ${verb}.`); return; }
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <div className="cp-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="cp-modal__box" onClick={(e) => e.stopPropagation()}>
        <button className="cp-modal__x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h3 className="cp-modal__title">Log {verb} — {contact.company ?? contact.name}</h3>
        <p className="cp-modal__sub">{channel === 'visit' && contact.city ? `${contact.city} · ` : ''}{contact.mobile}</p>

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
          <label className="cp-field"><span>Next {verb} date</span>
            <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </label>
        ) : null}
        <label className="cp-field"><span>{channel === 'visit' ? 'Visit note' : 'Call note'}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={channel === 'visit' ? 'What was shown, their response, next step…' : 'What was discussed…'} />
        </label>

        {outcome === 'enquiry_received' ? <p className="cp-hint">This creates an enquiry and hands it to the Sales team.</p> : null}
        {outcome === 'active_customer' ? <p className="cp-hint">This marks the contact as an active customer.</p> : null}
        {err ? <p className="cp-err">{err}</p> : null}
        <div className="cp-modal__foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save outcome'}</Button>
        </div>
      </div>
    </div>
  );
}
