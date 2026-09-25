import { useEffect, useState, useCallback } from 'react';
import { UserPlus, RotateCcw, Check, Ban } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Input, Select, Badge, Toast } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import './TeamMembersReal.css';

interface Member { id: string; name: string; email: string; role: string; department: string | null; status: string; createdAt: string; }
interface Seats { used: number; included: number | null; overage: number; overagePrice: number; currency: string; monthlyOverage: number; }
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

const ROLE_OPTS = [
  { value: 'agent', label: 'Agent' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];
const DEPT_OPTS = [
  { value: '', label: 'No department' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'support', label: 'Support' },
];
const ROLE_TONE: Record<string, 'brand' | 'info' | 'neutral' | 'gold'> = { owner: 'gold', admin: 'brand', manager: 'info', agent: 'neutral' };

/** Real team-member management (TEAM-S02 People). Client-admin creates/manages
 * accounts with roles + departments; seats are enforced against the plan. */
export default function TeamMembersReal() {
  const { role } = useWorkspace();
  // Real 'admin' users map to 'owner' in the workspace context (see bootstrap),
  // so owner covers both here; the API is the real gate (owner/admin only).
  const canManage = role === 'owner';
  const [members, setMembers] = useState<Member[]>([]);
  const [seats, setSeats] = useState<Seats>({ used: 0, included: null, overage: 0, overagePrice: 0, currency: 'INR', monthlyOverage: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    fetch('/api/crm/team/members', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { if (!d.error) { setMembers(d.members ?? []); if (d.seats) setSeats(d.seats); } setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>, ok: string) => {
    const r = await fetch(`/api/crm/team/members/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setToast(d.error ?? 'Update failed.'); return; }
    setToast(ok); load();
  };

  // Blocked only when the plan has no paid overage (e.g. trial) and seats are full.
  const blocked = seats.included !== null && seats.used >= seats.included && seats.overagePrice <= 0;
  const nextIsOverage = seats.included !== null && seats.used >= seats.included && seats.overagePrice > 0;

  return (
    <div className="tm">
      <PageHeader title="Team members" actions={canManage ? (
        <Button variant="primary" onClick={() => setAdding((v) => !v)} disabled={blocked && !adding}>
          <UserPlus size={16} /> Add member
        </Button>
      ) : undefined} />

      <div className="tm__seats">
        <span className="tm__seats-num">{seats.used}{seats.included !== null ? ` / ${seats.included}` : ''}</span>
        <span className="tm__seats-label">seats used</span>
        {seats.overage > 0 ? <Badge tone="info">+{seats.overage} paid seat{seats.overage !== 1 ? 's' : ''} · {inr(seats.monthlyOverage)}/mo</Badge> : null}
        {blocked ? <Badge tone="warning">All seats in use — upgrade to add more</Badge> : null}
        {nextIsOverage && seats.overage === 0 ? <Badge tone="neutral">Next seat: +{inr(seats.overagePrice)}/mo</Badge> : null}
      </div>

      {adding && canManage ? <AddMemberForm overageNote={nextIsOverage ? `Heads up: this member is beyond your ${seats.included} included seats and adds ${inr(seats.overagePrice)}/mo.` : null} onCancel={() => setAdding(false)} onCreated={(m) => { setAdding(false); setToast(`${m.name} added.`); load(); }} onError={setToast} /> : null}

      {loading ? <p className="tm__muted">Loading members…</p> : (
        <div className="tm__table">
          <div className="tm__thead">
            <span>Member</span><span>Role</span><span>Department</span><span>Status</span><span className="tm__actions-h">Actions</span>
          </div>
          {members.map((m) => (
            <div key={m.id} className={`tm__row${m.status === 'disabled' ? ' tm__row--off' : ''}`}>
              <div className="tm__member">
                <span className="tm__ava">{initials(m.name)}</span>
                <div><strong>{m.name}</strong><span>{m.email}</span></div>
              </div>
              <div>
                {m.role === 'owner' || !canManage ? <Badge tone={ROLE_TONE[m.role] ?? 'neutral'}>{cap(m.role)}</Badge>
                  : <Select label="Role" hideLabel options={ROLE_OPTS} value={m.role} onChange={(e) => patch(m.id, { role: e.target.value }, 'Role updated.')} />}
              </div>
              <div>
                {canManage && m.role !== 'owner'
                  ? <Select label="Department" hideLabel options={DEPT_OPTS} value={m.department ?? ''} onChange={(e) => patch(m.id, { department: e.target.value || null }, 'Department updated.')} />
                  : <span className="tm__dept">{m.department ? cap(m.department) : '—'}</span>}
              </div>
              <div><Badge tone={m.status === 'active' ? 'success' : 'neutral'}>{m.status === 'active' ? 'Active' : 'Disabled'}</Badge></div>
              <div className="tm__actions">
                {canManage && m.role !== 'owner' ? (
                  <>
                    <button className="tm__act" title="Reset password" onClick={() => resetPw(m, patch)}><RotateCcw size={15} /></button>
                    {m.status === 'active'
                      ? <button className="tm__act tm__act--danger" title="Disable" onClick={() => patch(m.id, { status: 'disabled' }, `${m.name} disabled.`)}><Ban size={15} /></button>
                      : <button className="tm__act tm__act--ok" title="Re-enable" onClick={() => patch(m.id, { status: 'active' }, `${m.name} re-enabled.`)}><Check size={15} /></button>}
                  </>
                ) : <span className="tm__you">{m.role === 'owner' ? 'Account owner' : ''}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function AddMemberForm({ onCreated, onCancel, onError, overageNote }: { onCreated: (m: Member) => void; onCancel: () => void; onError: (s: string) => void; overageNote: string | null }) {
  const [f, setF] = useState({ name: '', email: '', role: 'agent', department: 'sales', password: '' });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/crm/team/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { onError(d.error ?? 'Could not add member.'); return; }
      onCreated(d as Member);
    } finally { setBusy(false); }
  };
  return (
    <div className="tm__form">
      <h3 className="tm__form-title">Add a team member</h3>
      {overageNote ? <p className="tm__overage">{overageNote}</p> : null}
      <div className="tm__grid">
        <Input label="Full name" value={f.name} onChange={(e) => up('name', e.target.value)} placeholder="e.g. Rahul Sharma" />
        <Input label="Email" type="email" value={f.email} onChange={(e) => up('email', e.target.value)} placeholder="rahul@company.com" />
        <Select label="Role" options={ROLE_OPTS} value={f.role} onChange={(e) => up('role', e.target.value)} />
        <Select label="Department" options={DEPT_OPTS.filter((o) => o.value)} value={f.department} onChange={(e) => up('department', e.target.value)} />
        <Input label="Initial password" type="text" value={f.password} onChange={(e) => up('password', e.target.value)} hint="Share this with the member; they can change it after signing in." />
      </div>
      <div className="tm__form-foot">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={submit} disabled={busy}>{busy ? 'Adding…' : 'Create member'}</Button>
      </div>
    </div>
  );
}

function resetPw(m: Member, patch: (id: string, body: Record<string, unknown>, ok: string) => void) {
  const pw = window.prompt(`Set a new password for ${m.name} (min 6 chars):`);
  if (pw && pw.length >= 6) patch(m.id, { password: pw }, `Password reset for ${m.name}.`);
}
function initials(name: string) { return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'; }
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
