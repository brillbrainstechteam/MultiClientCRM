import { Check, Minus } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hideLabel?: boolean;
  /** Renders the partial (dash) state for "some selected". */
  indeterminate?: boolean;
}

export function Checkbox({ label, hideLabel, indeterminate, className, ...rest }: CheckboxProps) {
  return (
    <label className={['crm-checkbox', className ?? ''].filter(Boolean).join(' ')}>
      <span className="crm-checkbox__box">
        <input type="checkbox" {...rest} />
        <span className="crm-checkbox__mark" aria-hidden="true">
          {indeterminate ? <Minus /> : <Check />}
        </span>
      </span>
      <span className={hideLabel ? 'crm-visually-hidden' : 'crm-checkbox__label'}>{label}</span>
    </label>
  );
}
