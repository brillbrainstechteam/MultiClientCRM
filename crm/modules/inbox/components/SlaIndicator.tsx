import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { SlaState } from '../inbox-types';

interface SlaIndicatorProps {
  sla: SlaState;
  compact?: boolean;
}

export function SlaIndicator({ sla, compact = false }: SlaIndicatorProps) {
  if (sla.status === 'ok') {
    if (compact) return null;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: 'var(--crm-green-dark)',
        }}
      >
        <CheckCircle size={11} /> SLA ok
      </span>
    );
  }

  const isBreached = sla.status === 'breached';
  const color = isBreached ? 'var(--crm-danger)' : 'var(--crm-warn)';
  const label = isBreached
    ? 'SLA breached'
    : sla.minutesRemaining !== null
    ? `${sla.minutesRemaining}m to SLA`
    : 'SLA warning';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: compact ? 10 : 11,
        color,
        fontWeight: 500,
      }}
      title={`SLA deadline: ${sla.deadline ?? 'unknown'}`}
    >
      <AlertTriangle size={compact ? 10 : 11} />
      {label}
    </span>
  );
}
