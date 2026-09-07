import type { ReactNode } from 'react';
import './Badge.css';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

export function Badge({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`tt-badge tt-badge--${tone}`}>
      {icon ? <span className="tt-badge__icon" aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}
