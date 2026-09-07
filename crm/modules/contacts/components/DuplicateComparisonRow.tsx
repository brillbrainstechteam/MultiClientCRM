import { Check } from 'lucide-react';

export interface DuplicateComparisonRowProps {
  /** Field label, e.g. "Owner". */
  field: string;
  /** Candidate values, one per record being compared. */
  values: string[];
  /** Index of the currently chosen winning value, or null when unresolved. */
  winnerIndex: number | null;
  /** True when the values differ and the spec requires an explicit choice. */
  conflict?: boolean;
  /** Read-only rendering (Batch 0); Batch 4 makes the winner selectable. */
  readOnly?: boolean;
  onChoose?: (index: number) => void;
}

/**
 * One field's side-by-side comparison line for Duplicate Merge Review
 * (CON-S11). Conflicting fields must require an explicit winner choice (2.2);
 * this component surfaces that requirement visually.
 */
export function DuplicateComparisonRow({
  field,
  values,
  winnerIndex,
  conflict = false,
  readOnly = true,
  onChoose,
}: DuplicateComparisonRowProps) {
  return (
    <div className="crm-dupe-row" data-conflict={conflict}>
      <div className="crm-dupe-row__field">
        {field}
        {conflict && winnerIndex === null ? (
          <span className="crm-dupe-row__conflict-flag">Choose one</span>
        ) : null}
      </div>
      <div className="crm-dupe-row__values">
        {values.map((value, index) => {
          const isWinner = winnerIndex === index;
          const selectable = !readOnly && conflict;
          return (
            <button
              key={index}
              type="button"
              className="crm-dupe-row__value"
              data-winner={isWinner}
              disabled={!selectable}
              onClick={selectable ? () => onChoose?.(index) : undefined}
            >
              {isWinner ? <Check className="crm-dupe-row__check" aria-hidden="true" /> : null}
              <span>{value || '—'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
