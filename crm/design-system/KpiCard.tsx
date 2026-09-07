import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface KpiDelta {
  /** Signed change vs the comparison period (e.g. +12 or -3). */
  value: number;
  /** Whether an increase reads as good (leads/converted) or bad (overdue). */
  goodDirection?: 'up' | 'down';
  /** Optional label, e.g. "vs last 7 days". */
  label?: string;
}

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  /** Small delta/context line under the value. */
  meta?: string;
  icon?: ReactNode;
  /** `gold` marks the single rationed key figure on a screen. */
  emphasis?: 'default' | 'gold';
  /** Period-over-period comparison rendered as a coloured arrow chip. */
  delta?: KpiDelta;
  /** When set, the whole card becomes a click-through to these records. */
  to?: string;
}

/**
 * Operational KPI tile. Optionally shows a period-over-period delta (coloured
 * by whether the movement is good or bad) and can act as a click-through to the
 * underlying records. Backward compatible: `delta`/`to` are optional.
 */
export function KpiCard({ label, value, meta, icon, emphasis = 'default', delta, to }: KpiCardProps) {
  const body = (
    <>
      <div className="crm-kpi__head">
        <span className="crm-kpi__label">{label}</span>
        {icon ? <span className="crm-kpi__icon" aria-hidden="true">{icon}</span> : null}
      </div>
      <span className="crm-kpi__value">{value}</span>
      <div className="crm-kpi__foot">
        {delta ? <DeltaChip delta={delta} /> : null}
        {meta ? <span className="crm-kpi__meta">{meta}</span> : null}
      </div>
    </>
  );

  const className = `crm-kpi crm-kpi--${emphasis}${to ? ' crm-kpi--link' : ''}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

function DeltaChip({ delta }: { delta: KpiDelta }) {
  if (delta.value === 0) {
    return <span className="crm-kpi__delta crm-kpi__delta--flat">No change{delta.label ? ` ${delta.label}` : ''}</span>;
  }
  const up = delta.value > 0;
  const good = up ? (delta.goodDirection ?? 'up') === 'up' : (delta.goodDirection ?? 'up') === 'down';
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`crm-kpi__delta crm-kpi__delta--${good ? 'good' : 'bad'}`}>
      <Arrow aria-hidden="true" />
      {up ? '+' : ''}
      {delta.value}
      {delta.label ? <span className="crm-kpi__delta-label"> {delta.label}</span> : null}
    </span>
  );
}
