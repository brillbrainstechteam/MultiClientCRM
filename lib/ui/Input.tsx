'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  leadingAddon?: ReactNode;
  hideLabel?: boolean;
}

export function Input({ label, hint, error, leadingAddon, hideLabel, id, className, ...rest }: InputProps) {
  const inputId = id ?? `f-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className={['crm-field', className].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className={hideLabel ? 'crm-visually-hidden' : 'crm-field__label'}>
        {label}
      </label>
      <div className={`crm-field__control${leadingAddon ? ' crm-field__control--addon' : ''}${error ? ' crm-field__control--error' : ''}`}>
        {leadingAddon ? <span className="crm-field__addon">{leadingAddon}</span> : null}
        <input id={inputId} className="crm-field__input" {...rest} />
      </div>
      {error ? (
        <p className="crm-field__hint crm-field__hint--error">{error}</p>
      ) : hint ? (
        <p className="crm-field__hint">{hint}</p>
      ) : null}
    </div>
  );
}
