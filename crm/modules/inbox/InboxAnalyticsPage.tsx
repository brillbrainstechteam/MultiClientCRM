/**
 * INB-S20 — Inbox Analytics
 * INB-S21 — Export
 *
 * URL: /inbox/analytics
 * State params: ?dateRange=7d|14d|30d&team=all|team_id&agent=all|user_id
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, TrendingUp, Clock, CheckCircle2, Users, Bot, MessageSquare, ExternalLink } from 'lucide-react';
import { Button } from '@crm/design-system';
import { useWorkspace } from '@crm/app/workspace-context';
import { teams, findUser } from '@crm/mock-data';
import { inboxAnalytics } from './inbox-mock-data';
import { inboxPolicyFor } from './inbox-role-policy';
import { ExportModal } from './components/ExportModal';

// ---- Helpers ----------------------------------------------------------------

function fmtMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function pct(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

// ---- Sub-components --------------------------------------------------------

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--crm-bg-primary)', border: '1px solid var(--crm-border)', borderRadius: 10,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--crm-text-muted)', fontSize: 12 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--crm-text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>{sub}</div>}
    </div>
  );
}

function BarChart({ data }: { data: { date: string; open: number; resolved: number }[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.open, d.resolved])) || 1;
  const BAR_MAX_H = 100;
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minWidth: 480, padding: '0 8px', height: BAR_MAX_H + 40 }}>
        {data.map((d) => {
          const openH = Math.round((d.open / maxVal) * BAR_MAX_H);
          const resolvedH = Math.round((d.resolved / maxVal) * BAR_MAX_H);
          const dayLabel = new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          return (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                <div style={{ width: 10, height: openH, background: 'var(--crm-text-brand)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} title={`Open: ${d.open}`} />
                <div style={{ width: 10, height: resolvedH, background: 'var(--crm-success)', borderRadius: '2px 2px 0 0' }} title={`Resolved: ${d.resolved}`} />
              </div>
              <div style={{ fontSize: 9, color: 'var(--crm-text-muted)', transform: 'rotate(-40deg)', transformOrigin: 'top right', whiteSpace: 'nowrap', marginTop: 8 }}>
                {dayLabel}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 4, paddingLeft: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--crm-text-muted)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--crm-text-brand)', opacity: 0.8 }} /> Open
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--crm-text-muted)' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--crm-success)' }} /> Resolved
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--crm-text-primary)', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
      {children}
    </h2>
  );
}

// ---- Page ------------------------------------------------------------------

export default function InboxAnalyticsPage() {
  const { role } = useWorkspace();
  const navigate = useNavigate();
  const policy = inboxPolicyFor(role);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d'>('30d');
  const [teamFilter, setTeamFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [showExport, setShowExport] = useState(false);

  const analytics = inboxAnalytics;
  const { summary, agentRows, conversationsByDay } = analytics;

  // Filter conversation chart by date range
  const chartData = dateRange === '30d'
    ? conversationsByDay
    : dateRange === '14d'
    ? conversationsByDay.slice(-14)
    : conversationsByDay.slice(-7);

  // Filter agent rows
  const filteredAgentRows = agentFilter !== 'all'
    ? agentRows.filter((r) => r.userId === agentFilter)
    : teamFilter !== 'all'
    ? agentRows.filter((r) => {
        const user = findUser(r.userId);
        return user?.teamId === teamFilter;
      })
    : agentRows;

  const canSeeAgentPerf = policy.canSeeAgentPerformance;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--crm-bg-secondary)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--crm-bg-primary)', borderBottom: '1px solid var(--crm-border)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate('/inbox')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--crm-text-secondary)', fontSize: 13 }}
        >
          <ArrowLeft size={14} /> Back to Inbox
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--crm-text-primary)' }}>Inbox Analytics</span>
        <div style={{ flex: 1 }} />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/reports?sourceModule=inbox&returnTo=/inbox/analytics')}
        >
          <ExternalLink size={13} style={{ marginRight: 4 }} /> View in Reports
        </Button>
        {policy.canExport && (
          <Button variant="secondary" size="sm" onClick={() => setShowExport(true)}>
            <Download size={13} style={{ marginRight: 4 }} /> Export
          </Button>
        )}
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--crm-bg-primary)', borderBottom: '1px solid var(--crm-border)', padding: '8px 24px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['7d', '14d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              style={{
                padding: '3px 12px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                border: '1px solid var(--crm-border)',
                background: dateRange === r ? 'var(--crm-text-brand)' : 'transparent',
                color: dateRange === r ? 'var(--crm-on-dark)' : 'var(--crm-text-secondary)',
                fontWeight: dateRange === r ? 600 : 400,
              }}
            >
              {r === '7d' ? 'Last 7 days' : r === '14d' ? 'Last 14 days' : 'Last 30 days'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>Team</label>
          <select
            value={teamFilter}
            onChange={(e) => { setTeamFilter(e.target.value); setAgentFilter('all'); }}
            style={{ padding: '3px 8px', border: '1px solid var(--crm-border)', borderRadius: 6, fontSize: 12, background: 'var(--crm-bg-primary)', color: 'var(--crm-text-primary)' }}
          >
            <option value="all">All teams</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {canSeeAgentPerf && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>Agent</label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              style={{ padding: '3px 8px', border: '1px solid var(--crm-border)', borderRadius: 6, fontSize: 12, background: 'var(--crm-bg-primary)', color: 'var(--crm-text-primary)' }}
            >
              <option value="all">All agents</option>
              {agentRows.map((r) => {
                const u = findUser(r.userId);
                return u ? <option key={r.userId} value={r.userId}>{u.name}</option> : null;
              })}
            </select>
          </div>
        )}
        <span style={{ fontSize: 11, color: 'var(--crm-text-muted)', marginLeft: 'auto' }}>
          {analytics.period.from.slice(0, 10)} → {analytics.period.to.slice(0, 10)}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI grid */}
        <div>
          <SectionTitle>Summary</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 10 }}>
            <KpiCard icon={<MessageSquare size={13} />} label="Total conversations" value={summary.totalConversations.toLocaleString()} />
            <KpiCard icon={<CheckCircle2 size={13} />} label="Resolved" value={summary.resolved.toLocaleString()} sub={pct(summary.resolved, summary.totalConversations) + ' resolution rate'} />
            <KpiCard icon={<TrendingUp size={13} />} label="Responded" value={summary.responded.toLocaleString()} sub={pct(summary.responded, summary.totalConversations)} />
            <KpiCard icon={<Clock size={13} />} label="Avg first response" value={fmtMinutes(summary.avgFirstResponseMinutes)} sub="First human response" />
            <KpiCard icon={<Clock size={13} />} label="Avg resolution" value={fmtMinutes(summary.avgResolutionMinutes)} />
            <KpiCard icon={<Bot size={13} />} label="Auto-resolved" value={summary.resolvedWithoutHumanResponse.toLocaleString()} sub={pct(summary.resolvedWithoutHumanResponse, summary.resolved) + ' of resolved'} />
            <KpiCard icon={<Bot size={13} />} label="Automation usage" value={`${summary.automationUsagePercent}%`} sub="Of conversations touched by automation" />
            <KpiCard icon={<MessageSquare size={13} />} label="Still unresolved" value={summary.unresolved.toLocaleString()} />
          </div>
        </div>

        {/* Conversations by day */}
        <div style={{ background: 'var(--crm-bg-primary)', border: '1px solid var(--crm-border)', borderRadius: 10, padding: '16px 18px' }}>
          <SectionTitle>Conversations over time</SectionTitle>
          <div style={{ marginTop: 14 }}>
            <BarChart data={chartData} />
          </div>
        </div>

        {/* Agent performance */}
        {canSeeAgentPerf && (
          <div style={{ background: 'var(--crm-bg-primary)', border: '1px solid var(--crm-border)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <SectionTitle>Agent Performance</SectionTitle>
              <Users size={13} style={{ color: 'var(--crm-text-muted)' }} />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--crm-border)' }}>
                    {['Agent', 'Assigned', 'Resolved', 'Resolution rate', 'Avg first response', 'Avg resolution'].map((col) => (
                      <th key={col} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--crm-text-muted)', whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAgentRows.map((row, i) => {
                    const user = findUser(row.userId);
                    return (
                      <tr key={row.userId} style={{ borderBottom: i < filteredAgentRows.length - 1 ? '1px solid var(--crm-border-subtle)' : 'none' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--crm-text-primary)' }}>{user?.name ?? row.userId}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--crm-text-secondary)' }}>{row.assignedCount}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--crm-text-secondary)' }}>{row.resolvedCount}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--crm-text-secondary)' }}>{pct(row.resolvedCount, row.assignedCount)}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--crm-text-secondary)' }}>{fmtMinutes(row.avgFirstResponseMinutes)}</td>
                        <td style={{ padding: '9px 12px', color: 'var(--crm-text-secondary)' }}>{fmtMinutes(row.avgResolutionMinutes)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAgentRows.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--crm-text-muted)', fontSize: 12 }}>
                  No agent data for this selection.
                </div>
              )}
            </div>
          </div>
        )}

        {!canSeeAgentPerf && (
          <div style={{ background: 'var(--crm-bg-secondary)', border: '1px solid var(--crm-border)', borderRadius: 10, padding: '20px', textAlign: 'center', color: 'var(--crm-text-muted)', fontSize: 12 }}>
            <Users size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
            Agent performance data requires Manager or Owner role.
          </div>
        )}
      </div>

      <ExportModal
        open={showExport}
        canExport={policy.canExport}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
}
