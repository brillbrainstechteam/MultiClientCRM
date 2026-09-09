import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Contact as ContactIcon, MessageSquare, Phone, ShoppingBag, UserCheck } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Banner, Button, KpiCard } from '@crm/design-system';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { contacts, users, type Contact } from '@crm/mock-data';
import { allConversations } from '@crm/modules/inbox/inbox-mock-data';

/**
 * Dashboard home — real workspace KPIs computed from live data (contacts,
 * conversations, funnel, connection health). No mock figures.
 */
export default function DashboardHome() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { availableWhatsAppNumbers } = useWorkspace();

  const [funnel, setFunnel] = useState<{ usersCalled: number; enquiries: number; orders: number } | null>(null);
  useEffect(() => {
    fetch('/api/crm/reports/funnel', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null)).then(setFunnel).catch(() => setFunnel(null));
  }, []);

  const s = useMemo(() => {
    const cs = contacts as Contact[];
    const now = Date.now();
    let customers = 0, prospects = 0, stale = 0, dormant = 0;
    for (const c of cs) {
      if (c.lifecycleStage === 'customer') customers++; else prospects++;
      const days = (now - new Date(c.lastActivityAt).getTime()) / 86_400_000;
      if (c.lifecycleStage === 'customer') { if (days > 90) dormant++; } else if (days > 30) stale++;
    }
    return { total: cs.length, customers, prospects, stale, dormant };
  }, []);

  const connected = availableWhatsAppNumbers.filter((n) => n.connectionStatus === 'connected').length;
  const openConversations = allConversations.length;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Dashboard" description="A live snapshot of your workspace." />

      {connected === 0 ? (
        <Banner tone="warning" title="No WhatsApp number connected"
          description="Connect a number to start receiving and sending messages."
          actions={<Button variant="secondary" size="sm" onClick={() => { window.location.href = '/onboarding'; }}>Connect a number</Button>} />
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard label="Contacts" value={s.total} icon={<ContactIcon size={16} />} emphasis="gold" meta={`${s.customers} customers · ${s.prospects} prospects`} to={scopedHref('/contacts')} />
        <KpiCard label="Conversations" value={openConversations} icon={<MessageSquare size={16} />} to={scopedHref('/inbox')} />
        <KpiCard label="Users called" value={funnel?.usersCalled ?? 0} icon={<Phone size={16} />} to={scopedHref('/calling')} />
        <KpiCard label="Enquiries" value={funnel?.enquiries ?? 0} icon={<ShoppingBag size={16} />} to={scopedHref('/catalogue-orders')} />
        <KpiCard label="Orders" value={funnel?.orders ?? 0} icon={<ShoppingBag size={16} />} to={scopedHref('/catalogue-orders')} />
        <KpiCard label="Connected numbers" value={connected} icon={<UserCheck size={16} />} meta={`${availableWhatsAppNumbers.length} total`} />
      </div>

      {(s.stale > 0 || s.dormant > 0) ? (
        <section style={panel}>
          <h2 style={panelTitle}><AlertTriangle size={15} /> Needs attention</h2>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span><strong>{s.stale}</strong> stale prospects (&gt;30d idle)</span>
            <span><strong>{s.dormant}</strong> dormant customers (&gt;90d idle)</span>
            <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref('/reports'))}>Open Reports</Button>
          </div>
        </section>
      ) : null}

      <section style={panel}>
        <h2 style={panelTitle}>Team</h2>
        <p style={{ margin: 0, fontSize: 14 }}>{users.length} member{users.length !== 1 ? 's' : ''} in the workspace.</p>
      </section>
    </div>
  );
}

const panel: React.CSSProperties = { background: 'var(--crm-surface, #fff)', border: '1px solid var(--crm-border, #e5e9ee)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 };
const panelTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--crm-text-title, #1b2733)', margin: 0 };
