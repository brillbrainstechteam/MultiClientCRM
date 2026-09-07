import { AlertTriangle, Info, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

export type BannerTone = 'info' | 'warning' | 'danger';

export interface BannerProps {
  tone?: BannerTone;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
}

const toneIcon: Record<BannerTone, ReactNode> = {
  info: <Info aria-hidden="true" />,
  warning: <TriangleAlert aria-hidden="true" />,
  danger: <AlertTriangle aria-hidden="true" />,
};

/** Page-level persistent banner (CLAUDE.md §4) — partial errors, disconnected dependencies, plan warnings. */
export function Banner({ tone = 'info', title, description, actions, onDismiss }: BannerProps) {
  return (
    <div className={`crm-banner crm-banner--${tone}`} role="status">
      <span className="crm-banner__icon">{toneIcon[tone]}</span>
      <div className="crm-banner__text">
        <p className="crm-banner__title">{title}</p>
        {description ? <p className="crm-banner__description">{description}</p> : null}
      </div>
      {actions ? <div className="crm-banner__actions">{actions}</div> : null}
      {onDismiss ? <IconButton label="Dismiss" icon={<X />} size="sm" onClick={onDismiss} /> : null}
    </div>
  );
}
