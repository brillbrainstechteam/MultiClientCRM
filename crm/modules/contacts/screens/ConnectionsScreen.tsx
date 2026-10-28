import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, RefreshCw, Facebook, MessageCircle, Globe, Megaphone, Youtube, FileText, ChevronRight } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button } from '@crm/design-system';

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
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [conns, setConns] = useState<Conn[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/connections', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => { setConns(d.connections ?? []); setSummary(d.summary ?? null); })
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

  // Webhook sources (no OAuth) — mint a URL + key to paste into the provider.
  const setupWebhook = async (provider: string, displayName: string, okMsg: string) => {
    const r = await fetch('/api/crm/connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ provider, displayName }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setToast(d.error ?? 'Could not set up the source.'); return; }
    setAdding(false); setToast(okMsg); load();
  };
  const setupGoogleAds = () => setupWebhook('google_ads', 'Google Ads lead forms', 'Google Ads source created — copy the webhook URL + key below.');
  const setupYouTube = () => setupWebhook('google_ads', 'YouTube (Google Ads lead forms)', 'YouTube source created — use it on your YouTube Google Ads lead forms.');
  const setupWebsite = () => setupWebhook('website', 'Website / ecommerce', 'Website source created — copy the webhook URL + key below.');

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
        actions={<Button variant="primary" iconLeft={<Plus />} onClick={() => setAdding(true)}>Add lead source</Button>}
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

      {adding ? (
        <ConnectCatalog
          onClose={() => setAdding(false)}
          onConnectMeta={() => { setAdding(false); connectMeta(); }}
          onSetupGoogle={setupGoogleAds}
          onSetupYouTube={setupYouTube}
          onSetupWebsite={setupWebsite}
          onWhatsApp={() => { setAdding(false); navigate(scopedHref('/settings/whatsapp')); }}
          onHostedForm={() => { setAdding(false); setToast('Open "Share form" on Lead Intake to get your hosted form link.'); navigate(scopedHref('/leads/intake')); }}
        />
      ) : null}
      {toast ? <div role="status" onAnimationEnd={() => setToast(null)} style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 80, background: 'var(--crm-brand-700)', color: '#fff', fontWeight: 600, fontSize: 13.5, padding: '11px 18px', borderRadius: 10 }}>{toast}</div> : null}
    </div>
  );
}

/**
 * Connect catalog — each source routes to the RIGHT flow: Meta/WhatsApp open the
 * provider's own login/consent (no typing IDs); Google Ads / website use a
 * webhook. Mirrors how Jwero/Zithara connect sources.
 */
function ConnectCatalog({ onClose, onConnectMeta, onSetupGoogle, onSetupYouTube, onSetupWebsite, onWhatsApp, onHostedForm }: {
  onClose: () => void; onConnectMeta: () => void; onSetupGoogle: () => void; onSetupYouTube: () => void; onSetupWebsite: () => void; onWhatsApp: () => void; onHostedForm: () => void;
}) {
  const card = (icon: ReactNode, title: string, desc: string, cta: string, onClick: () => void, tone = 'var(--crm-brand-700)') => (
    <button onClick={onClick} style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 16px', border: '1px solid var(--crm-border-subtle)', borderRadius: 12, background: 'var(--crm-surface-raised)', cursor: 'pointer' }}>
      <span style={{ flex: '0 0 auto', width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--crm-surface-sunken)', color: tone }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--crm-text-muted)' }}>{desc}</span>
      </span>
      <span style={{ flex: '0 0 auto', fontSize: 12.5, fontWeight: 600, color: tone, display: 'inline-flex', alignItems: 'center', gap: 2 }}>{cta} <ChevronRight size={15} /></span>
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(15,23,42,.5)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(540px,100%)', background: 'var(--crm-surface-raised)', borderRadius: 16, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, border: 0, background: 'none', cursor: 'pointer', color: 'var(--crm-text-secondary)' }}><X size={18} /></button>
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>Add a lead source</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--crm-text-secondary)' }}>Connect a channel with its own login — we discover your Pages, accounts and forms automatically. Every lead then flows into Lead Intake.</p>

        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--crm-text-muted)', margin: '4px 0 8px' }}>Connect with your account</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {card(<Facebook size={20} />, 'Facebook & Instagram', 'Pages, Instagram, Lead Ads and Messenger — sign in with Facebook.', 'Connect', onConnectMeta, '#1877f2')}
          {card(<MessageCircle size={20} />, 'WhatsApp', 'Add a WhatsApp Business number via Embedded Signup.', 'Connect', onWhatsApp, '#25d366')}
        </div>

        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--crm-text-muted)', margin: '18px 0 8px' }}>Ads &amp; forms (webhook — no login)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {card(<Megaphone size={20} />, 'Google Ads lead forms', 'Search & Display lead form extensions — paste a webhook URL + key into Google Ads.', 'Set up', onSetupGoogle, '#ea4335')}
          {card(<Youtube size={20} />, 'YouTube', 'YouTube ad leads arrive through Google Ads lead forms on YouTube campaigns.', 'Set up', onSetupYouTube, '#ff0000')}
        </div>

        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--crm-text-muted)', margin: '18px 0 8px' }}>Website &amp; ecommerce</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {card(<Globe size={20} />, 'Website / ecommerce', 'Any site — custom, WordPress, Shopify or WooCommerce. POST leads to a webhook URL + key.', 'Set up', onSetupWebsite, '#0891b2')}
          {card(<FileText size={20} />, 'Hosted enquiry form', 'Our shareable voice-enabled form — no website needed.', 'Get link', onHostedForm, '#7c3aed')}
        </div>

        <p style={{ fontSize: 12, color: 'var(--crm-text-muted)', margin: '18px 0 0' }}>Exhibitions, telecalling lists and referrals come in through Import or are logged as you capture them — they don’t need a connection here.</p>
      </div>
    </div>
  );
}
