import { useEffect, useState, useCallback } from 'react';
import { MapPin, Check } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Toast } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import './ZonesConfigReal.css';

interface Zone { id: string; name: string; code: string | null; states: string[]; cities: string[]; memberUserIds: string[]; }
interface Member { id: string; name: string; role: string; department: string | null; }

/** Real zone routing config: assign members to each zone. A new inbound lead is
 *  mapped City → State → Zone → member (1 member = auto-assigned; 2+ = the admin
 *  picks per lead). */
export default function ZonesConfigReal() {
  const { role } = useWorkspace();
  const canEdit = role === 'owner';
  const [zones, setZones] = useState<Zone[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/crm/zones', { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => { if (!d.error) { setZones(d.zones ?? []); setMembers(d.members ?? []); } setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (zone: Zone, memberId: string) => {
    if (!canEdit) return;
    const next = zone.memberUserIds.includes(memberId)
      ? zone.memberUserIds.filter((id) => id !== memberId)
      : [...zone.memberUserIds, memberId];
    setZones((zs) => zs.map((z) => (z.id === zone.id ? { ...z, memberUserIds: next } : z))); // optimistic
    const r = await fetch(`/api/crm/zones/${zone.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ memberUserIds: next }) });
    if (!r.ok) { setToast('Could not update the zone.'); load(); }
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  return (
    <div className="zc">
      <PageHeader title="Zone routing" description="New leads are auto-routed by location to a zone’s member. 1 member = auto-assigned; 2+ = you pick per lead." />
      {loading ? <p className="zc-muted">Loading zones…</p> : (
        <div className="zc-grid">
          {zones.map((z) => (
            <section key={z.id} className="zc-zone">
              <div className="zc-zone__head">
                <span className="zc-zone__ic"><MapPin size={16} /></span>
                <div>
                  <strong>{z.name}</strong>
                  <span className="zc-zone__states">{z.states.slice(0, 6).join(', ')}{z.states.length > 6 ? `, +${z.states.length - 6}` : ''}</span>
                </div>
                <span className={`zc-zone__count${z.memberUserIds.length === 1 ? ' zc-zone__count--auto' : z.memberUserIds.length > 1 ? ' zc-zone__count--pick' : ''}`}>
                  {z.memberUserIds.length === 0 ? 'No members' : z.memberUserIds.length === 1 ? 'Auto-assign' : `${z.memberUserIds.length} · pick per lead`}
                </span>
              </div>
              <div className="zc-members">
                {members.length === 0 ? <p className="zc-muted">Add team members first.</p> : members.map((m) => {
                  const on = z.memberUserIds.includes(m.id);
                  return (
                    <button key={m.id} className={`zc-member${on ? ' zc-member--on' : ''}`} onClick={() => toggle(z, m.id)} disabled={!canEdit}>
                      <span className="zc-check">{on ? <Check size={13} /> : null}</span>
                      <span className="zc-member__name">{m.name}</span>
                      {m.department ? <span className="zc-member__dept">{m.department}</span> : null}
                    </button>
                  );
                })}
              </div>
              {z.memberUserIds.length > 0 ? (
                <p className="zc-zone__foot">Covered by {z.memberUserIds.map(memberName).join(', ')}</p>
              ) : null}
            </section>
          ))}
        </div>
      )}
      {toast ? <Toast message={toast} tone="error" onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
