'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={['tt-btn', `tt-btn--${variant}`, `tt-btn--${size}`, fullWidth ? 'tt-btn--full' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {iconLeft ? <span className="tt-btn__icon" aria-hidden="true">{iconLeft}</span> : null}
      {children}
      {iconRight ? <span className="tt-btn__icon" aria-hidden="true">{iconRight}</span> : null}
    </button>
  );
}
