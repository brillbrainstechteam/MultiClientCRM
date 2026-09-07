'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Check, MessageSquare, Plus, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import {
  ACTIVITY_KINDS, BUSINESS_VALUES, LEAD_PIPELINE, LEAD_STATUSES, LIFECYCLE_STAGES, SOURCES,
  completeness, labelOf, toneOf, type Tone,
} from '@/lib/contacts/model';

type U = { id: string; name: string };
type Contact = Record<string, any>;
type Item = { id: string; kind: string; title: string; detail?: string | null; at: string };

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`ct-badge ct-badge--${tone}`}>{children}</span>;
}
function initials(s: string) {
  return s.split(/[\s+]/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '#';
}

export function Customer360({ initial, users, messageCount }: { initial: Contact; users: U[]; messageCount: number }) {
  const [c, setC] = useState<Contact>(initial);
  const [form, setForm] = useState<Contact>(initial);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState('');
  const [custom, setCustom] = useState<[string, string][]>(Object.entries(initial.customFields ?? {}).map(([k, v]) => [k, String(v)]));

  const display = c.type === 'b2b' ? c.businessName || c.name : c.name;
  const terminal = ['not_interested', 'dormant'].includes(c.leadStatus);
  const curIdx = LEAD_PIPELINE.indexOf(c.leadStatus);

  useEffect(() => { fetch(`/api/contacts/${c.id}/timeline`).then((r) => r.json()).then((j) => setItems(j.items ?? [])); }, [c.id]);

  const up = (k: string, v: any) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const changeStage = async (field: 'lead' | 'lifecycle', toStage: string) => {
    const res = await fetch(`/api/contacts/${c.id}/stage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field, toStage }),
    });
    if (res.ok) { const j = await res.json(); setC((p) => ({ ...p, ...j.contact })); refreshTimeline(); }
  };
  const refreshTimeline = () => fetch(`/api/contacts/${c.id}/timeline`).then((r) => r.json()).then((j) => setItems(j.items ?? []));

  const save = async () => {
    const customFields = Object.fromEntries(custom.filter(([k]) => k.trim()).map(([k, v]) => [k.trim(), v]));
    const payload = {
      type: form.type, name: form.name, businessName: form.businessName, contactPerson: form.contactPerson,
      legalName: form.legalName, gstin: form.gstin, email: form.email, company: form.company,
      city: form.city, area: form.area, pincode: form.pincode, state: form.state, zone: form.zone, country: form.country, branch: form.branch,
      billingAddress: form.billingAddress, shippingAddress: form.shippingAddress,
      source: form.source, customerType: form.customerType, businessValue: form.businessValue,
      productInterests: toArr(form.productInterests), tags: toArr(form.tags), notes: form.notes,
      salesOwnerId: form.salesOwnerId || null, marketingOwnerId: form.marketingOwnerId || null,
      consentOptIn: !!form.consentOptIn, consentSource: form.consentSource, optedOut: !!form.optedOut, blocked: !!form.blocked,
      customFields,
    };
    const res = await fetch(`/api/contacts/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { const j = await res.json(); setC(j.contact); setForm(j.contact); setDirty(false); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1800); refreshTimeline(); }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    await fetch(`/api/contacts/${c.id}/timeline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'note', title: note.trim() }) });
    setNote(''); refreshTimeline();
  };

  return (
    <main className="c3">
      <Link href="/contacts" className="c3__back"><ArrowLeft size={16} /> All contacts</Link>

      {/* header */}
      <header className="c3__hero">
        <span className="c3__avatar">{initials(display || c.phone)}</span>
        <div className="c3__id">
          <div className="c3__name-row">
            <h1>{display || 'Unknown contact'}</h1>
            <Badge tone={c.type === 'b2b' ? 'purple' : 'blue'}>{c.type === 'b2b' ? 'B2B' : 'B2C'}</Badge>
            {c.businessValue && <Badge tone={toneOf(BUSINESS_VALUES, c.businessValue)}>{labelOf(BUSINESS_VALUES, c.businessValue)} value</Badge>}
          </div>
          <p className="c3__meta">+{c.phone}{c.type === 'b2b' && c.contactPerson ? ` · ${c.contactPerson}` : ''}{c.city ? ` · ${c.city}` : ''}</p>
        </div>
        <div className="c3__owner">
          <label>Sales owner</label>
          <select value={form.salesOwnerId || ''} onChange={(e) => { up('salesOwnerId', e.target.value); }}>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </header>

      {/* status band */}
      <section className="c3__status">
        <div className="c3__pipe">
          <span className="c3__pipe-label">Lead status</span>
          <div className="c3__steps">
            {LEAD_PIPELINE.map((st, i) => {
              const done = !terminal && i <= curIdx;
              return (
                <button key={st} className={`c3__step${done ? ' c3__step--done' : ''}${!terminal && i === curIdx ? ' c3__step--cur' : ''}`} onClick={() => changeStage('lead', st)}>
                  <span className="c3__step-dot">{done ? <Check size={12} /> : i + 1}</span>
                  {labelOf(LEAD_STATUSES, st)}
                </button>
              );
            })}
          </div>
          <div className="c3__terminal">
            <button className={c.leadStatus === 'not_interested' ? 'on' : ''} onClick={() => changeStage('lead', 'not_interested')}>Not interested</button>
            <button className={c.leadStatus === 'dormant' ? 'on' : ''} onClick={() => changeStage('lead', 'dormant')}>Dormant</button>
          </div>
        </div>
        <div className="c3__life">
          <span className="c3__pipe-label">Lifecycle</span>
          <div className="c3__life-toggle">
            {LIFECYCLE_STAGES.map((o) => (
              <button key={o.value} className={c.lifecycleStage === o.value ? 'on' : ''} onClick={() => changeStage('lifecycle', o.value)}>{o.label}</button>
            ))}
          </div>
          {c.activatedAt && <p className="c3__activated">Activated {new Date(c.activatedAt).toLocaleDateString()}</p>}
        </div>
      </section>

      <div className="c3__grid">
        {/* profile */}
        <div className="c3__profile">
          <div className="c3__card">
            <h3>Identity</h3>
            <div className="c3__fields">
              {c.type === 'b2b' ? (
                <>
                  <F label="Business name"><input value={form.businessName || ''} onChange={(e) => up('businessName', e.target.value)} /></F>
                  <F label="Contact person"><input value={form.contactPerson || ''} onChange={(e) => up('contactPerson', e.target.value)} /></F>
                  <F label="Legal name"><input value={form.legalName || ''} onChange={(e) => up('legalName', e.target.value)} /></F>
                  <F label="GSTIN"><input value={form.gstin || ''} onChange={(e) => up('gstin', e.target.value)} /></F>
                </>
              ) : (
                <F label="Full name"><input value={form.name || ''} onChange={(e) => up('name', e.target.value)} /></F>
              )}
              <F label="Email"><input type="email" value={form.email || ''} onChange={(e) => up('email', e.target.value)} /></F>
              <F label="Source">
                <select value={form.source || ''} onChange={(e) => up('source', e.target.value)}>
                  <option value="">—</option>{SOURCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </F>
              <F label="Customer type"><input value={form.customerType || ''} onChange={(e) => up('customerType', e.target.value)} placeholder="wholesale, retail…" /></F>
              <F label="Business value">
                <select value={form.businessValue || ''} onChange={(e) => up('businessValue', e.target.value)}>
                  <option value="">—</option>{BUSINESS_VALUES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </F>
            </div>
          </div>

          <div className="c3__card">
            <h3>Location</h3>
            <div className="c3__fields">
              <F label="City"><input value={form.city || ''} onChange={(e) => up('city', e.target.value)} /></F>
              <F label="Pincode"><input value={form.pincode || ''} onChange={(e) => up('pincode', e.target.value)} /></F>
              <F label="Area"><input value={form.area || ''} onChange={(e) => up('area', e.target.value)} /></F>
              <F label="State"><input value={form.state || ''} onChange={(e) => up('state', e.target.value)} /></F>
              <F label="Zone"><input value={form.zone || ''} onChange={(e) => up('zone', e.target.value)} /></F>
              <F label="Branch / unit"><input value={form.branch || ''} onChange={(e) => up('branch', e.target.value)} /></F>
            </div>
          </div>

          <div className="c3__card">
            <h3>Addresses &amp; KYC</h3>
            <div className="c3__fields c3__fields--1">
              <F label="Billing address"><textarea rows={2} value={form.billingAddress || ''} onChange={(e) => up('billingAddress', e.target.value)} /></F>
              <F label="Shipping address"><textarea rows={2} value={form.shippingAddress || ''} onChange={(e) => up('shippingAddress', e.target.value)} /></F>
            </div>
          </div>

          <div className="c3__card">
            <h3>Segmentation</h3>
            <div className="c3__fields c3__fields--1">
              <F label="Tags (comma separated)"><input value={arrToStr(form.tags)} onChange={(e) => up('tags', e.target.value)} placeholder="bulk-buyer, vip" /></F>
              <F label="Product interests (comma separated)"><input value={arrToStr(form.productInterests)} onChange={(e) => up('productInterests', e.target.value)} placeholder="bridal, kundan" /></F>
            </div>
          </div>

          <div className="c3__card">
            <h3><ShieldCheck size={15} /> Consent &amp; eligibility</h3>
            <div className="c3__consent">
              <label className="c3__chk"><input type="checkbox" checked={!!form.consentOptIn} onChange={(e) => up('consentOptIn', e.target.checked)} /> Opted in to marketing</label>
              <label className="c3__chk"><input type="checkbox" checked={!!form.optedOut} onChange={(e) => up('optedOut', e.target.checked)} /> Opted out</label>
              <label className="c3__chk"><input type="checkbox" checked={!!form.blocked} onChange={(e) => up('blocked', e.target.checked)} /> Blocked</label>
              <F label="Opt-in source"><input value={form.consentSource || ''} onChange={(e) => up('consentSource', e.target.value)} placeholder="website form, WhatsApp…" /></F>
            </div>
          </div>

          <div className="c3__card">
            <h3>Custom fields</h3>
            <div className="c3__custom">
              {custom.map(([k, v], i) => (
                <div key={i} className="c3__custom-row">
                  <input placeholder="Field" value={k} onChange={(e) => { const n = [...custom]; n[i] = [e.target.value, v]; setCustom(n); setDirty(true); }} />
                  <input placeholder="Value" value={v} onChange={(e) => { const n = [...custom]; n[i] = [k, e.target.value]; setCustom(n); setDirty(true); }} />
                  <button onClick={() => { setCustom(custom.filter((_, j) => j !== i)); setDirty(true); }}><X size={14} /></button>
                </div>
              ))}
              <button className="c3__addfield" onClick={() => { setCustom([...custom, ['', '']]); }}><Plus size={14} /> Add field</button>
            </div>
          </div>
        </div>

        {/* right rail */}
        <div className="c3__side">
          <div className="c3__card c3__profilemeter">
            <div className="c3__pm-top"><span>Profile completeness</span><strong>{completeness(c)}%</strong></div>
            <span className="cts__meter"><i style={{ width: `${completeness(c)}%` }} /></span>
            <div className="c3__pm-links">
              <span><MessageSquare size={14} /> {messageCount} message{messageCount !== 1 ? 's' : ''}</span>
              <Link href="/inbox" className="cts__link">Open in inbox →</Link>
            </div>
          </div>

          <div className="c3__card">
            <h3>Marketing owner</h3>
            <select value={form.marketingOwnerId || ''} onChange={(e) => up('marketingOwnerId', e.target.value)} className="c3__owner-sel">
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <p className="c3__hint">Marketing owns prospecting; a sales owner is added when an enquiry is generated.</p>
          </div>

          <div className="c3__card c3__timeline-card">
            <h3><Sparkles size={15} /> Activity timeline</h3>
            <div className="c3__note">
              <textarea rows={2} placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="ct-btn ct-btn--primary ct-btn--sm" disabled={!note.trim()} onClick={addNote}>Add note</button>
            </div>
            <ul className="c3__timeline">
              {items.length === 0 && <li className="c3__tl-empty">No activity yet.</li>}
              {items.map((it) => {
                const meta = ACTIVITY_KINDS[it.kind] ?? ACTIVITY_KINDS.system;
                return (
                  <li key={it.id} className="c3__tl">
                    <span className={`c3__tl-dot ct-badge--${meta.tone}`} />
                    <div>
                      <div className="c3__tl-head"><strong>{it.title}</strong><time>{new Date(it.at).toLocaleString()}</time></div>
                      {it.detail && <p>{it.detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* save bar */}
      {dirty && (
        <div className="c3__savebar">
          <span>Unsaved changes</span>
          <div>
            <button className="ct-btn ct-btn--ghost" onClick={() => { setForm(c); setCustom(Object.entries(c.customFields ?? {}).map(([k, v]) => [k, String(v)])); setDirty(false); }}>Discard</button>
            <button className="ct-btn ct-btn--primary" onClick={save}>Save changes</button>
          </div>
        </div>
      )}
      {savedFlash && <div className="c3__toast"><Check size={15} /> Saved</div>}
    </main>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="c3__field"><span>{label}</span>{children}</label>;
}
function toArr(v: any): string[] {
  if (Array.isArray(v)) return v;
  return String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
}
function arrToStr(v: any): string {
  return Array.isArray(v) ? v.join(', ') : String(v || '');
}
