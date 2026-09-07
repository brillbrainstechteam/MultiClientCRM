import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

const toneIcon: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 />,
  error: <TriangleAlert />,
  info: <Info />,
};

export interface ToastProps {
  tone?: ToastTone;
  message: string;
  onDismiss?: () => void;
}

/**
 * Lightweight toast. Rendered declaratively by screens from query-state (so a
 * success/error capture is reproducible by URL) rather than a timed queue.
 */
export function Toast({ tone = 'success', message, onDismiss }: ToastProps) {
  return (
    <div className={`crm-toast crm-toast--${tone}`} role="status">
      <span className="crm-toast__icon" aria-hidden="true">
        {toneIcon[tone]}
      </span>
      <span className="crm-toast__message">{message}</span>
      {onDismiss ? (
        <button className="crm-toast__dismiss" aria-label="Dismiss" onClick={onDismiss}>
          <X />
        </button>
      ) : null}
    </div>
  );
}
