import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ChoiceCardProps {
  title: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  meta?: ReactNode;
  onSelect?: () => void;
}

/**
 * Selectable option card used for Organisation setup, Connection Strategy,
 * History choice, etc. — one radio-like primitive instead of every step
 * reinventing selection cards (CLAUDE.md §4). Not a form `<input>` because the
 * choice always also drives navigation, not just a value.
 */
export function ChoiceCard({ title, description, selected, disabled, badge, meta, onSelect }: ChoiceCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`crm-choice-card${selected ? ' crm-choice-card--selected' : ''}${disabled ? ' crm-choice-card--disabled' : ''}`}
    >
      <span className="crm-choice-card__mark" aria-hidden="true">
        {selected ? <Check /> : null}
      </span>
      <span className="crm-choice-card__body">
        <span className="crm-choice-card__head">
          <span className="crm-choice-card__title">{title}</span>
          {badge}
        </span>
        {description ? <span className="crm-choice-card__description">{description}</span> : null}
        {meta ? <span className="crm-choice-card__meta">{meta}</span> : null}
      </span>
    </button>
  );
}
