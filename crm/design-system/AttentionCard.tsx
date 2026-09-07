import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type AttentionTone = 'warn' | 'danger' | 'neutral';

export interface AttentionCardProps {
  title: string;
  count: number;
  description: string;
  icon: ReactNode;
  tone?: AttentionTone;
  /** Where "review" navigates — usually a filtered list route. */
  to: string;
  actionLabel?: string;
}

/** "Needs attention" card on the Overview (unassigned, overdue, etc.). */
export function AttentionCard({
  title,
  count,
  description,
  icon,
  tone = 'warn',
  to,
  actionLabel = 'Review',
}: AttentionCardProps) {
  return (
    <Link to={to} className={`crm-attention crm-attention--${tone}`}>
      <span className="crm-attention__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="crm-attention__text">
        <span className="crm-attention__title">
          {title}
          <span className="crm-attention__count">{count}</span>
        </span>
        <span className="crm-attention__description">{description}</span>
      </span>
      <span className="crm-attention__action">
        {actionLabel}
        <ChevronRight aria-hidden="true" />
      </span>
    </Link>
  );
}
