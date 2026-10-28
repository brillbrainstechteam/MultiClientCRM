import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X, RefreshCw, Facebook } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Select, Input } from '@crm/design-system';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Load the Facebook JS SDK once, then init with the app id. */
function loadFbSdk(appId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.FB) { resolve(w.FB); return; }
    const done = () => { try { w.FB.init({ appId, cookie: true, xfbml: false, version: 'v23.0' }); resolve(w.FB); } catch (e) { reject(e); } };
    const existing = document.getElementById('facebook-jssdk') as HTMLScriptElement | null;
    if (existing) { existing.addEventListener('load', done); return; }
    const s = document.createElement('script');
    s.id = 'facebook-jssdk'; s.src = 'https://connect.facebook.net/en_US/sdk.js'; s.async = true; s.defer = true;
    s.onload = done; s.onerror = () => reject(new Error('Could not load the Facebook SDK.'));
    document.body.appendChild(s);
  });
}

/**
 * Lead Sources / Connections (Lead Intake Hub). One place to see and manage
 * every channel a tenant can receive enquiries on — multiple WhatsApp numbers,
 * Facebook Pages and Instagram accounts included — with live connector health.
 */

interface Conn {
  id: string; provider: string; providerLabel: string; displayName: string;
  externalAccountId: string | null; status: string; authStatus: string;
  lastEventAt: string | null; lastError: string | null; active: boolean; derived: boolean;
  ingestPath?: string; secretKey?: string;
}
interface Provider { provider: string; label: string; multi: boolean; how: string }
interface Summary { total: number; connected: number; degraded: number; disconnected: number; pending: number }

const STATUS_TONE: Record<string, string> = {
  connected: '#059669', degraded: '#d97706', disconnected: '#dc2626', pending: 'var(--crm-text-muted)',
};
const STATUS_LABEL: Record<string, string> = {
  connected: 'Connected', degraded: 'Degraded', disconnected: 'Disconnected', pending: 'Pending',
};

