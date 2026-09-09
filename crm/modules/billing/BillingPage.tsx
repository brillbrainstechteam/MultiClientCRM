import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Badge, Banner, Button, Toast } from '@crm/design-system';

/**
 * Billing — real plan management. Shows the tenant's current plan (from the DB)
 * and the tier line-up; switching a plan persists to the tenant (owner-only).
 * Metered charges (WhatsApp/telephony/AI minutes) are billed separately and
 * payment collection is a later phase — so no mock wallet/transactions here.
 */

type PlanKey = 'trial' | 'starter' | 'growth' | 'advanced';

const PLANS: { key: PlanKey; name: string; blurb: string; features: string[] }[] = [
  { key: 'trial', name: 'Trial', blurb: '14 days', features: ['1 WhatsApp number', '2 users', 'Shared inbox', 'Contact import + Google sync', 'Test campaigns'] },
  { key: 'starter', name: 'Starter', blurb: 'For small teams', features: ['1 number', '5 users', '5 campaigns/month', 'Basic automation', 'Prospecting (limited)'] },
  { key: 'growth', name: 'Growth', blurb: 'Scaling businesses', features: ['3 numbers', '15 users', '25 campaigns/month', 'Advanced automation', 'Calling + recording', 'Multi-branch', 'API/webhooks (limited)'] },
  { key: 'advanced', name: 'Advanced', blurb: 'Custom scale', features: ['10+ numbers', '50+ users', 'Unlimited campaigns*', 'AI voice agents (add-on)', 'Custom roles', 'Full API/webhooks'] },
];

export default function BillingPage() {
  const [plan, setPlan] = useState<PlanKey | null>(null);
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/settings/profile', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setPlan((d?.plan as PlanKey) ?? 'trial')).catch(() => setPlan('trial'));
  }, []);

  const switchTo = async (key: PlanKey) => {
    setBusy(key);
    try {
      const res = await fetch('/api/crm/settings/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ plan: key }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setToast(String(d.error ?? 'Could not change plan.')); return; }
      setPlan(key); setToast(`Plan changed to ${key}.`);
    } finally { setBusy(null); }
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <PageHeader title="Plan & billing" description="Your subscription tier. Messaging, telephony and AI usage are metered separately." />
      <Banner tone="info" title="Usage-based charges are separate"
        description="WhatsApp conversation/template fees, telephony minutes and AI-voice minutes are metered and billed on top of the plan. Payment collection is being integrated." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
        {PLANS.map((p) => {
          const current = plan === p.key;
          return (
            <section key={p.key} style={{ ...card, ...(current ? cardCurrent : {}) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--crm-text-title, #1b2733)' }}>{p.name}</h2>
                {current ? <Badge tone="success">Current</Badge> : null}
              </div>
              <p style={{ margin: '2px 0 8px', fontSize: 13, color: 'var(--crm-text-muted, #6b7a88)' }}>{p.blurb}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {p.features.map((fte) => (
                  <li key={fte} style={{ display: 'flex', gap: 6, fontSize: 13, color: 'var(--crm-text-primary, #2b3948)' }}>
                    <Check size={15} style={{ color: 'var(--crm-text-brand, #2f6bff)', flexShrink: 0, marginTop: 1 }} /> {fte}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 12 }}>
                {current
                  ? <Button variant="secondary" disabled>Current plan</Button>
                  : <Button variant="primary" disabled={busy !== null} onClick={() => switchTo(p.key)}>{busy === p.key ? 'Switching…' : `Switch to ${p.name}`}</Button>}
              </div>
            </section>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: 'var(--crm-text-muted, #6b7a88)', margin: 0 }}>*Subject to WhatsApp/provider messaging limits and number quality.</p>
    </div>
  );
}

const card: React.CSSProperties = { display: 'flex', flexDirection: 'column', padding: 18, borderRadius: 12, background: 'var(--crm-surface, #fff)', border: '1px solid var(--crm-border, #e5e9ee)' };
const cardCurrent: React.CSSProperties = { borderColor: 'var(--crm-text-brand, #2f6bff)', boxShadow: '0 0 0 1px var(--crm-text-brand, #2f6bff)' };
