import { CalendarClock, ChevronRight, MessageSquare, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WidgetShell } from '@crm/design-system';
import { useDashboardHref } from '../dashboard-links';
import type { TodaysWork } from '../dashboard-selectors';

export interface TodaysWorkPanelProps {
  work: TodaysWork;
  contextLabel?: string;
  /** `personal` reframes the labels for the Executive dashboard. */
  scope?: 'team' | 'personal';
}

interface Item {
  icon: LucideIcon;
  label: string;
  count: number;
  to: string;
}

/**
 * Compact action panel: each item shows a count and opens the relevant filtered
 * screen. Answers "what do I / my team need to do next?".
 */
export function TodaysWorkPanel({ work, contextLabel, scope = 'team' }: TodaysWorkPanelProps) {
  const navigate = useNavigate();
  const dashHref = useDashboardHref();
  const mine = scope === 'personal' ? '&assignee=me' : '';

  const items: Item[] = [
    {
      icon: MessageSquare,
      label: scope === 'personal' ? 'My customers awaiting reply' : 'Customers awaiting reply',
      count: work.awaitingReply,
      to: `/inbox?status=pending${mine}&returnTo=%2Fdashboard`,
    },
    {
      icon: CalendarClock,
      label: scope === 'personal' ? 'My follow-ups to complete' : 'Follow-ups to complete',
      count: work.followupsToComplete,
      to: `/calling?status=due${mine}&returnTo=%2Fdashboard`,
    },
    {
      icon: UserPlus,
      label: 'Unassigned enquiries',
      count: work.unassigned,
      to: `/inbox?status=unassigned&returnTo=%2Fdashboard`,
    },
  ];

  return (
    <WidgetShell title="Today’s work" icon={<CalendarClock />} contextLabel={contextLabel}>
      <ul className="crm-todays-work">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <button className="crm-todays-work__item" onClick={() => navigate(dashHref(item.to))}>
                <span className="crm-todays-work__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="crm-todays-work__label">{item.label}</span>
                <span className="crm-todays-work__count">{item.count}</span>
                <ChevronRight className="crm-todays-work__chevron" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </WidgetShell>
  );
}
