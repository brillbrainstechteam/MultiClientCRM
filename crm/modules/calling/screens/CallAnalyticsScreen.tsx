import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@crm/components';
import { Badge, KpiCard, LoadingSkeleton, type BadgeTone } from '@crm/design-system';

/**
 * Calling analytics — computed from the real call log (/api/crm/calls).
 * No mock: counts, outcomes and reach come straight from logged calls.
 */
interface Call { id: string; mobile: string; direction: string; status: string; durationSec: number | null; createdAt: string }

const OUTCOME_TONE: Record<string, BadgeTone> = { completed: 'success', answered: 'success', no_answer: 'warning', busy: 'warning', failed: 'danger' };

export default function CallAnalyticsScreen() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crm/calls', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { calls: [] })).then((d) => setCalls(d.calls ?? [])).catch(() => setCalls([])).finally(() => setLoading(false));
  }, []);

  const s = useMemo(() => {
    const total = calls.length;
    const reach = new Set(calls.map((c) => c.mobile)).size;
    const connected = calls.filter((c) => c.status === 'completed' || c.status === 'answered').length;
    const totalDur = calls.reduce((a, c) => a + (c.durationSec ?? 0), 0);
    const byOutcome: Record<string, number> = {};
    for (const c of calls) byOutcome[c.status] = (byOutcome[c.status] ?? 0) + 1;
    const week = Date.now() - 7 * 86_400_000;
    const last7 = calls.filter((c) => new Date(c.createdAt).getTime() >= week).length;
    return { total, reach, connected, connectRate: total ? Math.round((connected / total) * 100) : 0, avgDur: total ? Math.round(totalDur / total) : 0, byOutcome, last7 };
  }, [calls]);

  if (loading) return <div style={{ padding: 24 }}><LoadingSkeleton height={80} /></div>;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader title="Call analytics" description="Calling activity and outcomes, from your real call log." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <KpiCard label="Total calls" value={s.total} emphasis="gold" meta={`${s.last7} in last 7 days`} />
        <KpiCard label="People reached" value={s.reach} />
        <KpiCard label="Connect rate" value={`${s.connectRate}%`} meta={`${s.connected} connected`} />
        <KpiCard label="Avg duration" value={`${Math.floor(s.avgDur / 60)}m ${s.avgDur % 60}s`} />
      </div>
      <section style={{ background: 'var(--crm-surface,#fff)', border: '1px solid var(--crm-border,#e5e9ee)', borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--crm-text-muted,#6b7a88)', margin: '0 0 12px' }}>Outcomes</h2>
        {Object.keys(s.byOutcome).length === 0 ? <p style={{ margin: 0, fontSize: 13, color: 'var(--crm-text-muted,#6b7a88)' }}>No calls logged yet.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(s.byOutcome).sort((a, b) => b[1] - a[1]).map(([outcome, n]) => (
              <div key={outcome} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{outcome.replace(/_/g, ' ')}</span>
                <div style={{ height: 8, background: 'var(--crm-border,#eef1f4)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((n / s.total) * 100)}%`, background: 'var(--crm-text-brand,#2f6bff)', borderRadius: 999 }} />
                </div>
                <Badge tone={OUTCOME_TONE[outcome] ?? 'neutral'}>{n}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
