import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X, Share2, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button, Input } from '@crm/design-system';

interface IntakeEvent {
  id: string; sourceType: string; sourceName: string | null; customerType: string;
  accountName: string | null; contactName: string | null; mobile: string | null; city: string | null;
  productInterest: string | null; budgetRange: string | null; occasion: string | null;
  classification: string | null; status: string; reviewReason: string | null;
  contactId: string | null; assignedUserId: string | null; assignmentReason: string | null;
  slaDueAt: string | null; firstResponseAt: string | null; breachedAt: string | null; createdAt: string;
}
interface Member { id: string; name: string }

const TABS = [
  { id: '', label: 'All' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'needs_review', label: 'Needs review' },
  { id: 'pending_assignment', label: 'Pending sales' },
  { id: 'mine', label: 'Mine' },
];

const STATUS_LABEL: Record<string, string> = {
  new: 'New', needs_review: 'Needs review', duplicate_suspected: 'Duplicate?', routed: 'Routed',
  awaiting_first_contact: 'Awaiting contact', contacted: 'Contacted', closed_invalid: 'Invalid',
  pending_assignment: 'Pending sales', nurturing: 'Nurturing', qualified: 'Qualified',
};

function slaBadge(e: IntakeEvent): { text: string; tone: string } {
  if (e.firstResponseAt) return { text: 'Responded', tone: '#059669' };
  if (!e.slaDueAt) return { text: '—', tone: 'var(--crm-text-muted)' };
  const due = new Date(e.slaDueAt).getTime();
  const mins = Math.round((due - Date.now()) / 60000);
  if (mins < 0) return { text: `Breached ${-mins}m`, tone: '#dc2626' };
  if (mins < 60) return { text: `${mins}m left`, tone: '#d97706' };
  return { text: `${Math.round(mins / 60)}h left`, tone: 'var(--crm-text-muted)' };
}

/** Lead Intake Queue (Lead Capture docs §12/§14) — one triage surface for every
 *  source. Managers see all; others see their own + the unassigned pool. */
