import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
  Building2, Contact as ContactIcon, History, KeyRound, MessageSquare, Plug,
  Route as RouteIcon, ShieldCheck, Users, ExternalLink, ArrowLeft,
} from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Button, Input, Select, StatusBadge, Toast } from '@crm/design-system';
import { useScopedHref } from '@crm/app/use-scoped-href';

/**
 * Settings — the workspace's real configuration hub. The hub links to every
 * settings area (some live in their own modules); Business profile and
 * Integrations are backed by real APIs here. Role-gated writes are enforced
 * server-side.
 */
export default function SettingsPage() {
  return (
    <Routes>
      <Route index element={<SettingsHub />} />
      <Route path="profile" element={<BusinessProfileScreen />} />
      <Route path="integrations" element={<IntegrationsScreen />} />
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  );
}

// ---- Hub --------------------------------------------------------------------

interface SectionCard { icon: ReactNode; title: string; desc: string; to: string }

function SettingsHub() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const sections: SectionCard[] = [
    { icon: <Building2 />, title: 'Business profile', desc: 'Name, business model, GST/CIN, entity type.', to: '/settings/profile' },
    { icon: <MessageSquare />, title: 'WhatsApp numbers', desc: 'Connected numbers, status and details.', to: '/settings/whatsapp' },
    { icon: <Users />, title: 'Team & roles', desc: 'Members, roles and permissions.', to: '/settings/team' },
    { icon: <RouteIcon />, title: 'Routing & assignment', desc: 'How conversations are assigned.', to: '/settings/routing' },
    { icon: <ContactIcon />, title: 'Contact settings', desc: 'Fields, tags and contact rules.', to: '/settings/contacts' },
    { icon: <Plug />, title: 'Integrations', desc: 'Google, telephony and other connections.', to: '/settings/integrations' },
    { icon: <KeyRound />, title: 'Plan & billing', desc: 'Your subscription and usage.', to: '/billing' },
    { icon: <History />, title: 'Import history', desc: 'Past imports and activity.', to: '/settings/history' },
  ];

  return (
    <div style={sx.page}>
      <PageHeader title="Settings" description="Configure your workspace — business profile, numbers, team, integrations and more." />
      <div style={sx.grid}>
        {sections.map((s) => (
          <button key={s.to} style={sx.card} onClick={() => navigate(scopedHref(s.to))}>
            <span style={sx.cardIcon} aria-hidden="true">{s.icon}</span>
            <span style={sx.cardTitle}>{s.title}</span>
            <span style={sx.cardDesc}>{s.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BackLink() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  return (
    <button style={sx.back} onClick={() => navigate(scopedHref('/settings'))}>
      <ArrowLeft size={14} /> All settings
    </button>
  );
}

// ---- Business profile -------------------------------------------------------

interface Profile {
  businessName: string; businessPhone: string | null; businessModel: string;
  gstNumber: string | null; cin: string | null; entityType: string; plan: string;
}

function BusinessProfileScreen() {
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/settings/profile', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null)).then(setP).catch(() => setP(null));
  }, []);

  const set = (k: keyof Profile, v: string) => setP((prev) => (prev ? { ...prev, [k]: v } : prev));

  const save = async () => {
    if (!p) return;
    setSaving(true);
    const res = await fetch('/api/crm/settings/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify(p),
    });
    const d = await res.json().catch(() => ({}));
    setToast(res.ok ? 'Business profile saved.' : String(d.error ?? 'Could not save.'));
    setSaving(false);
  };

  return (
    <div style={sx.page}>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <BackLink />
      <PageHeader title="Business profile" description="How your business appears across the workspace." />
      {!p ? <p style={sx.muted}>Loading…</p> : (
        <div style={sx.form}>
          <Input label="Business name" value={p.businessName} onChange={(e) => set('businessName', e.target.value)} />
          <Select label="Business model" value={p.businessModel} onChange={(e) => set('businessModel', e.target.value)}
            options={[{ value: 'b2b', label: 'B2B' }, { value: 'b2c', label: 'B2C' }, { value: 'both', label: 'Both' }]} />
          <Select label="Entity type" value={p.entityType} onChange={(e) => set('entityType', e.target.value)}
            options={[
              { value: 'proprietorship', label: 'Proprietorship' }, { value: 'partnership', label: 'Partnership' },
              { value: 'llp', label: 'LLP' }, { value: 'company', label: 'Private Limited' }, { value: 'other', label: 'Other' },
            ]} />
          <Input label="GST number" value={p.gstNumber ?? ''} onChange={(e) => set('gstNumber', e.target.value)} placeholder="Optional" />
          <Input label="CIN" value={p.cin ?? ''} onChange={(e) => set('cin', e.target.value)} placeholder="Optional" />
          <Input label="Business phone" value={p.businessPhone ?? ''} onChange={(e) => set('businessPhone', e.target.value)} placeholder="Optional" />
          <div>
            <Button variant="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
          <p style={sx.muted}>Current plan: <strong>{p.plan}</strong> — manage under Plan &amp; billing.</p>
        </div>
      )}
    </div>
  );
}

// ---- Integrations -----------------------------------------------------------

interface GoogleStatus { configured: boolean; connected: boolean; email: string | null; sheetUrl: string | null }
interface TelephonyStatus { connected: boolean; provider: string | null; status: string }

function IntegrationsScreen() {
  const [google, setGoogle] = useState<GoogleStatus | null>(null);
  const [tel, setTel] = useState<TelephonyStatus | null>(null);

  useEffect(() => {
    fetch('/api/crm/google/status', { credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null).then(setGoogle).catch(() => {});
    fetch('/api/crm/telephony', { credentials: 'same-origin' }).then((r) => r.ok ? r.json() : null).then(setTel).catch(() => {});
  }, []);

  return (
    <div style={sx.page}>
      <BackLink />
      <PageHeader title="Integrations" description="Connect the external services your workspace uses." />

      <div style={sx.rows}>
        <div style={sx.row}>
          <div>
            <p style={sx.rowTitle}><ContactIcon size={16} /> Google Contacts &amp; Sheets</p>
            <p style={sx.muted}>{google?.connected ? `Connected · ${google.email}` : 'Import contacts, push back, and sync to a Sheet.'}</p>
          </div>
          {google?.connected
            ? <StatusBadge tone="success">Connected</StatusBadge>
            : <Button variant="secondary" size="sm" onClick={() => { window.location.href = '/api/auth/google/start'; }}>Connect Google</Button>}
        </div>

        <div style={sx.row}>
          <div>
            <p style={sx.rowTitle}><ShieldCheck size={16} /> Telephony (Calling)</p>
            <p style={sx.muted}>
              {tel?.connected ? `Connected · ${tel.provider}` : 'BYOT — bring your own telephony (Exotel / Knowlarity). Connect once you have provider credentials.'}
            </p>
          </div>
          <StatusBadge tone={tel?.connected ? 'success' : 'neutral'}>{tel?.connected ? 'Connected' : (tel?.status ?? 'Not connected')}</StatusBadge>
        </div>

        <div style={sx.row}>
          <div>
            <p style={sx.rowTitle}><MessageSquare size={16} /> WhatsApp Business</p>
            <p style={sx.muted}>Manage connected numbers under WhatsApp numbers.</p>
          </div>
          <a href="/onboarding" style={sx.link}>Connect a number <ExternalLink size={13} /></a>
        </div>
      </div>
    </div>
  );
}

const sx: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16, padding: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 },
  card: { textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, padding: 18, borderRadius: 12, cursor: 'pointer',
    background: 'var(--crm-surface, #fff)', border: '1px solid var(--crm-border, #e5e9ee)' },
  cardIcon: { color: 'var(--crm-text-brand, #2f6bff)' },
  cardTitle: { fontWeight: 600, color: 'var(--crm-text-title, #1b2733)' },
  cardDesc: { fontSize: 13, color: 'var(--crm-text-muted, #6b7a88)' },
  form: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 },
  rows: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 16, borderRadius: 12,
    background: 'var(--crm-surface, #fff)', border: '1px solid var(--crm-border, #e5e9ee)' },
  rowTitle: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, margin: '0 0 4px', color: 'var(--crm-text-title, #1b2733)' },
  muted: { fontSize: 13, color: 'var(--crm-text-muted, #6b7a88)', margin: 0 },
  back: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--crm-text-brand, #2f6bff)', fontSize: 13, padding: 0, width: 'fit-content' },
  link: { display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--crm-text-brand, #2f6bff)', fontSize: 13, fontWeight: 600, textDecoration: 'none' },
};
