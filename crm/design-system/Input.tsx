import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  /** Inline validation message; also flips the control into the error style. */
  error?: string;
  required?: boolean;
  hideLabel?: boolean;
  /** Content rendered before the input inside the field (e.g. country code). */
  leadingAddon?: ReactNode;
}

/** Standard labelled text input with inline error support. */
export function Input({
  label,
  hint,
  error,
  required,
  hideLabel,
  leadingAddon,
  className,
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? `crm-input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={['crm-field', className ?? ''].filter(Boolean).join(' ')}>
      <label htmlFor={inputId} className={hideLabel ? 'crm-visually-hidden' : 'crm-field__label'}>
        {label}
        {required ? <span className="crm-field__required" aria-hidden="true"> *</span> : null}
      </label>
      <div className={`crm-field__control${leadingAddon ? ' crm-field__control--with-prefix' : ''}${error ? ' crm-field__control--error' : ''}`}>
        {leadingAddon ? <span className="crm-field__prefix">{leadingAddon}</span> : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="crm-field__error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="crm-field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
