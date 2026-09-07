'use client';

import type { InputHTMLAttributes } from 'react';
import './Checkbox.css';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
}

export function Checkbox({ label, hideLabel, id, className, ...rest }: CheckboxProps) {
  const boxId = id ?? `c-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <span className={['crm-check', className].filter(Boolean).join(' ')}>
      <input id={boxId} type="checkbox" className="crm-check__input" {...rest} />
      <label htmlFor={boxId} className={hideLabel ? 'crm-visually-hidden' : 'crm-check__label'}>
        {label}
      </label>
    </span>
  );
}
