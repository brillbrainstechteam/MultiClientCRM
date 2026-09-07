import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  options: SelectOption[];
  /** Hide the visible label but keep it for screen readers (compact bars). */
  hideLabel?: boolean;
  size?: 'sm' | 'md';
}

export function Select({
  label,
  options,
  hideLabel = false,
  size = 'md',
  className,
  id,
  ...rest
}: SelectProps) {
  const selectId = id ?? `crm-select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className={['crm-select', `crm-select--${size}`, className ?? ''].filter(Boolean).join(' ')}>
      <label
        htmlFor={selectId}
        className={hideLabel ? 'crm-visually-hidden' : 'crm-select__label'}
      >
        {label}
      </label>
      <select id={selectId} className="crm-select__control" {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
