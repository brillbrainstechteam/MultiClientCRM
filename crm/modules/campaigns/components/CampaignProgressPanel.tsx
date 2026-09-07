import { Banner, KpiCard } from '@crm/design-system';
import type { CampaignProgress } from '../domain/types';

/**
 * Live/paused/interrupted progress summary (CLAUDE.md §Live progress /
 * §Retry failed). Never lets a user infer sending progress from a chart
 * alone — every figure is a labelled number, and an interrupted send always
 * states its reason, the processed/remaining counts and the next action.
 */
export function CampaignProgressPanel({ progress }: { progress: CampaignProgress }) {
  const percent = progress.totalEligible > 0 ? Math.round((progress.processed / progress.totalEligible) * 100) : 0;

  return (
    <div className="crm-camp-progress-panel">
      {progress.health === 'interrupted' ? (
        <Banner
          tone="danger"
          title={progress.interruptedReason ?? 'Sending was interrupted'}
          description={[progress.interruptedDetail, progress.nextAction].filter(Boolean).join(' ')}
        />
      ) : progress.health === 'partial' ? (
        <Banner tone="warning" title="Sending with some failures" description={progress.nextAction} />
      ) : null}

      <div className="crm-camp-progress-panel__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Send progress">
        <div className="crm-camp-progress-panel__bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="crm-camp-progress-panel__percent">{percent}% processed</p>

      <div className="crm-camp-progress-panel__kpis">
        <KpiCard label="Total eligible" value={progress.totalEligible.toLocaleString('en-IN')} />
        <KpiCard label="Processed" value={progress.processed.toLocaleString('en-IN')} />
        <KpiCard label="Remaining" value={progress.remaining.toLocaleString('en-IN')} />
        <KpiCard label="Sent" value={progress.sent.toLocaleString('en-IN')} />
        <KpiCard label="Delivered" value={progress.deliveredAvailable ? (progress.delivered ?? 0).toLocaleString('en-IN') : 'Not available'} />
        <KpiCard label="Failed" value={progress.failed.toLocaleString('en-IN')} emphasis={progress.failed > 0 ? 'gold' : 'default'} />
      </div>

      {progress.lastUpdateAt ? <p className="crm-camp-progress-panel__updated">Last updated {new Date(progress.lastUpdateAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</p> : null}
    </div>
  );
}