function ago(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

export default function ConnectionsScreen() {
  const [conns, setConns] = useState<Conn[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/connections', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => { setConns(d.connections ?? []); setProviders(d.providers ?? []); setSummary(d.summary ?? null); })
      .catch(() => setConns([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const act = async (id: string, body: Record<string, unknown>, okMsg: string) => {
    const r = await fetch(`/api/crm/connections/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    if (r.ok) { setToast(okMsg); load(); } else { const d = await r.json().catch(() => ({})); setToast(d.error ?? 'Could not update.'); }
  };
  const remove = async (id: string) => {
    const r = await fetch(`/api/crm/connections/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
    if (r.ok) { setToast('Connection removed.'); load(); } else { const d = await r.json().catch(() => ({})); setToast(d.error ?? 'Could not remove.'); }
  };

  const connectMeta = async () => {
    try {
      const cfg = await fetch('/api/crm/connect/meta', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => null);
      if (!cfg?.configured) { setToast('Meta app is not configured on the server yet. Add the app credentials to go live.'); return; }
      const FB = await loadFbSdk(cfg.appId);
      FB.login((resp: any) => {
        const code = resp?.authResponse?.code;
        if (!code) { setToast('Meta connection was cancelled.'); return; }
        fetch('/api/crm/connect/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ code }) })
          .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) { setToast(d.error ?? 'Meta connection failed.'); return; } setToast(`Connected: ${d.pages} page(s), ${d.instagram} Instagram.`); load(); });
      }, { config_id: cfg.configId, response_type: 'code', override_default_response_type: true });
    } catch (e) { setToast(e instanceof Error ? e.message : 'Could not start the Meta connection.'); }
  };

  const grouped = useMemo(() => {
    const m = new Map<string, Conn[]>();
    for (const c of conns) { const list = m.get(c.providerLabel) ?? []; list.push(c); m.set(c.providerLabel, list); }
    return [...m.entries()];
  }, [conns]);

  return (
    <div className="crm-connections">
      <PageHeader
        title="Lead Sources"
        description="Every channel that can bring in an enquiry — WhatsApp, Meta, Instagram, website and more. Connect once; every lead flows into Lead Intake and is matched, routed and tracked. Watch connector health so a dead source never loses leads silently."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" iconLeft={<Facebook />} onClick={connectMeta}>Connect Facebook / Instagram</Button>
            <Button variant="primary" iconLeft={<Plus />} onClick={() => setAdding(true)}>Add connection</Button>
          </div>
        }
      />

      {summary ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 18px' }}>
          {(['connected', 'degraded', 'disconnected', 'pending'] as const).map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 10, border: '1px solid var(--crm-border-subtle)', background: 'var(--crm-surface-raised)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: STATUS_TONE[k] }} />
              <strong style={{ fontSize: 15 }}>{summary[k]}</strong>
              <span style={{ fontSize: 12.5, color: 'var(--crm-text-secondary)' }}>{STATUS_LABEL[k]}</span>
            </div>
          ))}
          <button onClick={load} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--crm-border-subtle)', background: 'var(--crm-surface-raised)', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--crm-text-secondary)' }}><RefreshCw size={14} /> Refresh</button>
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: 'var(--crm-text-muted)' }}>Loading connections…</p>
      ) : conns.length === 0 ? (
        <p style={{ color: 'var(--crm-text-muted)', padding: '24px 0' }}>No sources connected yet. Add your first connection to start capturing leads automatically.</p>
      ) : (
        grouped.map(([label, rows]) => (
          <div key={label} style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--crm-text-muted)', margin: '0 0 8px' }}>{label}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14, padding: '12px 14px', border: '1px solid var(--crm-border-subtle)', borderRadius: 12, background: 'var(--crm-surface-raised)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_TONE[c.status], flex: '0 0 auto' }} title={STATUS_LABEL[c.status]} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.displayName}{c.derived ? <span style={{ fontSize: 11, color: 'var(--crm-text-muted)', fontWeight: 500 }}> · managed on WhatsApp settings</span> : null}</div>
                    <div style={{ fontSize: 12, color: 'var(--crm-text-muted)' }}>
                      {c.externalAccountId ? `${c.externalAccountId} · ` : ''}last event {ago(c.lastEventAt)}
                      {c.lastError ? <span style={{ color: '#dc2626' }}> · {c.lastError}</span> : null}
                    </div>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: STATUS_TONE[c.status] }}>{STATUS_LABEL[c.status]}</span>
                  {!c.derived ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.lastError ? <Button variant="ghost" size="sm" onClick={() => act(c.id, { action: 'clear_error' }, 'Cleared.')}>Clear error</Button> : null}
                      <Button variant="ghost" size="sm" onClick={() => act(c.id, { action: 'set_active', enabled: !c.active }, c.active ? 'Disabled.' : 'Enabled.')}>{c.active ? 'Disable' : 'Enable'}</Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>Remove</Button>
                    </div>
                  ) : null}
                  {c.ingestPath ? (
                    <div style={{ flexBasis: '100%', marginTop: 4, fontSize: 12, color: 'var(--crm-text-secondary)', background: 'var(--crm-surface-sunken)', borderRadius: 8, padding: '8px 10px' }}>
                      <div>Paste into Google Ads → Webhook URL: <code style={{ fontSize: 11.5 }}>{typeof window !== 'undefined' ? window.location.origin : ''}{c.ingestPath}</code></div>
                      {c.secretKey ? <div>Key: <code style={{ fontSize: 11.5 }}>{c.secretKey}</code></div> : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {adding ? <AddConnection providers={providers} onClose={() => setAdding(false)} onDone={() => { setAdding(false); setToast('Connection added.'); load(); }} /> : null}
      {toast ? <div role="status" onAnimationEnd={() => setToast(null)} style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 80, background: 'var(--crm-brand-700)', color: '#fff', fontWeight: 600, fontSize: 13.5, padding: '11px 18px', borderRadius: 10 }}>{toast}</div> : null}
    </div>
  );
}

function AddConnection({ providers, onClose, onDone }: { providers: Provider[]; onClose: () => void; onDone: () => void }) {
  const [provider, setProvider] = useState(providers[0]?.provider ?? 'website_form');
  const [displayName, setDisplayName] = useState('');
  const [externalAccountId, setExternalAccountId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/crm/connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ provider, displayName: displayName.trim(), externalAccountId: externalAccountId.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? 'Could not add the connection.'); return; }
      onDone();
    } finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(460px,100%)', background: 'var(--crm-surface-raised)', borderRadius: 16, padding: 24 }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, border: 0, background: 'none', cursor: 'pointer', color: 'var(--crm-text-secondary)' }}><X size={18} /></button>
        <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Add a lead source</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Select label="Source type" options={providers.map((p) => ({ value: p.provider, label: p.label }))} value={provider} onChange={(e) => setProvider(e.target.value)} />
          <Input label="Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Aurelia Instagram, Dealer landing page" />
          <Input label="Account / page / form ID (optional)" value={externalAccountId} onChange={(e) => setExternalAccountId(e.target.value)} placeholder="Provider's own identifier" />
          <p style={{ fontSize: 12, color: 'var(--crm-text-muted)', margin: 0 }}>You can add several of each — multiple WhatsApp numbers, Facebook Pages or Instagram accounts are all supported.</p>
          {err ? <p style={{ color: 'var(--crm-danger)', fontSize: 13, margin: 0 }}>{err}</p> : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add connection'}</Button>
        </div>
      </div>
    </div>
  );
}
