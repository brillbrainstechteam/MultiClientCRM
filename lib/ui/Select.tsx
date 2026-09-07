'use client';

import type { SelectHTMLAttributes } from 'react';
import './Select.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  hint?: string;
  hideLabel?: boolean;
}

export function Select({ label, options, hint, hideLabel, id, className, ...rest }: SelectProps) {
  const selectId = id ?? `s-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={['crm-field', className].filter(Boolean).join(' ')}>
      <label htmlFor={selectId} className={hideLabel ? 'crm-visually-hidden' : 'crm-field__label'}>
        {label}
      </label>
      <div className="crm-field__control">
        <select id={selectId} className="crm-field__input crm-select__control" {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hint ? <p className="crm-field__hint">{hint}</p> : null}
    </div>
  );
}
