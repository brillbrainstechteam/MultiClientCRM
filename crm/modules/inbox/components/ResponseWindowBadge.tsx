import { Clock, AlertTriangle } from 'lucide-react';
import type { ResponseWindow } from '../inbox-types';

interface ResponseWindowBadgeProps {
  window: ResponseWindow;
}

/** Compact inline badge shown in the conversation header next to status. */
export function ResponseWindowBadge({ window: rw }: ResponseWindowBadgeProps) {
  if (rw.status === 'active') {
    const hrs = rw.remainingMinutes !== null ? Math.floor(rw.remainingMinutes / 60) : null;
    const label = hrs !== null && hrs > 0 ? `${hrs}h window` : 'Active window';
    return (
      <span className="crm-rwb crm-rwb--active">
        <Clock size={11} />
        {label}
      </span>
    );
  }

  if (rw.status === 'expiring') {
    return (
      <span className="crm-rwb crm-rwb--expiring">
        <AlertTriangle size={11} />
        {rw.remainingMinutes !== null ? `${rw.remainingMinutes}m left` : 'Expiring'}
      </span>
    );
  }

  return (
    <span className="crm-rwb crm-rwb--expired">
      <AlertTriangle size={11} />
      Window closed
    </span>
  );
}

interface ResponseWindowBannerProps {
  window: ResponseWindow;
  onChooseTemplate?: () => void;
}

/** Banner shown above the composer when window is expiring or expired. */
export function ResponseWindowBanner({ window: rw, onChooseTemplate }: ResponseWindowBannerProps) {
  if (rw.status === 'active') return null;

  if (rw.status === 'expiring') {
    return (
      <div className="crm-rwb-banner crm-rwb-banner--expiring">
        <div className="crm-rwb-banner__icon crm-rwb-banner__icon--expiring">
          <AlertTriangle size={15} />
        </div>
        <div className="crm-rwb-banner__body">
          <div className="crm-rwb-banner__title">
            Response window closing in {rw.remainingMinutes}m
          </div>
          <div className="crm-rwb-banner__desc">
            You can still reply freely. After the window closes, only approved templates can be sent.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-rwb-banner crm-rwb-banner--expired">
      <div className="crm-rwb-banner__icon crm-rwb-banner__icon--expired">
        <AlertTriangle size={15} />
      </div>
      <div className="crm-rwb-banner__body">
        <div className="crm-rwb-banner__title">Response window closed</div>
        <div className="crm-rwb-banner__desc">
          The 24-hour customer message window has lapsed. Use an approved template to re-engage.
          {onChooseTemplate && (
            <button
              onClick={onChooseTemplate}
              style={{
                marginLeft: 8,
                color: 'var(--crm-danger)',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 'inherit',
              }}
            >
              Choose template
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
