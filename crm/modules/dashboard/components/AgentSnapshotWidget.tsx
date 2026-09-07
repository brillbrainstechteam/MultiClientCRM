import { KpiCard } from '@crm/design-system';

export interface AgentSnapshotWidgetProps {
  pendingReplies: number;
  overdueFollowups: number;
  assignedLeads: number;
}

/**
 * Agent-preset business snapshot (§9): agents see their own load only —
 * no company-wide KPIs, revenue or cross-team figures.
 */
export function AgentSnapshotWidget({ pendingReplies, overdueFollowups, assignedLeads }: AgentSnapshotWidgetProps) {
  return (
    <section aria-label="My work today" className="crm-dash-section">
      <h2 className="crm-dash-section-title">My work today</h2>
      <div className="crm-dash-kpi-grid">
        <KpiCard label="Pending replies" value={pendingReplies} meta="Assigned to me" />
        <KpiCard label="Overdue follow-ups" value={overdueFollowups} meta="Assigned to me" emphasis="gold" />
        <KpiCard label="Assigned leads" value={assignedLeads} meta="In current scope" />
      </div>
    </section>
  );
}
