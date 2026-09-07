import { TrendingDown, TrendingUp } from 'lucide-react';

export interface TrendMiniProps {
  label: string;
  points: number[];
  currentTotal: number;
  previousTotal: number;
  unit?: string;
}

/**
 * Compact current-vs-previous period trend (DASHBOARD_GENERATION_SPEC.md §6
 * "Charts / trends"). Presentation only — no report drill-down complexity.
 */
export function TrendMini({ label, points, currentTotal, previousTotal, unit = '' }: TrendMiniProps) {
  const max = Math.max(...points, 1);
  const delta = previousTotal === 0 ? 0 : Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  const isUp = delta >= 0;

  return (
    <div className="crm-trend-mini">
      <div className="crm-trend-mini__head">
        <span className="crm-trend-mini__label">{label}</span>
        <span className={`crm-trend-mini__delta crm-trend-mini__delta--${isUp ? 'up' : 'down'}`}>
          {isUp ? <TrendingUp aria-hidden="true" /> : <TrendingDown aria-hidden="true" />}
          {Math.abs(delta)}%
        </span>
      </div>
      <div className="crm-trend-mini__value">
        {currentTotal}
        {unit}
      </div>
      <div className="crm-trend-mini__bars" aria-hidden="true">
        {points.map((point, index) => (
          <span
            key={index}
            className="crm-trend-mini__bar"
            style={{ height: `${Math.max((point / max) * 100, 6)}%` }}
          />
        ))}
      </div>
      <span className="crm-trend-mini__meta">
        vs {previousTotal}
        {unit} previous period
      </span>
    </div>
  );
}
