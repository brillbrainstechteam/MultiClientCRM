import { Check, Wallet as WalletIcon, Zap } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useAppSession, type PlanKey } from '@crm/app/app-session';
import { Badge, Banner, Button, Tabs, Toggle, type TabItem } from '@crm/design-system';
import {
  RECHARGE_OPTIONS,
  messageRateLabels,
  messageRates,
  planTiers,
  usageThisCycle,
  walletTransactions,
} from './billing-data';

const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const tabs: TabItem[] = [
  { id: 'plans', label: 'Plans' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'usage', label: 'Usage' },
];

/**
 * Billing — Plans (tier cards + upgrade), Wallet (balance, add money,
 * auto-recharge, transactions) and Usage (messages this cycle). Reads and
 * writes the persisted app session so plan/wallet changes reflect on the
 * dashboard credits strip. Mock only — no real payment.
 */
export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAppSession();
  const tab = searchParams.get('tab') ?? 'plans';

  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  return (
    <div className="crm-billing">
      <PageHeader title="Billing" description="Manage your plan, messaging wallet and usage." />
      <Tabs tabs={tabs} activeId={tab} onChange={setTab} ariaLabel="Billing sections" />

      {tab === 'plans' ? <PlansTab currentPlan={session.plan} trialDaysLeft={session.trialDaysLeft} onChoose={session.setPlan} /> : null}
      {tab === 'wallet' ? <WalletTab balance={session.walletBalance} onAdd={session.addWallet} /> : null}
      {tab === 'usage' ? <UsageTab /> : null}
    </div>
  );
}

/* ---- Plans -------------------------------------------------------------- */
function PlansTab({ currentPlan, trialDaysLeft, onChoose }: { currentPlan: PlanKey; trialDaysLeft: number; onChoose: (p: PlanKey) => void }) {
  return (
    <div className="crm-billing__section">
      {currentPlan === 'trial' ? (
        <Banner
          tone="warning"
          title={`You're on the free trial — ${trialDaysLeft} days left`}
          description="Choose a plan to keep sending messages after your trial ends."
        />
      ) : null}

      <div className="crm-plan-grid">
        {planTiers.map((tier) => {
          const isCurrent = tier.key === currentPlan;
          return (
            <div key={tier.key} className={`crm-plan${tier.recommended ? ' crm-plan--recommended' : ''}${isCurrent ? ' crm-plan--current' : ''}`}>
              {tier.recommended ? <span className="crm-plan__ribbon">Recommended</span> : null}
              <span className="crm-plan__name">{tier.name}</span>
              <span className="crm-plan__price">
                {tier.priceMonthly === 0 ? 'Free' : money(tier.priceMonthly)}
                {tier.priceMonthly > 0 ? <span className="crm-plan__per">/mo</span> : null}
              </span>
              <span className="crm-plan__tagline">{tier.tagline}</span>
              <ul className="crm-plan__features">
                {tier.features.map((f) => (
                  <li key={f}><Check aria-hidden="true" /> {f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <Button variant="secondary" fullWidth disabled>Current plan</Button>
              ) : (
                <Button variant={tier.recommended ? 'primary' : 'secondary'} fullWidth onClick={() => onChoose(tier.key)}>
                  {tier.key === 'trial' ? 'Switch to trial' : `Choose ${tier.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <p className="crm-billing__note">
        Plan prices exclude 18% GST and are placeholders while real platform costs are finalised. Message costs are billed separately from your wallet.
      </p>
    </div>
  );
}

/* ---- Wallet ------------------------------------------------------------- */
function WalletTab({ balance, onAdd }: { balance: number; onAdd: (amount: number) => void }) {
  return (
    <div className="crm-billing__section">
      <div className="crm-wallet__grid">
        <div className="crm-wallet__balance">
          <span className="crm-wallet__balance-icon" aria-hidden="true"><WalletIcon /></span>
          <span className="crm-wallet__balance-label">Messaging wallet balance</span>
          <span className="crm-wallet__balance-value">{money(balance)}</span>
          {balance < 200 ? <Badge tone="danger">Low balance — top up to keep sending</Badge> : null}
          <div className="crm-wallet__add">
            {RECHARGE_OPTIONS.map((amount) => (
              <Button key={amount} variant="secondary" size="sm" onClick={() => onAdd(amount)}>
                + {money(amount)}
              </Button>
            ))}
          </div>
          <label className="crm-wallet__auto">
            <Toggle label="Auto-recharge when balance is low" defaultChecked />
          </label>
        </div>

        <div className="crm-wallet__rates">
          <h3 className="crm-billing__subtitle">Message rates</h3>
          <p className="crm-billing__note">Charged per template message delivered (indicative).</p>
          <ul className="crm-wallet__rate-list">
            {(Object.keys(messageRates) as (keyof typeof messageRates)[]).map((key) => (
              <li key={key}>
                <span>{messageRateLabels[key]}</span>
                <span className="crm-wallet__rate">₹{messageRates[key].toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="crm-billing__subtitle">Recent transactions</h3>
      <div className="crm-wallet__txns">
        {walletTransactions.map((tx) => (
          <div key={tx.id} className="crm-wallet__txn">
            <span className="crm-wallet__txn-label">{tx.label}</span>
            <span className="crm-wallet__txn-date">{new Date(tx.at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            <span className={`crm-wallet__txn-amt crm-wallet__txn-amt--${tx.amount >= 0 ? 'in' : 'out'}`}>
              {tx.amount >= 0 ? '+' : '−'}{money(Math.abs(tx.amount))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Usage -------------------------------------------------------------- */
function UsageTab() {
  const { rows, freeConversationsUsed, freeConversationsTotal } = usageThisCycle;
  const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
  const freePct = Math.round((freeConversationsUsed / freeConversationsTotal) * 100);

  return (
    <div className="crm-billing__section">
      <div className="crm-usage__free">
        <div className="crm-usage__free-head">
          <span>Free conversations this cycle</span>
          <span className="crm-usage__free-count">{freeConversationsUsed} / {freeConversationsTotal}</span>
        </div>
        <span className="crm-usage__bar" aria-hidden="true"><span className="crm-usage__bar-fill" style={{ width: `${freePct}%` }} /></span>
      </div>

      <h3 className="crm-billing__subtitle">Messages sent this cycle</h3>
      <div className="crm-usage__table">
        <div className="crm-usage__row crm-usage__row--head"><span>Category</span><span>Sent</span><span>Rate</span><span>Cost</span></div>
        {rows.map((row) => (
          <div key={row.category} className="crm-usage__row">
            <span>{messageRateLabels[row.category]}</span>
            <span>{row.sent.toLocaleString('en-IN')}</span>
            <span>₹{messageRates[row.category].toFixed(2)}</span>
            <span>{money(row.cost)}</span>
          </div>
        ))}
        <div className="crm-usage__row crm-usage__row--total"><span>Total</span><span /><span /><span>{money(totalCost)}</span></div>
      </div>
      <p className="crm-billing__note">
        <Zap aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: 'middle' }} /> Utility and service messages inside the 24-hour customer window are free.
      </p>
    </div>
  );
}