export default function IntakeQueueScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [tab, setTab] = useState('');
  const [events, setEvents] = useState<IntakeEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [assignFor, setAssignFor] = useState<IntakeEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (tab === 'unassigned') p.set('assigned', 'unassigned');
    else if (tab === 'mine') p.set('assigned', 'me');
    else if (tab) p.set('status', tab);
    fetch(`/api/crm/intake?${p.toString()}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d) => setEvents(Array.isArray(d.events) ? d.events : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [tab]);
  useEffect(load, [load]);

  useEffect(() => {
    fetch('/api/crm/team/assignable', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { allMembers: [] }))
      .then((d) => setMembers((d.allMembers ?? d.members ?? []) as Member[]))
      .catch(() => setMembers([]));
  }, []);

  const memberName = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const act = async (id: string, action: string, userId?: string) => {
    const r = await fetch(`/api/crm/intake/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ action, userId }),
    });
    if (r.ok) {
      const msg = action === 'assign' ? 'Assigned.' : action === 'mark_contacted' ? 'Marked contacted.'
        : action === 'qualify' ? 'Qualified — handed to Sales.' : action === 'not_interested' ? 'Moved to nurture.' : 'Updated.';
      setToast(msg); load();
    } else { const d = await r.json().catch(() => ({})); setToast(d.error ?? 'Could not update.'); }
  };

  return (
    <div className="crm-intake">
      <PageHeader
        title="Lead Intake"
        description="Every lead from every source, in one triage queue — matched, classified, routed, and tracked against a first-response SLA."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" iconLeft={<Share2 />} onClick={() => setSharing(true)}>Share form</Button>
            <Button variant="primary" iconLeft={<Plus />} onClick={() => setAdding(true)}>Quick add lead</Button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '4px 0 14px' }}>
        <div style={{ display: 'inline-flex', gap: 2, padding: 3, border: '1px solid var(--crm-border-subtle)', borderRadius: 10, background: 'var(--crm-surface-sunken)' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ font: 'inherit', fontSize: 12.5, fontWeight: 600, border: 0, background: tab === t.id ? 'var(--crm-surface-raised)' : 'none', color: tab === t.id ? 'var(--crm-brand-700)' : 'var(--crm-text-secondary)', padding: '5px 12px', borderRadius: 7, cursor: 'pointer' }}>{t.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--crm-text-muted)' }}>Loading queue…</p>
      ) : events.length === 0 ? (
        <p style={{ color: 'var(--crm-text-muted)', padding: '24px 0' }}>No leads in this view.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--crm-text-muted)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                <th style={{ padding: '8px 10px' }}>Customer</th>
                <th style={{ padding: '8px 10px' }}>Source</th>
                <th style={{ padding: '8px 10px' }}>Interest</th>
                <th style={{ padding: '8px 10px' }}>City</th>
                <th style={{ padding: '8px 10px' }}>Classification</th>
                <th style={{ padding: '8px 10px' }}>Owner</th>
                <th style={{ padding: '8px 10px' }}>SLA</th>
                <th style={{ padding: '8px 10px' }}>Status</th>
                <th style={{ padding: '8px 10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const sla = slaBadge(e);
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--crm-border-subtle)' }}>
                    <td style={{ padding: '10px' }}>
                      <button onClick={() => e.contactId && navigate(scopedHref(`/contacts/customer/${e.contactId}`))} style={{ border: 0, background: 'none', color: 'var(--crm-text-primary)', fontWeight: 600, cursor: e.contactId ? 'pointer' : 'default', padding: 0, textAlign: 'left' }}>
                        {e.contactName || e.accountName || e.mobile || 'Unknown'}
                      </button>
                      {e.mobile ? <div style={{ fontSize: 12, color: 'var(--crm-text-muted)' }}>{e.mobile}</div> : null}
                    </td>
                    <td style={{ padding: '10px' }}>{e.sourceName ?? e.sourceType}</td>
                    <td style={{ padding: '10px' }}>{[e.productInterest, e.occasion, e.budgetRange].filter(Boolean).join(' · ') || '—'}</td>
                    <td style={{ padding: '10px' }}>{e.city ?? '—'}</td>
                    <td style={{ padding: '10px', fontSize: 12 }}>{e.classification ? e.classification.replace(/_/g, ' ').toLowerCase() : '—'}</td>
                    <td style={{ padding: '10px' }}>{e.assignedUserId ? (memberName.get(e.assignedUserId) ?? 'Assigned') : <span style={{ color: '#d97706', fontWeight: 600 }}>Unassigned</span>}</td>
                    <td style={{ padding: '10px', color: sla.tone, fontWeight: 600 }}>{sla.text}</td>
                    <td style={{ padding: '10px' }}>{STATUS_LABEL[e.status] ?? e.status}</td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                      {e.status === 'pending_assignment' ? (
                        <Button variant="secondary" size="sm" onClick={() => setAssignFor(e)}>Assign sales</Button>
                      ) : e.assignmentReason === 'MARKETING_QUEUE' && (e.status === 'routed' || e.status === 'new') ? (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => act(e.id, 'qualify')}>Qualify</Button>
                          <Button variant="ghost" size="sm" onClick={() => act(e.id, 'not_interested')}>Nurture</Button>
                        </>
                      ) : (
                        <>
                          {!e.assignedUserId ? <Button variant="secondary" size="sm" onClick={() => act(e.id, 'assign')}>Take</Button> : null}
                          {e.status !== 'contacted' && e.status !== 'closed_invalid' ? <Button variant="ghost" size="sm" onClick={() => act(e.id, 'mark_contacted')}>Contacted</Button> : null}
                          {e.status !== 'closed_invalid' ? <Button variant="ghost" size="sm" onClick={() => act(e.id, 'mark_invalid')}>Invalid</Button> : null}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {adding ? <QuickAddLead members={members} onClose={() => setAdding(false)} onDone={(msg) => { setAdding(false); setToast(msg); load(); }} /> : null}
      {sharing ? <ShareForm onClose={() => setSharing(false)} /> : null}
      {assignFor ? <AssignPicker members={members} onClose={() => setAssignFor(null)} onPick={(uid) => { const id = assignFor.id; setAssignFor(null); act(id, 'assign', uid); }} /> : null}
      {toast ? <div role="status" onAnimationEnd={() => setToast(null)} style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 80, background: 'var(--crm-brand-700)', color: '#fff', fontWeight: 600, fontSize: 13.5, padding: '11px 18px', borderRadius: 10, animation: 'none' }}>{toast}</div> : null}
    </div>
  );
}

