import { useMemo, useState } from 'react';
import { X, Search, Upload, Users, CheckCircle2 } from 'lucide-react';
import { Button, Select } from '@crm/design-system';
import { contacts, users, findUser } from '@crm/mock-data';
import './CreatePlanModal.css';

type Channel = 'call' | 'visit';
type Tab = 'contacts' | 'upload';

const STATUS_OPTS = [
  { value: '', label: 'Any status' },
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'connected', label: 'Connected' },
  { value: 'interested', label: 'Interested' },
  { value: 'enquiry_generated', label: 'Enquiry generated' },
  { value: 'not_interested', label: 'Not interested' },
];
const isNew = (c: { leadStatus?: string; lifecycleStage?: string }) => (c.leadStatus === 'new' || c.leadStatus === 'assigned') && c.lifecycleStage !== 'customer';
const normMobile = (m: string) => { const t = (m ?? '').trim(); return t.startsWith('+') ? t : `+91${t.replace(/\D/g, '')}`; };

/** Build a calling/visit plan: pick contacts (filter the list, "new customers",
 *  by assignee) or paste/upload numbers, set a date + assignee, and schedule. */
export function CreatePlanModal({ channel, onClose, onDone }: { channel: Channel; onClose: () => void; onDone: (n: number) => void }) {
  const [tab, setTab] = useState<Tab>('contacts');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [owner, setOwner] = useState('');
  const [city, setCity] = useState('');
  const [newOnly, setNewOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState('');
  const [date, setDate] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cities = useMemo(() => [...new Set(contacts.map((c) => c.city).filter(Boolean))].sort(), []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (status && c.leadStatus !== status) return false;
      if (owner && c.ownerId !== owner) return false;
      if (city && c.city !== city) return false;
      if (newOnly && !isNew(c)) return false;
      if (needle) {
        const hay = `${c.name} ${c.company ?? ''} ${c.mobile}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [q, status, owner, city, newOnly]);

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShownSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected((prev) => {
    const n = new Set(prev);
    if (allShownSelected) filtered.forEach((c) => n.delete(c.id));
    else filtered.forEach((c) => n.add(c.id));
    return n;
  });

  // Upload tab: parse pasted numbers and match against contacts by mobile.
  const parsedNumbers = useMemo(() => [...new Set(sheet.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).map(normMobile))], [sheet]);
  const matchByMobile = useMemo(() => {
    const byMobile = new Map(contacts.map((c) => [normMobile(c.mobile), c]));
    const matched = parsedNumbers.filter((m) => byMobile.has(m));
    return { matched, unmatched: parsedNumbers.length - matched.length };
  }, [parsedNumbers]);

  const count = tab === 'contacts' ? selected.size : matchByMobile.matched.length;
  const assigneeOpts = [{ value: '', label: 'Keep current owner' }, ...users.map((u) => ({ value: u.id, label: u.name }))];

  const save = async () => {
    if (!date) { setErr('Choose a date for the plan.'); return; }
    if (count === 0) { setErr('Select at least one contact.'); return; }
    setBusy(true); setErr(null);
    try {
      const body: Record<string, unknown> = { date, assigneeUserId: assignTo || undefined };
      if (tab === 'contacts') body.contactIds = [...selected];
      else body.mobiles = parsedNumbers;
      const r = await fetch('/api/crm/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? 'Could not build the plan.'); return; }
      onDone(d.scheduled ?? count);
    } finally { setBusy(false); }
  };

  return (
    <div className="pl-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pl-box" onClick={(e) => e.stopPropagation()}>
        <button className="pl-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h3 className="pl-title">Create {channel === 'visit' ? 'visit' : 'calling'} plan</h3>
        <p className="pl-sub">Pick contacts and set a date — they’ll appear in the {channel === 'visit' ? 'field-visit' : 'telecalling'} plan.</p>

        <div className="pl-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'contacts'} className={`pl-tab${tab === 'contacts' ? ' pl-tab--on' : ''}`} onClick={() => setTab('contacts')}><Users size={15} /> From contacts</button>
          <button role="tab" aria-selected={tab === 'upload'} className={`pl-tab${tab === 'upload' ? ' pl-tab--on' : ''}`} onClick={() => setTab('upload')}><Upload size={15} /> Upload numbers</button>
        </div>

        {tab === 'contacts' ? (
          <>
            <div className="pl-filters">
              <div className="pl-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company, mobile…" /></div>
              <Select label="Status" hideLabel size="sm" options={STATUS_OPTS} value={status} onChange={(e) => setStatus(e.target.value)} />
              <Select label="Assignee" hideLabel size="sm" options={[{ value: '', label: 'Any assignee' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} value={owner} onChange={(e) => setOwner(e.target.value)} />
              <Select label="City" hideLabel size="sm" options={[{ value: '', label: 'Any city' }, ...cities.map((c) => ({ value: c, label: c }))]} value={city} onChange={(e) => setCity(e.target.value)} />
              <label className="pl-check"><input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} /> New customers only</label>
            </div>

            <div className="pl-listhead">
              <label className="pl-check"><input type="checkbox" checked={allShownSelected} onChange={toggleAll} /> Select all ({filtered.length})</label>
              <span className="pl-selected">{selected.size} selected</span>
            </div>
            <div className="pl-list">
              {filtered.length === 0 ? <p className="pl-empty">No contacts match these filters.</p> : filtered.slice(0, 300).map((c) => (
                <label key={c.id} className={`pl-item${selected.has(c.id) ? ' pl-item--on' : ''}`}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  <span className="pl-item__id"><strong>{c.company ?? c.name}</strong><span>{c.city ? `${c.city} · ` : ''}{c.mobile}</span></span>
                  <span className="pl-item__owner">{findUser(c.ownerId)?.name ?? 'Unassigned'}</span>
                </label>
              ))}
              {filtered.length > 300 ? <p className="pl-empty">Showing first 300 — refine filters to narrow down.</p> : null}
            </div>
          </>
        ) : (
          <div className="pl-upload">
            <label className="pl-field"><span>Paste mobile numbers (one per line, or comma-separated)</span>
              <textarea value={sheet} onChange={(e) => setSheet(e.target.value)} rows={6} placeholder={"9811020001\n9820030011, 9686040021"} />
            </label>
            <label className="pl-filebtn"><Upload size={15} /> Upload a .csv / .txt file
              <input type="file" accept=".csv,.txt" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setSheet(await f.text()); }} />
            </label>
            {parsedNumbers.length > 0 ? (
              <p className="pl-matchnote"><CheckCircle2 size={14} /> {matchByMobile.matched.length} of {parsedNumbers.length} numbers match existing contacts{matchByMobile.unmatched > 0 ? ` · ${matchByMobile.unmatched} not found` : ''}.</p>
            ) : null}
          </div>
        )}

        <div className="pl-foot">
          <div className="pl-foot__fields">
            <label className="pl-field pl-field--sm"><span>{channel === 'visit' ? 'Visit' : 'Calling'} date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="pl-field pl-field--sm"><span>Assign all to</span>
              <Select label="Assign" hideLabel size="sm" options={assigneeOpts} value={assignTo} onChange={(e) => setAssignTo(e.target.value)} />
            </label>
          </div>
          {err ? <p className="pl-err">{err}</p> : null}
          <div className="pl-actions">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={busy || count === 0 || !date}>{busy ? 'Scheduling…' : `Schedule ${count} contact${count === 1 ? '' : 's'}`}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
