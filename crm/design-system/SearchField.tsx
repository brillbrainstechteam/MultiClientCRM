import { Search } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hideLabel?: boolean;
  width?: string;
}

export function SearchField({
  label,
  hideLabel = true,
  width,
  className,
  id,
  placeholder = 'Search',
  ...rest
}: SearchFieldProps) {
  const inputId = id ?? `crm-search-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className={['crm-search', className ?? ''].filter(Boolean).join(' ')} style={{ width }}>
      <label htmlFor={inputId} className={hideLabel ? 'crm-visually-hidden' : 'crm-search__label'}>
        {label}
      </label>
      <div className="crm-search__control">
        <Search className="crm-search__icon" aria-hidden="true" />
        <input id={inputId} type="search" placeholder={placeholder} {...rest} />
      </div>
    </div>
  );
}
