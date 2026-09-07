import { BarChart3, LayoutGrid, ListChecks, PhoneCall, History as HistoryIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { can, type CallingCapability } from '../permissions';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  matchPrefix: string;
  end?: boolean;
  requires?: CallingCapability;
}

const items: NavItem[] = [
  { label: 'Call Desk', to: '/calling', icon: LayoutGrid, matchPrefix: '/calling', end: true },
  { label: 'Queue', to: '/calling/queue', icon: PhoneCall, matchPrefix: '/calling/queue' },
  { label: 'Call History', to: '/calling/history', icon: HistoryIcon, matchPrefix: '/calling/history' },
  { label: 'Call Lists', to: '/calling/lists', icon: ListChecks, matchPrefix: '/calling/lists' },
  { label: 'Analytics', to: '/calling/analytics', icon: BarChart3, matchPrefix: '/calling/analytics', requires: 'calling.view_analytics' },
];

/**
 * Calling secondary navigation — module tabs inside the CRM shell so every
 * sub-page (History, Lists, Analytics, Workspace) has a way back to the Call
 * Desk. Scope query params are preserved when switching tabs.
 */
export function CallingSecondaryNav() {
  const location = useLocation();
  const { role } = useWorkspace();

  const scope = new URLSearchParams();
  const current = new URLSearchParams(location.search);
  for (const key of ['role', 'branchId', 'whatsappNumberId']) {
    const value = current.get(key);
    if (value) scope.set(key, value);
  }
  const suffix = scope.toString() ? `?${scope.toString()}` : '';

  const visibleItems = items.filter((item) => !item.requires || can(role, item.requires));

  const activePrefix = visibleItems
    .filter((item) =>
      item.end
        ? location.pathname === item.matchPrefix
        : location.pathname === item.matchPrefix || location.pathname.startsWith(`${item.matchPrefix}/`),
    )
    .sort((a, b) => b.matchPrefix.length - a.matchPrefix.length)[0]?.matchPrefix;

  return (
    <nav className="crm-calling-subnav" aria-label="Calling sections">
      <ul>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePrefix === item.matchPrefix;
          return (
            <li key={item.to}>
              <NavLink
                to={`${item.to}${suffix}`}
                className={isActive ? 'crm-calling-subnav__link crm-calling-subnav__link--active' : 'crm-calling-subnav__link'}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
