import { PhoneCall } from 'lucide-react';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { WidgetShell } from '@crm/design-system';
import { callsDueToday } from '@crm/mock-data';
import { Link } from 'react-router-dom';
import type { PipelineSlice } from '../dashboard-selectors';

export interface SalesCallingWidgetProps {
  pipeline: PipelineSlice[];
  stalledCount: number;
  highValueCount: number;
}

/** DASH-S01 §7 row 7 (sales half) — pipeline stages, follow-ups, cohorts. */
export function SalesCallingWidget({ pipeline, stalledCount, highValueCount }: SalesCallingWidgetProps) {
  const scopedHref = useScopedHref();
  const totalPipeline = pipeline.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <WidgetShell title="Sales & follow-ups" icon={<PhoneCall />} footerTo={scopedHref('/contacts')} footerLabel="Open Contacts">
      <ul className="crm-dash-breakdown">
        {pipeline.map((slice) => (
          <li key={slice.stage} className="crm-dash-breakdown__row">
            <Link to={scopedHref('/contacts/all', { stage: slice.stage })} className="crm-dash-breakdown__link">
              <span className="crm-dash-breakdown__label">{slice.label}</span>
              <span className="crm-dash-breakdown__bar" aria-hidden="true">
                <span
                  className="crm-dash-breakdown__fill"
                  style={{ width: `${totalPipeline === 0 ? 0 : Math.round((slice.value / totalPipeline) * 100)}%` }}
                />
              </span>
              <span className="crm-dash-breakdown__value">{slice.value}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="crm-dash-metric-row">
        <Link to={scopedHref('/calling', { status: 'due' })} className="crm-dash-metric">
          <span className="crm-dash-metric__value">{callsDueToday}</span>
          <span className="crm-dash-metric__label">Calls due today</span>
        </Link>
        <Link to={scopedHref('/contacts/all', { source: 'stalled' })} className="crm-dash-metric">
          <span className="crm-dash-metric__value">{stalledCount}</span>
          <span className="crm-dash-metric__label">Stalled leads</span>
        </Link>
        <Link to={scopedHref('/contacts/all', { source: 'high-value' })} className="crm-dash-metric">
          <span className="crm-dash-metric__value">{highValueCount}</span>
          <span className="crm-dash-metric__label">High-value</span>
        </Link>
      </div>
    </WidgetShell>
  );
}
