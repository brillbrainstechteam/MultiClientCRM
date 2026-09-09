import { useMemo, type ReactNode } from 'react';
import { Contact as ContactIcon, MessageSquare, Phone, UserCheck, Users, Send } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { KpiCard, Badge, type BadgeTone } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import { contacts, users, type Contact } from '@crm/mock-data';
import { allConversations, conversationMessages } from '@crm/modules/inbox/inbox-mock-data';

/**
 * Reports overview — real aggregates computed from the tenant's live records
 * (contacts, conversations, team, numbers). No fabricated data: every figure is
 * derived from what's actually in the workspace. Richer reports (agent
 * performance, funnels over time) follow once activity tracking + product
 * decisions land — see docs/OPEN_ITEMS.md.
 */
export default function ReportsPage() {
  const { availableWhatsAppNumbers } = useWorkspace();

  const stats = useMemo(() => computeStats(contacts, allConversations, conversationMessages), []);
  const connectedNumbers = availableWhatsAppNumbers.filter((n) => n.connectionStatus === 'connected').length;

  return (
    <div style={sx.page}>
      <PageHeader
        title="Reports"
        description="A live snapshot of your workspace — contacts, pipeline, conversations and team, computed from real records."
      />

      <div style={sx.kpiRow}>
        <KpiCard label="Total contacts" value={stats.total} icon={<ContactIcon size={16} />} emphasis="gold" meta={`${stats.b2b} B2B · ${stats.b2c} B2C`} />
        <KpiCard label="Customers" value={stats.customers} icon={<UserCheck size={16} />} meta={`${stats.prospects} prospects`} />
        <KpiCard label="Conversations" value={stats.conversations} icon={<MessageSquare size={16} />} meta={`${stats.messages} messages`} />
        <KpiCard label="Messages sent" value={stats.outbound} icon={<Send size={16} />} meta={`${stats.inbound} received`} />
        <KpiCard label="Team members" value={users.length} icon={<Users size={16} />} />
        <KpiCard label="Connected numbers" value={connectedNumbers} icon={<Phone size={16} />} meta={`${availableWhatsAppNumbers.length} total`} />
      </div>

      <div style={sx.grid}>
        <Panel title="Needs attention">
          <div style={sx.bars}>
            <div style={sx.attnRow}>
              <span style={sx.barLabel}>Stale prospects</span>
              <Badge tone={stats.staleProspects ? 'warning' : 'neutral'}>{stats.staleProspects}</Badge>
              <span style={sx.pct}>no activity &gt; {STALE_PROSPECT_DAYS}d</span>
            </div>
            <div style={sx.attnRow}>
              <span style={sx.barLabel}>Dormant customers</span>
              <Badge tone={stats.dormantCustomers ? 'danger' : 'neutral'}>{stats.dormantCustomers}</Badge>
              <span style={sx.pct}>no activity &gt; {DORMANT_CUSTOMER_DAYS}d</span>
            </div>
          </div>
        </Panel>

        <Panel title="Customer type">
          <BarList rows={[
            { label: 'B2B', value: stats.b2b, tone: 'brand' },
            { label: 'B2C', value: stats.b2c, tone: 'info' },
          ]} total={stats.total} />
        </Panel>

        <Panel title="Lifecycle">
          <BarList rows={[
            { label: 'Prospects', value: stats.prospects, tone: 'warning' },
            { label: 'Customers', value: stats.customers, tone: 'success' },
          ]} total={stats.total} />
        </Panel>

        <Panel title="Lead status">
          <BarList rows={stats.leadRows} total={stats.total} />
        </Panel>

        <Panel title="Consent">
          <BarList rows={[
            { label: 'Opted in', value: stats.consent['opted-in'] ?? 0, tone: 'success' },
            { label: 'Pending', value: stats.consent['pending'] ?? 0, tone: 'warning' },
            { label: 'Opted out', value: stats.consent['opted-out'] ?? 0, tone: 'danger' },
          ]} total={stats.total} />
        </Panel>

        <Panel title="Top sources">
          {stats.topSources.length ? (
            <BarList rows={stats.topSources.map((s) => ({ label: s.label, value: s.value, tone: 'neutral' as BadgeTone }))} total={stats.total} />
          ) : <Empty />}
        </Panel>

        <Panel title="Sales tier">
          <BarList rows={stats.tierRows} total={stats.total} />
        </Panel>
      </div>
    </div>
  );
}

// ---- Aggregation -----------------------------------------------------------

// Decision #3: prospect goes stale after 30 days idle; customer dormant after 90.
// Workspace default — will become configurable per workspace (see docs/OPEN_ITEMS.md).
const STALE_PROSPECT_DAYS = 30;
const DORMANT_CUSTOMER_DAYS = 90;

