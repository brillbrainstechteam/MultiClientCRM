import { CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@crm/design-system';
import type { UsageWarning } from '@crm/mock-data';

export interface UsageWarningBannerProps {
  warnings: UsageWarning[];
}

/** DASH-S01 §7 row 13 — owner/admin only, conditional on a real threshold breach. */
export function UsageWarningBanner({ warnings }: UsageWarningBannerProps) {
  const navigate = useNavigate();
  if (warnings.length === 0) return null;

  return (
    <div className="crm-usage-warning">
      {warnings.map((warning) => (
        <div key={warning.id} className={`crm-usage-warning__row crm-usage-warning__row--${warning.severity}`}>
          <CreditCard aria-hidden="true" className="crm-usage-warning__icon" />
          <span className="crm-usage-warning__message">{warning.message}</span>
          <Button variant="secondary" size="sm" onClick={() => navigate(warning.ctaTo)}>
            {warning.ctaLabel}
          </Button>
        </div>
      ))}
    </div>
  );
}
