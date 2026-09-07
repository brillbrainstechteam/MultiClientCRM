import { Link } from 'react-router-dom';

export interface BreakdownItem {
  label: string;
  value: number;
  /** Optional drilldown target (renders the row as a link). */
  href?: string;
}

export interface BreakdownBarsProps {
  title: string;
  items: BreakdownItem[];
  /** Total used to compute bar widths (defaults to the sum of values). */
  total?: number;
}

/**
 * Horizontal bar breakdown used by the Overview customer mix and the Reports
 * distributions. One widget so both read identically.
 */
export function BreakdownBars({ title, items, total }: BreakdownBarsProps) {
  const denom = total ?? items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="crm-breakdown">
      <h3 className="crm-breakdown__title">{title}</h3>
      <ul className="crm-breakdown__list">
        {items.map((item) => {
          const pct = denom === 0 ? 0 : Math.round((item.value / denom) * 100);
          const row = (
            <>
              <span className="crm-breakdown__label" title={item.label}>
                {item.label}
              </span>
              <span className="crm-breakdown__bar" aria-hidden="true">
                <span className="crm-breakdown__fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="crm-breakdown__value">{item.value}</span>
            </>
          );
          return (
            <li key={item.label} className="crm-breakdown__row">
              {item.href ? (
                <Link to={item.href} className="crm-breakdown__link">
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