function QuickAddLead({ onClose, onDone }: { members: Member[]; onClose: () => void; onDone: (msg: string) => void }) {
  // B2B vs B2C follows the tenant's onboarding mode, so it is not asked here —
  // the intake pipeline stamps it from Tenant.businessModel.
  const [f, setF] = useState({ contactName: '', mobile: '', city: '', productInterest: '', sourceName: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.contactName.trim() && !f.mobile.trim()) { setErr('Enter at least a name or mobile.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/crm/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ sourceType: 'manual', sourceName: f.sourceName.trim() || 'Manual quick-add', contactName: f.contactName.trim(), mobile: f.mobile.trim(), city: f.city.trim(), productInterest: f.productInterest.trim(), notes: f.notes.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? 'Could not add the lead.'); return; }
      onDone(d.duplicate ? 'Matched an existing customer.' : `Lead captured (${String(d.classification ?? '').replace(/_/g, ' ').toLowerCase()}).`);
    } finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(460px,100%)', background: 'var(--crm-surface-raised)', borderRadius: 16, padding: 24 }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, border: 0, background: 'none', cursor: 'pointer', color: 'var(--crm-text-secondary)' }}><X size={18} /></button>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Quick add lead</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input label="Name" value={f.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Contact / business name" />
          <Input label="Mobile" value={f.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="+91…" />
          <Input label="City" value={f.city} onChange={(e) => set('city', e.target.value)} />
          <Input label="Interested in" value={f.productInterest} onChange={(e) => set('productInterest', e.target.value)} placeholder="e.g. bridal necklace, gold chains" />
          <Input label="Source" value={f.sourceName} onChange={(e) => set('sourceName', e.target.value)} placeholder="e.g. Walk-in, Referral, Phone" />
          {err ? <p style={{ color: 'var(--crm-danger)', fontSize: 13, margin: 0 }}>{err}</p> : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Capturing…' : 'Capture lead'}</Button>
        </div>
      </div>
    </div>
  );
}

/** Owner picks the salesperson for a qualified lead in Pending Assignment (MKT-06). */
function AssignPicker({ members, onClose, onPick }: { members: Member[]; onClose: () => void; onPick: (userId: string) => void }) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(420px,100%)', background: 'var(--crm-surface-raised)', borderRadius: 16, padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, border: 0, background: 'none', cursor: 'pointer', color: 'var(--crm-text-secondary)' }}><X size={18} /></button>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>Assign to salesperson</h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--crm-text-secondary)' }}>This lead is qualified and ready for Sales. Choose who takes it.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.length === 0 ? <p style={{ color: 'var(--crm-text-muted)', fontSize: 13 }}>No team members found.</p> : members.map((m) => (
            <button key={m.id} onClick={() => onPick(m.id)} style={{ textAlign: 'left', font: 'inherit', fontSize: 14, fontWeight: 600, padding: '10px 12px', border: '1px solid var(--crm-border-subtle)', borderRadius: 10, background: 'var(--crm-surface-sunken)', cursor: 'pointer', color: 'var(--crm-text-primary)' }}>{m.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Share the public lead form: fetch/mint the link, copy, enable/disable. */
function ShareForm({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/lead-form', { credentials: 'same-origin' })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error ?? 'Could not load the form link.'); return d; })
      .then((d) => { setUrl(`${window.location.origin}${d.path}`); setEnabled(d.enabled !== false); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    await fetch('/api/crm/lead-form', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ action: 'set_enabled', enabled: next }) }).catch(() => undefined);
  };

  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(520px,100%)', background: 'var(--crm-surface-raised)', borderRadius: 16, padding: 24 }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, border: 0, background: 'none', cursor: 'pointer', color: 'var(--crm-text-secondary)' }}><X size={18} /></button>
        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Share your lead form</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--crm-text-secondary)' }}>Send this link to customers. Every submission lands here in Lead Intake — matched, routed and SLA-tracked. The form supports voice input.</p>

        {loading ? (
          <p style={{ color: 'var(--crm-text-muted)' }}>Loading link…</p>
        ) : err ? (
          <p style={{ color: 'var(--crm-danger)', fontSize: 13.5 }}>{err}</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input readOnly value={url ?? ''} onFocus={(e) => e.currentTarget.select()} style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--crm-border-subtle)', background: 'var(--crm-surface-sunken)', color: 'var(--crm-text-primary)', fontSize: 13 }} />
              <Button variant="primary" iconLeft={copied ? <Check /> : <Copy />} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, fontSize: 13.5, color: 'var(--crm-text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} />
              Form is active (customers can submit)
            </label>
          </>
        )}
      </div>
    </div>
  );
}
