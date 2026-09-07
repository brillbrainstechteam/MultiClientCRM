import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

/**
 * The single button primitive for the prototype. Modules must use variants —
 * never create ContactsButton / DashboardButton style forks.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'crm-button',
    `crm-button--${variant}`,
    `crm-button--${size}`,
    fullWidth ? 'crm-button--full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {iconLeft ? <span className="crm-button__icon">{iconLeft}</span> : null}
      {children ? <span className="crm-button__label">{children}</span> : null}
      {iconRight ? <span className="crm-button__icon">{iconRight}</span> : null}
    </button>
  );
}
