import { Compass, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button } from '@crm/design-system';

export interface WelcomeBarProps {
  firstName: string;
  quickActionsLabel?: string;
}

/** DASH-S01 §7 row 2 — compact personalised welcome + Quick Actions launcher (DASH-S10). */
export function WelcomeBar({ firstName, quickActionsLabel = 'Quick actions' }: WelcomeBarProps) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  return (
    <div className="crm-welcome-bar">
      <p className="crm-welcome-bar__greeting">
        Good morning, <strong>{firstName}</strong>. Here&apos;s what needs your attention today.
      </p>
      <div className="crm-welcome-bar__actions">
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Compass />}
          onClick={() => navigate(scopedHref('/dashboard', { tour: '1', step: '1' }))}
        >
          Take the tour
        </Button>
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Zap />}
          onClick={() => navigate(scopedHref('/dashboard', { popover: 'quick-actions' }))}
        >
          {quickActionsLabel}
        </Button>
      </div>
    </div>
  );
}
