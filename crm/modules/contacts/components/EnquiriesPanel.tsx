import { useEffect, useState, useCallback } from 'react';
import './EnquiriesPanel.css';

/**
 * Reusable enquiry capture + list for a contact — the chat->pipeline bridge.
 * Used in Customer 360 (Enquiries tab) and the Inbox customer panel. Talks to
 * /api/crm/enquiries directly so it works wherever a real contactId is known.
 */
export interface EnquiryDTO {
  id: string; enquiryNo: string; status: string; isNew: boolean;
  product: string | null; design: string | null; weightRange: string | null;
  sizeLength: string | null; pcs: number | null; tentativeWeight: string | null;
  description: string | null; source: string | null; imagesSentAt: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', images_sent: 'Images sent', converted: 'Converted', lost: 'Lost', cancelled: 'Cancelled',
};
const STATUS_TONE: Record<string, string> = {
  pending: 'warn', images_sent: 'info', converted: 'ok', lost: 'bad', cancelled: 'muted',
};
const NEXT_ACTIONS: Record<string, { to: string; label: string }[]> = {
  pending: [{ to: 'images_sent', label: 'Mark images sent' }, { to: 'converted', label: 'Won' }, { to: 'lost', label: 'Lost' }],
  images_sent: [{ to: 'converted', label: 'Won' }, { to: 'lost', label: 'Lost' }],
};

export function EnquiriesPanel({ contactId, conversationId, compact }: { contactId: string; conversationId?: string; compact?: boolean }) {
  const [list, setList] = useState<EnquiryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/crm/enquiries?contactId=${encodeURIComponent(contactId)}`, { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => { setList(d.enquiries ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [contactId]);
  useEffect(() => { load(); }, [load]);

  const create = async (form: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch('/api/crm/enquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ ...form, contactId, conversationId }),
      });
      if (res.ok) { setAdding(false); load(); }
    } finally { setBusy(false); }
  };
  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/crm/enquiries/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <div className={`enq${compact ? ' enq--compact' : ''}`}>
      <div className="enq__head">
        <h3 className="enq__title">Enquiries {list.length ? <span className="enq__count">{list.length}</span> : null}</h3>
        {!adding ? <button className="enq__add" onClick={() => setAdding(true)}>+ Log enquiry</button> : null}
      </div>

      {adding ? <EnquiryForm busy={busy} onCancel={() => setAdding(false)} onSubmit={create} /> : null}

      {loading ? <p className="enq__muted">Loading…</p> : null}
      {!loading && list.length === 0 && !adding ? <p className="enq__muted">No enquiries yet. Log the first from this chat.</p> : null}

      <ul className="enq__list">
        {list.map((e) => (
          <li key={e.id} className="enq__item">
            <div className="enq__row">
              <span className="enq__no">{e.enquiryNo}</span>
              <span className={`enq__badge enq__badge--${STATUS_TONE[e.status] ?? 'muted'}`}>{STATUS_LABEL[e.status] ?? e.status}</span>
              {e.isNew ? <span className="enq__tag">New</span> : <span className="enq__tag">Existing</span>}
            </div>
            <div className="enq__line">
              {[e.product, e.design, e.weightRange, e.sizeLength, e.pcs ? `${e.pcs} pcs` : null, e.tentativeWeight].filter(Boolean).join(' · ') || e.description || '—'}
            </div>
            {e.description && (e.product || e.design) ? <div className="enq__desc">{e.description}</div> : null}
            {NEXT_ACTIONS[e.status] ? (
              <div className="enq__actions">
                {NEXT_ACTIONS[e.status].map((a) => (
                  <button key={a.to} className="enq__act" onClick={() => setStatus(e.id, a.to)}>{a.label}</button>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnquiryForm({ onSubmit, onCancel, busy }: { onSubmit: (f: Record<string, unknown>) => void; onCancel: () => void; busy: boolean }) {
  const [f, setF] = useState({ isNew: true, product: '', design: '', weightRange: '', sizeLength: '', pcs: '', tentativeWeight: '', description: '', source: 'whatsapp' });
  const up = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="enq__form">
      <div className="enq__grid">
        <label className="enq__f"><span>New / existing</span>
          <select value={f.isNew ? 'new' : 'existing'} onChange={(e) => up('isNew', e.target.value === 'new')}>
            <option value="new">New customer</option><option value="existing">Existing customer</option>
          </select>
        </label>
        <label className="enq__f"><span>Product</span><input value={f.product} onChange={(e) => up('product', e.target.value)} placeholder="Necklace" /></label>
        <label className="enq__f"><span>Design</span><input value={f.design} onChange={(e) => up('design', e.target.value)} placeholder="Antique" /></label>
        <label className="enq__f"><span>Weight range</span><input value={f.weightRange} onChange={(e) => up('weightRange', e.target.value)} placeholder="40–60 g" /></label>
        <label className="enq__f"><span>Size / length</span><input value={f.sizeLength} onChange={(e) => up('sizeLength', e.target.value)} placeholder="18 in" /></label>
        <label className="enq__f"><span>Pcs</span><input value={f.pcs} onChange={(e) => up('pcs', e.target.value)} inputMode="numeric" placeholder="2" /></label>
        <label className="enq__f"><span>Tentative wt</span><input value={f.tentativeWeight} onChange={(e) => up('tentativeWeight', e.target.value)} placeholder="52 g" /></label>
      </div>
      <label className="enq__f enq__f--full"><span>Requirements / order description</span>
        <textarea value={f.description} onChange={(e) => up('description', e.target.value)} rows={2} placeholder="Bridal antique set for October wedding" />
      </label>
      <div className="enq__formfoot">
        <button className="enq__cancel" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="enq__save" onClick={() => onSubmit(f)} disabled={busy}>{busy ? 'Saving…' : 'Save enquiry'}</button>
      </div>
    </div>
  );
}
