import { Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PLAN_LABELS, useAppSession } from '@crm/app/app-session';
import { Badge, Button } from '@crm/design-system';
import { useDashboardHref } from '../dashboard-links';

/**
 * Compact plan & credits strip at the top of the connected dashboard: plan,
 * trial days left, messaging wallet balance and free conversations remaining,
 * with Recharge / Upgrade actions. Reads the persisted session so it reflects
 * plan/wallet changes made in Billing.
 */
export function PlanCreditsStrip() {
  const { plan, trialDaysLeft, walletBalance, freeConversationsLeft } = useAppSession();
  const navigate = useNavigate();
  const dashHref = useDashboardHref();

  const lowBalance = walletBalance < 200;
  const tone = plan === 'trial' || lowBalance ? 'warn' : 'ok';

  return (
    <div className={`crm-credits crm-credits--${tone}`}>
      <span className="crm-credits__icon" aria-hidden="true"><Wallet /></span>
      <div className="crm-credits__items">
        <span className="crm-credits__item">
          <span className="crm-credits__label">Plan</span>
          <span className="crm-credits__value">
            {PLAN_LABELS[plan]}
            {plan === 'trial' ? <Badge tone="warning">{trialDaysLeft} days left</Badge> : null}
          </span>
        </span>
        <span className="crm-credits__item">
          <span className="crm-credits__label">Wallet</span>
          <span className="crm-credits__value">
            ₹{walletBalance.toLocaleString('en-IN')}
            {lowBalance ? <Badge tone="danger">Low</Badge> : null}
          </span>
        </span>
        <span className="crm-credits__item">
          <span className="crm-credits__label">Free conversations</span>
          <span className="crm-credits__value">{freeConversationsLeft.toLocaleString('en-IN')} left</span>
        </span>
      </div>
      <div className="crm-credits__actions">
        <Button variant="secondary" size="sm" onClick={() => navigate(dashHref('/billing?tab=wallet'))}>
          Recharge
        </Button>
        <Button variant="primary" size="sm" onClick={() => navigate(dashHref('/billing?tab=plans'))}>
          Upgrade
        </Button>
      </div>
    </div>
  );
}