const LEAD_LABELS: Record<string, string> = {
  new: 'New', assigned: 'Assigned', attempted: 'Attempted', connected: 'Connected',
  engaged: 'Engaged', enquiry_generated: 'Enquiry generated', not_interested: 'Not interested', dormant: 'Dormant',
};
const LEAD_ORDER = ['new', 'assigned', 'attempted', 'connected', 'engaged', 'enquiry_generated', 'not_interested', 'dormant'];
const TIER_LABELS: Record<string, string> = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', standard: 'Standard' };

function computeStats(
  cs: Contact[],
  convs: typeof allConversations,
  msgs: typeof conversationMessages,
) {
  const count = <T,>(items: T[], key: (t: T) => string | undefined | null) => {
    const m: Record<string, number> = {};
    for (const it of items) { const k = key(it); if (k) m[k] = (m[k] ?? 0) + 1; }
    return m;
  };

  const byType = count(cs, (c) => c.customerType);
  const byLifecycle = count(cs, (c) => c.lifecycleStage);
  const byLead = count(cs, (c) => c.leadStatus);
  const consent = count(cs, (c) => c.consent);
  const bySource = count(cs, (c) => c.source);
  const byTier = count(cs, (c) => c.salesTier);

  let inbound = 0, outbound = 0, messages = 0;
  for (const list of Object.values(msgs)) {
    for (const m of list) { messages++; if (m.direction === 'inbound') inbound++; else outbound++; }
  }

  // Dormancy (decision #3): stale prospects vs dormant customers, by idle days.
  const now = Date.now();
  let staleProspects = 0, dormantCustomers = 0;
  for (const c of cs) {
    const days = (now - new Date(c.lastActivityAt).getTime()) / 86_400_000;
    if (c.lifecycleStage === 'customer') { if (days > DORMANT_CUSTOMER_DAYS) dormantCustomers++; }
    else if (days > STALE_PROSPECT_DAYS) staleProspects++;
  }

  const topSources = Object.entries(bySource)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const leadRows = LEAD_ORDER.filter((k) => byLead[k]).map((k) => ({ label: LEAD_LABELS[k] ?? k, value: byLead[k], tone: 'neutral' as BadgeTone }));
  const tierRows = ['platinum', 'gold', 'silver', 'standard'].filter((k) => byTier[k]).map((k) => ({ label: TIER_LABELS[k] ?? k, value: byTier[k], tone: 'gold' as BadgeTone }));

  return {
    total: cs.length,
    b2b: byType['b2b'] ?? 0,
    b2c: byType['b2c'] ?? 0,
    prospects: byLifecycle['prospect'] ?? 0,
    customers: byLifecycle['customer'] ?? 0,
    consent,
    topSources,
    leadRows,
    tierRows,
    conversations: convs.length,
    messages,
    inbound,
    outbound,
    staleProspects,
    dormantCustomers,
  };
}

// ---- Presentational bits ---------------------------------------------------

interface BarRow { label: string; value: number; tone: BadgeTone }

function BarList({ rows, total }: { rows: BarRow[]; total: number }) {
  if (rows.length === 0) return <Empty />;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={sx.bars}>
      {rows.map((r) => (
        <div key={r.label} style={sx.barRow}>
          <span style={sx.barLabel}>{r.label}</span>
          <div style={sx.barTrack}>
            <div style={{ ...sx.barFill, width: `${Math.round((r.value / max) * 100)}%` }} />
          </div>
          <span style={sx.barValue}>
            <Badge tone={r.tone}>{r.value}</Badge>
            {total > 0 ? <span style={sx.pct}>{Math.round((r.value / total) * 100)}%</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={sx.panel}>
      <h2 style={sx.panelTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p style={sx.empty}>No data yet.</p>;
}

const sx: Record<string, React.CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, padding: 24 },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 },
  panel: { background: 'var(--crm-surface, #fff)', border: '1px solid var(--crm-border, #e5e9ee)', borderRadius: 12, padding: 16 },
  panelTitle: { fontSize: 13, fontWeight: 600, color: 'var(--crm-text-muted, #6b7a88)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 0.4 },
  bars: { display: 'flex', flexDirection: 'column', gap: 10 },
  barRow: { display: 'grid', gridTemplateColumns: '110px 1fr auto', alignItems: 'center', gap: 10 },
  attnRow: { display: 'flex', alignItems: 'center', gap: 10 },
  barLabel: { fontSize: 13, color: 'var(--crm-text-primary, #2b3948)' },
  barTrack: { height: 8, background: 'var(--crm-border, #eef1f4)', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', background: 'var(--crm-text-brand, #2f6bff)', borderRadius: 999 },
  barValue: { display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 72, justifyContent: 'flex-end' },
  pct: { fontSize: 12, color: 'var(--crm-text-muted, #6b7a88)' },
  empty: { fontSize: 13, color: 'var(--crm-text-muted, #6b7a88)', margin: 0 },
};
