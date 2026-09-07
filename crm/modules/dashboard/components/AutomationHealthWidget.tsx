import { Bot, PlugZap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, WidgetShell } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';
import type { Automation, AutomationHealthRow } from '@crm/mock-data';

const statusTone: Record<Automation['status'], BadgeTone> = {
  draft: 'neutral',
  live: 'success',
  paused: 'warning',
};

export interface AutomationHealthWidgetProps {
  rows: { automation: Automation; health: AutomationHealthRow }[];
  /** `?state=partial-error` reproduction — the automation platform integration is unreachable. */
  forceState?: 'disconnected';
}

/** DASH-S01 §7 row 9 — active/paused, stuck customers, integration status. */
export function AutomationHealthWidget({ rows, forceState }: AutomationHealthWidgetProps) {
  const scopedHref = useScopedHref();

  return (
    <WidgetShell
      title="Automation health"
      icon={<Bot />}
      footerTo={scopedHref('/automation')}
      footerLabel="Open Journeys & Automation"
      state={forceState ?? (rows.length === 0 ? 'empty' : undefined)}
      stateTitle={forceState === 'disconnected' ? 'Automation platform unreachable' : 'No automations in scope'}
      stateDescription={
        forceState === 'disconnected'
          ? 'The automation integration is temporarily disconnected. Status here may be out of date.'
          : undefined
      }
    >
      <ul className="crm-automation-health__list">
        {rows.map(({ automation, health }) => (
          <li key={automation.id}>
            <Link to={scopedHref(`/automation/${automation.id}`)} className="crm-automation-health__row">
              <span className="crm-automation-health__identity">
                <span className="crm-automation-health__name">{automation.name}</span>
                <Badge tone={statusTone[automation.status]}>{automation.status}</Badge>
              </span>
              <span className="crm-automation-health__meta">
                {health.stuckCount > 0 ? (
                  <span className="crm-automation-health__stuck">
                    {health.stuckCount} stuck &gt; {health.stuckSinceHours}h
                  </span>
                ) : (
                  <span className="crm-automation-health__ok">Running normally</span>
                )}
                {!health.integrationOk ? (
                  <span className="crm-automation-health__integration">
                    <PlugZap aria-hidden="true" /> Integration issue
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
