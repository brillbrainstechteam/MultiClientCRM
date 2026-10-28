import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';

/**
 * Lead Leakage (Lead Intake Hub). An exception view so no lead goes invisible:
 * no owner, waiting for first contact, SLA breached, needs review, qualified-
 * awaiting-sales, duplicates, failed intake events.
 */
interface Item { id: string; name: string; source: string; city: string | null; status: string; contactId: string | null; reviewReason: string | null; slaDueAt: string | null; breachedAt: string | null; createdAt: string }
interface Bucket { key: string; label: string; hint: string; count: number; items: Item[] }

const TONE: Record<string, string> = {
  unassigned: '#d97706', awaiting: '#2563eb', breached: '#dc2626', needs_review: '#d97706',
  pending_sales: '#7c3aed', duplicates: '#0891b2', failed: '#dc2626',
};

function ago(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}

export default function LeakageScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/intake/leakage', { credentials: 'same-origin' })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? 'Could not load.'); return d; })
      .then((d) => { setBuckets(d.buckets ?? []); setTotal(d.total ?? 0); setOpen((d.buckets ?? []).find((b: Bucket) => b.count > 0)?.key ?? null); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="crm-leakage">
      <PageHeader
        title="Lead Leakage"
        description="Leads at risk of being forgotten — no owner, waiting too long, SLA breached, unresolved or failed. Fix these first so no lead goes invisible."
      />

      {loading ? (
        <p style={{ color: 'var(--crm-text-muted)' }}>Loading…</p>
      ) : err ? (
        <p style={{ color: 'var(--crm-danger)' }}>{err}</p>
      ) : total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0', color: '#059669', fontWeight: 600 }}>
          <AlertTriangle size={18} /> Nothing leaking — every lead is owned and on track.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, margin: '6px 0 18px' }}>
            {buckets.map((b) => (
              <button key={b.key} onClick={() => setOpen(open === b.key ? null : b.key)}
                style={{ textAlign: 'left', border: '1px solid var(--crm-border-subtle)', borderLeft: `3px solid ${TONE[b.key] ?? 'var(--crm-border-subtle)'}`, borderRadius: 12, padding: '12px 14px', background: open === b.key ? 'var(--crm-surface-sunken)' : 'var(--crm-surface-raised)', cursor: 'pointer' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: b.count ? (TONE[b.key] ?? 'inherit') : 'var(--crm-text-muted)' }}>{b.count}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--crm-text-muted)' }}>{b.hint}</div>
              </button>
            ))}
          </div>

          {open ? (() => {
            const b = buckets.find((x) => x.key === open);
            if (!b || b.count === 0) return <p style={{ color: 'var(--crm-text-muted)' }}>Nothing in this bucket.</p>;
            return (
              <div>
                <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>{b.label} <span style={{ color: 'var(--crm-text-muted)', fontWeight: 400 }}>({b.count})</span></h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {b.items.map((it) => (
                    <button key={it.id} onClick={() => it.contactId && navigate(scopedHref(`/contacts/customer/${it.contactId}`))}
                      style={{ textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', border: '1px solid var(--crm-border-subtle)', borderRadius: 10, padding: '10px 12px', background: 'var(--crm-surface-raised)', cursor: it.contactId ? 'pointer' : 'default' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{it.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--crm-text-muted)' }}>{it.source}{it.city ? ` · ${it.city}` : ''}{it.reviewReason ? ` · ${it.reviewReason}` : ''}</div>
                      </div>
                      <div style={{ fontSize: 12, color: it.breachedAt ? '#dc2626' : 'var(--crm-text-muted)', whiteSpace: 'nowrap' }}>
                        {it.breachedAt ? `breached ${ago(it.breachedAt)} ago` : `waiting ${ago(it.createdAt)}`}
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate(scopedHref('/leads/intake'))} style={{ marginTop: 12, border: 0, background: 'none', color: 'var(--crm-brand-700)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Open the Lead Intake queue →</button>
              </div>
            );
          })() : null}
        </>
      )}
    </div>
  );
}
