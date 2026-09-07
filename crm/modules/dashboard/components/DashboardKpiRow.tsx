import { BadgeCheck, Clock, MessageSquare, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { KpiCard } from '@crm/design-system';
import { useDashboardHref } from '../dashboard-links';
import type { DashboardKpi, KpiKey } from '../dashboard-selectors';

const kpiIcon: Record<KpiKey, LucideIcon> = {
  newEnquiries: UserPlus,
  pendingReplies: MessageSquare,
  overdueFollowups: Clock,
  converted: BadgeCheck,
};

export interface DashboardKpiRowProps {
  kpis: DashboardKpi[];
  comparisonLabel: string;
}

/**
 * The four primary KPI cards. Each shows the current value, a period-over-period
 * delta coloured by whether the movement is good, and clicks through to the
 * underlying records. There is no separate Trends section repeating these.
 */
export function DashboardKpiRow({ kpis, comparisonLabel }: DashboardKpiRowProps) {
  const dashHref = useDashboardHref();
  return (
    <div className="crm-kpi-row" aria-label="Key figures">
      {kpis.map((kpi) => {
        const Icon = kpiIcon[kpi.key];
        return (
          <KpiCard
            key={kpi.key}
            label={kpi.label}
            value={kpi.value.toLocaleString('en-IN')}
            icon={<Icon />}
            to={dashHref(kpi.to)}
            delta={{ value: kpi.delta, goodDirection: kpi.goodDirection, label: comparisonLabel || undefined }}
          />
        );
      })}
    </div>
  );
}
