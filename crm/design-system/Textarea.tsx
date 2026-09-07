import type { TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  required?: boolean;
  hideLabel?: boolean;
}

export function Textarea({ label, hint, required, hideLabel, id, ...rest }: TextareaProps) {
  const areaId = id ?? `crm-textarea-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="crm-field">
      <label htmlFor={areaId} className={hideLabel ? 'crm-visually-hidden' : 'crm-field__label'}>
        {label}
        {required ? <span className="crm-field__required" aria-hidden="true"> *</span> : null}
      </label>
      <textarea id={areaId} className="crm-field__textarea" required={required} {...rest} />
      {hint ? <p className="crm-field__hint">{hint}</p> : null}
    </div>
  );
}
