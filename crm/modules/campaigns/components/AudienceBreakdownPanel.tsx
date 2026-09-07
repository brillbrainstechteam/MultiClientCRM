import { audienceWaterfallRows } from '../domain/audienceCalculation';
import { formatDateTime } from '../campaigns-labels';
import type { AudienceBreakdown } from '../domain/types';

/**
 * Authoritative audience waterfall (CLAUDE.md §Audience calculation rule).
 * Reused by Campaign Detail's Overview tab and the builder's Audience/Review
 * steps so the final eligible figure is always shown with its full breakdown,
 * never as a single opaque number.
 */
export function AudienceBreakdownPanel({
  breakdown,
  snapshotAt,
  provisional,
}: {
  breakdown: AudienceBreakdown;
  snapshotAt?: string;
  /** True while personalisation invalidity is still provisional (pre CAM-S06). */
  provisional?: boolean;
}) {
  const rows = audienceWaterfallRows(breakdown);

  return (
    <div className="crm-camp-audience-panel">
      {snapshotAt ? (
        <p className="crm-camp-audience-panel__snapshot">Candidate audience snapshot captured {formatDateTime(snapshotAt)}</p>
      ) : null}
      <ul className="crm-camp-audience-panel__rows">
        {rows.map((row) => (
          <li key={row.key} className={`crm-camp-audience-panel__row crm-camp-audience-panel__row--${row.tone}`}>
            <span>
              {row.label}
              {provisional && row.key === 'invalidPersonalisation' ? ' (provisional)' : ''}
            </span>
            <span className="crm-camp-audience-panel__value">{row.value.toLocaleString('en-IN')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
