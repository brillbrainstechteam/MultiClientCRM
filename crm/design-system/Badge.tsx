import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

export interface BadgeProps {
  tone?: BadgeTone;
  /** `soft` fills with a tinted background, `outline` keeps the surface clean. */
  appearance?: 'soft' | 'outline';
  icon?: ReactNode;
  children: ReactNode;
}

/** Generic status/label chip. StatusBadge and SeverityBadge build on this. */
export function Badge({ tone = 'neutral', appearance = 'soft', icon, children }: BadgeProps) {
  return (
    <span className={`crm-badge crm-badge--${tone} crm-badge--${appearance}`}>
      {icon ? <span className="crm-badge__icon">{icon}</span> : null}
      {children}
    </span>
  );
}

/** A dot-prefixed badge for connection/record status. */
export function StatusBadge({ tone = 'neutral', children }: Omit<BadgeProps, 'appearance'>) {
  return (
    <span className={`crm-badge crm-badge--${tone} crm-badge--soft`}>
      <span className="crm-badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export type Severity = 'low' | 'medium' | 'high' | 'critical';

const severityTone: Record<Severity, BadgeTone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const severityLabel: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge tone={severityTone[severity]}>{severityLabel[severity]}</Badge>;
}
