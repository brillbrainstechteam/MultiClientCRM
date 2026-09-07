import { KpiCard } from '@crm/design-system';
import type { BusinessSnapshot } from '@crm/mock-data';

export interface BusinessSnapshotSectionProps {
  snapshot: BusinessSnapshot;
  /** `operational` omits the payments figure for roles without financial visibility. */
  level: 'full' | 'operational';
  periodLabel: string;
}

function delta(value: number): string {
  if (value === 0) return 'No change vs previous period';
  return `${value > 0 ? '+' : ''}${value} vs previous period`;
}

/** DASH-S01 §7 row 5 — Business Snapshot for the selected period. */
export function BusinessSnapshotSection({ snapshot, level, periodLabel }: BusinessSnapshotSectionProps) {
  return (
    <section aria-label="Business snapshot" className="crm-dash-section">
      <div className="crm-dash-section__head">
        <h2 className="crm-dash-section-title">Business snapshot</h2>
        <span className="crm-dash-section__meta">{periodLabel}</span>
      </div>
      <div className="crm-dash-kpi-grid">
        <KpiCard label="New leads" value={snapshot.newLeads} meta={delta(snapshot.newLeadsDelta)} />
        <KpiCard
          label="Open conversations"
          value={snapshot.openConversations}
          meta={delta(snapshot.openConversationsDelta)}
        />
        <KpiCard label="Orders" value={snapshot.orders} meta={delta(snapshot.ordersDelta)} />
        {level === 'full' ? (
          <KpiCard
            label="Payments collected"
            value={snapshot.paymentsCollectedLabel}
            meta={periodLabel}
            emphasis="gold"
          />
        ) : null}
      </div>
    </section>
  );
}
