import { TrendMini, WidgetShell } from '@crm/design-system';
import { ChartNoAxesCombined } from 'lucide-react';
import { useScopedHref } from '@crm/app/use-scoped-href';
import type { TrendSeries } from '@crm/mock-data';

export interface TrendsSectionProps {
  series: TrendSeries[];
  /** `error` reproduces a widget that failed to refresh during a partial Dashboard error. */
  forceState?: 'error';
}

/** DASH-S01 §7 row 10 — simple current-vs-previous trends, not full Reports. */
export function TrendsSection({ series, forceState }: TrendsSectionProps) {
  const scopedHref = useScopedHref();

  return (
    <WidgetShell
      title="Trends"
      icon={<ChartNoAxesCombined />}
      footerTo={scopedHref('/reports')}
      footerLabel="Open Reports"
      state={forceState}
      stateTitle="Could not refresh trend data"
      stateDescription="Showing the last successfully loaded figures may help — try again shortly."
    >
      <div className="crm-dash-trend-grid">
        {series.map((trend) => (
          <TrendMini
            key={trend.id}
            label={trend.label}
            points={trend.points}
            currentTotal={trend.currentTotal}
            previousTotal={trend.previousTotal}
            unit={trend.unit}
          />
        ))}
      </div>
    </WidgetShell>
  );
}
