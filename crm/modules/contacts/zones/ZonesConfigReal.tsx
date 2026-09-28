import { useEffect, useState, useCallback } from 'react';
import { MapPin, Check, Plus, Trash2, X, Pencil } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Input, Toast } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import './ZonesConfigReal.css';

interface Zone { id: string; name: string; code: string | null; states: string[]; cities: string[]; memberUserIds: string[]; }
interface Member { id: string; name: string; role: string; department: string | null; }

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh',
  'Chandigarh', 'Puducherry', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
];

/** Real zone routing config: define zones (states/cities) and assign members. A
 *  new inbound lead is mapped City → State → Zone → member. Each state or city
 *  belongs to exactly one zone (enforced server-side). Owner/admin can edit. */
export default function ZonesConfigReal() {
  const { role } = useWorkspace();
  const canEdit = role === 'owner';
  const [zones, setZones] = useState<Zone[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(() => {
    fetch('/api/crm/zones', { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => { if (!d.error) { setZones(d.zones ?? []); setMembers(d.members ?? []); } setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const patchZone = async (zoneId: string, body: Record<string, unknown>) => {
    const r = await fetch(`/api/crm/zones/${zoneId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setToast(d.error ?? 'Could not update the zone.'); load(); return false; }
    load();
    return true;
  };

  const toggle = (zone: Zone, memberId: string) => {
    if (!canEdit) return;
    const next = zone.memberUserIds.includes(memberId)
      ? zone.memberUserIds.filter((id) => id !== memberId)
      : [...zone.memberUserIds, memberId];
    setZones((zs) => zs.map((z) => (z.id === zone.id ? { ...z, memberUserIds: next } : z))); // optimistic
    patchZone(zone.id, { memberUserIds: next });
  };

  const addValue = (zone: Zone, field: 'states' | 'cities', value: string) => {
    const v = value.trim();
    if (!v) return;
    if (zone[field].some((x) => x.toLowerCase() === v.toLowerCase())) return;
    patchZone(zone.id, { [field]: [...zone[field], v] });
  };
  const removeValue = (zone: Zone, field: 'states' | 'cities', value: string) => {
    patchZone(zone.id, { [field]: zone[field].filter((x) => x !== value) });
  };

  const createZone = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const r = await fetch('/api/crm/zones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setToast(d.error ?? 'Could not add the zone.'); return; }
      setToast(`Zone “${name}” added.`); setNewName(''); setAdding(false); load();
    } finally { setBusy(false); }
  };

  const deleteZone = async (zone: Zone) => {
    if (!window.confirm(`Delete the “${zone.name}” zone? Leads already routed keep their assignment.`)) return;
    const r = await fetch(`/api/crm/zones/${zone.id}`, { method: 'DELETE', credentials: 'same-origin' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setToast(d.error ?? 'Could not delete the zone.'); return; }
    setToast(`Zone “${zone.name}” deleted.`); load();
  };

  const saveName = async (zone: Zone) => {
    const name = editName.trim();
    setEditId(null);
    if (!name || name === zone.name) return;
    await patchZone(zone.id, { name });
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  return (
    <div className="zc">
      <PageHeader
        title="Zone routing"
        actions={canEdit ? (
          <Button variant="primary" onClick={() => setAdding((v) => !v)}><Plus size={16} /> Add zone</Button>
        ) : undefined}
      />

      {adding && canEdit ? (
        <div className="zc-addbar">
          <Input label="Zone name" hideLabel placeholder="e.g. Central, North-East, Metro" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createZone(); }} />
          <Button variant="primary" onClick={createZone} disabled={busy || !newName.trim()}>{busy ? 'Adding…' : 'Create zone'}</Button>
          <Button variant="ghost" onClick={() => { setAdding(false); setNewName(''); }}>Cancel</Button>
        </div>
      ) : null}

      {loading ? <p className="zc-muted">Loading zones…</p> : zones.length === 0 ? (
        <p className="zc-muted">No zones yet. {canEdit ? 'Add a zone to start routing leads by location.' : ''}</p>
      ) : (
        <div className="zc-grid">
          {zones.map((z) => (
            <section key={z.id} className="zc-zone">
              <div className="zc-zone__head">
                <span className="zc-zone__ic"><MapPin size={16} /></span>
                <div className="zc-zone__title">
                  {editId === z.id ? (
                    <input className="zc-nameinput" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={() => saveName(z)} onKeyDown={(e) => { if (e.key === 'Enter') saveName(z); if (e.key === 'Escape') setEditId(null); }} />
                  ) : (
                    <strong>
                      {z.name}
                      {canEdit ? <button className="zc-iconbtn zc-iconbtn--sm" title="Rename zone" onClick={() => { setEditId(z.id); setEditName(z.name); }}><Pencil size={12} /></button> : null}
                    </strong>
                  )}
                </div>
                <span className={`zc-zone__count${z.memberUserIds.length === 1 ? ' zc-zone__count--auto' : z.memberUserIds.length > 1 ? ' zc-zone__count--pick' : ''}`}>
                  {z.memberUserIds.length === 0 ? 'No members' : z.memberUserIds.length === 1 ? 'Auto-assign' : `${z.memberUserIds.length} · pick per lead`}
                </span>
                {canEdit ? <button className="zc-iconbtn zc-iconbtn--danger" title="Delete zone" onClick={() => deleteZone(z)}><Trash2 size={15} /></button> : null}
              </div>

              <ChipField
                label="States" field="states" zone={z} canEdit={canEdit}
                listId={`states-${z.id}`} suggestions={INDIA_STATES}
                onAdd={(v) => addValue(z, 'states', v)} onRemove={(v) => removeValue(z, 'states', v)}
              />
              <ChipField
                label="Cities" field="cities" zone={z} canEdit={canEdit}
                onAdd={(v) => addValue(z, 'cities', v)} onRemove={(v) => removeValue(z, 'cities', v)}
              />

              <div className="zc-fieldlabel">Members</div>
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

function ChipField({ label, zone, field, canEdit, onAdd, onRemove, listId, suggestions }: {
  label: string; zone: Zone; field: 'states' | 'cities'; canEdit: boolean;
  onAdd: (v: string) => void; onRemove: (v: string) => void; listId?: string; suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');
  const commit = () => { if (draft.trim()) { onAdd(draft); setDraft(''); } };
  const values = zone[field];
  return (
    <div className="zc-chipfield">
      <div className="zc-fieldlabel">{label}</div>
      <div className="zc-chips">
        {values.length === 0 ? <span className="zc-chips__empty">None yet</span> : values.map((v) => (
          <span key={v} className="zc-chip">
            {v}
            {canEdit ? <button className="zc-chip__x" title={`Remove ${v}`} onClick={() => onRemove(v)}><X size={12} /></button> : null}
          </span>
        ))}
      </div>
      {canEdit ? (
        <div className="zc-chipadd">
          <input
            className="zc-chipinput"
            placeholder={field === 'states' ? 'Add a state…' : 'Add a city…'}
            value={draft}
            list={listId}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          />
          {listId && suggestions ? (
            <datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          ) : null}
          <button className="zc-iconbtn" title={`Add ${field === 'states' ? 'state' : 'city'}`} onClick={commit} disabled={!draft.trim()}><Plus size={15} /></button>
        </div>
      ) : null}
    </div>
  );
}
