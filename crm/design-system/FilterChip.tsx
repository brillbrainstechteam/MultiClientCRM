import { X } from 'lucide-react';

export interface FilterChipProps {
  label: string;
  /** Optional field prefix, e.g. "Stage: Qualified". */
  field?: string;
  /** When provided, the chip shows a remove affordance. */
  onRemove?: () => void;
}

/** Removable applied-filter chip (soft green — a product-accent surface). */
export function FilterChip({ label, field, onRemove }: FilterChipProps) {
  return (
    <span className="crm-filter-chip">
      {field ? <span className="crm-filter-chip__field">{field}:</span> : null}
      <span className="crm-filter-chip__label">{label}</span>
      {onRemove ? (
        <button
          type="button"
          className="crm-filter-chip__remove"
          aria-label={`Remove filter ${field ? `${field} ` : ''}${label}`}
          onClick={onRemove}
        >
          <X />
        </button>
      ) : null}
    </span>
  );
}
