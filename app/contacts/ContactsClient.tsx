'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2, Filter, Plus, Search, Tag, UserCheck, Users, X, Download, ChevronDown,
} from 'lucide-react';
import {
  BUSINESS_VALUES, CONTACT_TYPES, LEAD_STATUSES, LIFECYCLE_STAGES, SOURCES,
  completeness, labelOf, toneOf, type Tone,
} from '@/lib/contacts/model';

type U = { id: string; name: string };
type Contact = {
  id: string; phone: string; name: string | null; type: string; businessName: string | null;
  contactPerson: string | null; email: string | null; city: string | null; company: string | null;
  leadStatus: string; lifecycleStage: string; source: string | null; salesOwnerId: string | null;
  salesOwnerName: string | null; tags: string[]; lastActivityAt: string | null; createdAt: string;
};
type Stats = { total: number; prospects: number; customers: number; unassigned: number };

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`ct-badge ct-badge--${tone}`}>{children}</span>;
}

const EMPTY_FILTERS = { q: '', type: '', leadStatus: '', lifecycle: '', owner: '', source: '' };

export function ContactsClient({ businessName, businessModel, users }: { businessName: string; businessModel: string; users: U[] }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, prospects: 0, customers: 0, unassigned: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [bulkMenu, setBulkMenu] = useState<string | null>(null);

  const load = useCallback(async (f: typeof filters) => {
    setLoading(true);
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
    const res = await fetch(`/api/contacts?${p}`);
    const j = await res.json();
    setContacts(j.contacts ?? []);
    setStats(j.stats ?? { total: 0, prospects: 0, customers: 0, unassigned: 0 });
    setSelected(new Set());
    setLoading(false);
  }, []);

  // debounce search; immediate for selects
  useEffect(() => {
    const t = setTimeout(() => load(filters), filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filters, load]);

  const set = (k: keyof typeof filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const activeFilters = useMemo(() => Object.entries(filters).filter(([k, v]) => v && k !== 'q').length, [filters]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = contacts.length > 0 && selected.size === contacts.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(contacts.map((c) => c.id)));

  const bulk = async (action: string, value: string | null) => {
    setBulkMenu(null);
    await fetch('/api/contacts/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], action, value }),
    });
    load(filters);
  };

  const exportCsv = () => {
    const rows = contacts.filter((c) => selected.size === 0 || selected.has(c.id));
    const head = ['Name', 'Phone', 'Type', 'Lead status', 'Lifecycle', 'Owner', 'Source', 'City', 'Tags'];
    const body = rows.map((c) => [
      c.type === 'b2b' ? c.businessName || c.name : c.name, c.phone, c.type,
      c.leadStatus, c.lifecycleStage, c.salesOwnerName || '', c.source || '', c.city || '', c.tags.join('; '),
    ].map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [head.join(','), ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'contacts.csv'; a.click();
  };

  return (
    <main className="cts">
      <header className="cts__head">
        <div>
          <h1>Contacts &amp; Leads</h1>
          <p className="cts__muted">{businessName} · {stats.total} contact{stats.total !== 1 ? 's' : ''}</p>
        </div>
        <nav className="cts__nav">
          <Link href="/inbox">Inbox</Link>
          <Link href="/dashboard">Dashboard</Link>
          <button className="cts__add" onClick={() => setShowAdd(true)}><Plus size={16} /> Add contact</button>
        </nav>
      </header>

      {/* stats */}
      <div className="cts__stats">
        <button className={`cts__stat${!filters.lifecycle ? ' cts__stat--on' : ''}`} onClick={() => set('lifecycle', '')}>
          <span className="cts__stat-ic"><Users size={18} /></span>
          <div><strong>{stats.total}</strong><small>All contacts</small></div>
        </button>
        <button className={`cts__stat${filters.lifecycle === 'prospect' ? ' cts__stat--on' : ''}`} onClick={() => set('lifecycle', 'prospect')}>
          <span className="cts__stat-ic cts__stat-ic--blue"><Filter size={18} /></span>
          <div><strong>{stats.prospects}</strong><small>Prospects</small></div>
        </button>
        <button className={`cts__stat${filters.lifecycle === 'customer' ? ' cts__stat--on' : ''}`} onClick={() => set('lifecycle', 'customer')}>
          <span className="cts__stat-ic cts__stat-ic--emerald"><UserCheck size={18} /></span>
          <div><strong>{stats.customers}</strong><small>Customers</small></div>
        </button>
        <button className={`cts__stat${filters.owner === 'unassigned' ? ' cts__stat--on' : ''}`} onClick={() => set('owner', filters.owner === 'unassigned' ? '' : 'unassigned')}>
          <span className="cts__stat-ic cts__stat-ic--gold"><Building2 size={18} /></span>
          <div><strong>{stats.unassigned}</strong><small>Unassigned</small></div>
        </button>
      </div>

      {/* filters */}
      <div className="cts__filters">
        <div className="cts__search">
          <Search size={16} />
          <input placeholder="Search name, business, phone, city…" value={filters.q} onChange={(e) => set('q', e.target.value)} />
        </div>
        <select value={filters.type} onChange={(e) => set('type', e.target.value)}>
          <option value="">All types</option>
          {CONTACT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.leadStatus} onChange={(e) => set('leadStatus', e.target.value)}>
          <option value="">Any lead status</option>
          {LEAD_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filters.owner} onChange={(e) => set('owner', e.target.value)}>
          <option value="">Any owner</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={filters.source} onChange={(e) => set('source', e.target.value)}>
          <option value="">Any source</option>
          {SOURCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(activeFilters > 0 || filters.q) && (
          <button className="cts__clear" onClick={() => setFilters(EMPTY_FILTERS)}><X size={14} /> Clear</button>
        )}
      </div>

      {/* bulk toolbar */}
      {selected.size > 0 && (
        <div className="cts__bulk">
          <span>{selected.size} selected</span>
          <div className="cts__bulk-actions">
            <div className="cts__menu">
              <button onClick={() => setBulkMenu(bulkMenu === 'assign' ? null : 'assign')}><UserCheck size={15} /> Assign owner <ChevronDown size={13} /></button>
              {bulkMenu === 'assign' && (
                <div className="cts__menu-pop">
                  <button onClick={() => bulk('assign', null)}>Unassigned</button>
                  {users.map((u) => <button key={u.id} onClick={() => bulk('assign', u.id)}>{u.name}</button>)}
                </div>
              )}
            </div>
            <div className="cts__menu">
              <button onClick={() => setBulkMenu(bulkMenu === 'lead' ? null : 'lead')}><Filter size={15} /> Lead status <ChevronDown size={13} /></button>
              {bulkMenu === 'lead' && (
                <div className="cts__menu-pop">
                  {LEAD_STATUSES.map((o) => <button key={o.value} onClick={() => bulk('leadStatus', o.value)}>{o.label}</button>)}
                </div>
              )}
            </div>
            <div className="cts__menu">
              <button onClick={() => setBulkMenu(bulkMenu === 'life' ? null : 'life')}><UserCheck size={15} /> Lifecycle <ChevronDown size={13} /></button>
              {bulkMenu === 'life' && (
                <div className="cts__menu-pop">
                  {LIFECYCLE_STAGES.map((o) => <button key={o.value} onClick={() => bulk('lifecycle', o.value)}>{o.label}</button>)}
                </div>
              )}
            </div>
            <button onClick={exportCsv}><Download size={15} /> Export</button>
          </div>
        </div>
      )}

      {/* table */}
      <div className="cts__tablewrap">
        {loading ? (
          <div className="cts__empty">Loading contacts…</div>
        ) : contacts.length === 0 ? (
          <div className="cts__empty">
            No contacts match. <button className="cts__link" onClick={() => setShowAdd(true)}>Add your first contact</button> or adjust filters.
          </div>
        ) : (
          <table className="cts__table">
            <thead>
              <tr>
                <th className="cts__ck"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                <th>Name</th><th>Type</th><th>Lead status</th><th>Lifecycle</th>
                <th>Owner</th><th>Source</th><th>City</th><th>Profile</th><th>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => {
                const display = c.type === 'b2b' ? c.businessName || c.name : c.name;
                const pct = completeness(c);
                return (
                  <tr key={c.id} className={selected.has(c.id) ? 'cts__row--sel' : ''}>
                    <td className="cts__ck"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} /></td>
                    <td>
                      <Link href={`/contacts/${c.id}`} className="cts__name">{display || 'Unknown'}</Link>
                      <span className="cts__sub">+{c.phone}{c.type === 'b2b' && c.contactPerson ? ` · ${c.contactPerson}` : ''}</span>
                    </td>
                    <td><Badge tone={c.type === 'b2b' ? 'purple' : 'blue'}>{c.type === 'b2b' ? 'B2B' : 'B2C'}</Badge></td>
                    <td><Badge tone={toneOf(LEAD_STATUSES, c.leadStatus)}>{labelOf(LEAD_STATUSES, c.leadStatus)}</Badge></td>
                    <td><Badge tone={toneOf(LIFECYCLE_STAGES, c.lifecycleStage)}>{labelOf(LIFECYCLE_STAGES, c.lifecycleStage)}</Badge></td>
                    <td>{c.salesOwnerName || <span className="cts__muted">—</span>}</td>
                    <td>{labelOf(SOURCES, c.source)}</td>
                    <td>{c.city || <span className="cts__muted">—</span>}</td>
                    <td><span className="cts__meter"><i style={{ width: `${pct}%` }} /></span></td>
                    <td className="cts__muted">{c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddContact defaultType={businessModel === 'b2b' ? 'b2b' : 'b2c'} sources={SOURCES} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(filters); }} />}
    </main>
  );
}

function AddContact({ defaultType, onClose, onDone }: { defaultType: string; sources: typeof SOURCES; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState(defaultType);
  const [f, setF] = useState({ name: '', businessName: '', contactPerson: '', phone: '', email: '', city: '', source: '', gstin: '' });
  const [err, setErr] = useState<{ msg: string; dupId?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true); setErr(null);
    const res = await fetch('/api/contacts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, type }),
    });
    setSaving(false);
    if (res.ok) { onDone(); return; }
    const j = await res.json().catch(() => ({}));
    setErr({ msg: j.error ?? 'Could not save.', dupId: j.duplicateId });
  };

  return (
    <div className="ct-modal" role="dialog" aria-modal="true">
      <div className="ct-modal__backdrop" onClick={onClose} />
      <div className="ct-modal__card">
        <div className="ct-modal__head"><h2>Add contact</h2><button onClick={onClose}><X size={18} /></button></div>
        <div className="ct-modal__type">
          {CONTACT_TYPES.map((o) => (
            <button key={o.value} className={type === o.value ? 'on' : ''} onClick={() => setType(o.value)}>{o.label}</button>
          ))}
        </div>
        <div className="ct-modal__fields">
          {type === 'b2b' ? (
            <>
              <label>Business name<input value={f.businessName} onChange={(e) => up('businessName', e.target.value)} placeholder="e.g. Shah Textiles" /></label>
              <label>Contact person<input value={f.contactPerson} onChange={(e) => up('contactPerson', e.target.value)} placeholder="e.g. Ravi Shah" /></label>
            </>
          ) : (
            <label>Full name<input value={f.name} onChange={(e) => up('name', e.target.value)} placeholder="e.g. Priya Nair" /></label>
          )}
          <div className="ct-modal__row">
            <label>Mobile number<input value={f.phone} onChange={(e) => up('phone', e.target.value)} placeholder="+91 98765 43210" inputMode="tel" /></label>
            <label>City<input value={f.city} onChange={(e) => up('city', e.target.value)} placeholder="Optional" /></label>
          </div>
          <div className="ct-modal__row">
            <label>Email<input value={f.email} onChange={(e) => up('email', e.target.value)} placeholder="Optional" type="email" /></label>
            <label>Source
              <select value={f.source} onChange={(e) => up('source', e.target.value)}>
                <option value="">Select…</option>
                {SOURCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
          {type === 'b2b' && <label>GSTIN<input value={f.gstin} onChange={(e) => up('gstin', e.target.value)} placeholder="Optional — 22AAAAA0000A1Z5" /></label>}
        </div>
        {err && (
          <p className="ct-modal__err">
            {err.msg} {err.dupId && <Link href={`/contacts/${err.dupId}`} className="cts__link">Open existing contact →</Link>}
          </p>
        )}
        <div className="ct-modal__foot">
          <button className="ct-btn ct-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="ct-btn ct-btn--primary" disabled={saving || !f.phone || (type === 'b2b' ? !f.businessName : !f.name)} onClick={save}>
            {saving ? 'Saving…' : 'Add contact'}
          </button>
        </div>
      </div>
    </div>
  );
}
