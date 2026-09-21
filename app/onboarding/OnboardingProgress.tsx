'use client';

import { Check, RotateCcw } from 'lucide-react';

export interface OnboardingSessionView {
  status: string;
  strategy: string | null;
  lastStep: string | null;
  errorMessage: string | null;
}

const STEPS = ['Choose how to connect', 'Connect on Meta', 'Verify & register', 'Ready'];

const STATUS_INDEX: Record<string, number> = {
  started: 0, strategy_selected: 0,
  meta_launched: 1, meta_returned: 1,
  registering: 2, ready: 3,
};

function currentIndex(s: OnboardingSessionView): number {
  if (s.status in STATUS_INDEX) return STATUS_INDEX[s.status];
  // cancelled / error: they had at least chosen + launched if a strategy exists
  return s.strategy ? 1 : 0;
}

const STRATEGY_LABEL: Record<string, string> = {
  existing: 'existing WhatsApp Business account',
  new: 'a new number',
  coexistence: 'coexistence (keep the Business app)',
};

/** Steps bar + resume banner for the connect flow. Hidden once fully connected. */
export function OnboardingProgress({ session }: { session: OnboardingSessionView | null }) {
  if (!session) return null;
  const idx = currentIndex(session);
  const resumable = ['strategy_selected', 'meta_launched', 'meta_returned', 'registering', 'cancelled', 'error'].includes(session.status);

  return (
    <div className="tt-onb__progress">
      <ol className="tt-onb__steps">
        {STEPS.map((label, i) => {
          const state = session.status === 'ready' || i < idx ? 'done' : i === idx ? 'current' : 'todo';
          return (
            <li key={label} className={`tt-onb__step tt-onb__step--${state}`}>
              <span className="tt-onb__step-dot">{state === 'done' ? <Check size={13} /> : i + 1}</span>
              <span className="tt-onb__step-label">{label}</span>
            </li>
          );
        })}
      </ol>

      {resumable && (
        <div className="tt-onb__resume">
          <div>
            <strong>{session.status === 'error' ? 'Connection didn’t finish' : 'Resume where you left off'}</strong>
            <p>
              {session.strategy ? `You were connecting via ${STRATEGY_LABEL[session.strategy] ?? session.strategy}. ` : ''}
              {session.lastStep ? `Last step: ${session.lastStep.replace(/_/g, ' ')}. ` : ''}
              {session.status === 'error' && session.errorMessage ? session.errorMessage : 'Pick up from here — nothing you entered is lost.'}
            </p>
          </div>
          {session.strategy ? (
            <a href={`/api/auth/meta/start?path=${encodeURIComponent(session.strategy)}`} className="tt-onb__resume-btn">
              <RotateCcw size={15} /> Resume
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
