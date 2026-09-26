import {
  ChartNoAxesCombined,
  LayoutGrid,
  MapPin,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { can, type Capability } from '../permissions';

interface SecondaryNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  matchPrefix: string;
  end?: boolean;
  requires?: Capability;
}

const items: SecondaryNavItem[] = [
  { label: 'Overview', to: '/team-access', icon: LayoutGrid, matchPrefix: '/team-access', end: true },
  { label: 'Members', to: '/team-access/people', icon: Users, matchPrefix: '/team-access/people', requires: 'viewPeople' },
  { label: 'Zone routing', to: '/team-access/zones', icon: MapPin, matchPrefix: '/team-access/zones', requires: 'manageTeamsBranches' },
  { label: 'Performance', to: '/team-access/performance', icon: ChartNoAxesCombined, matchPrefix: '/team-access/performance', requires: 'viewPerformance' },
];

/**
 * The module's live operational destinations. Members = create/manage team
 * accounts (seats, roles, departments). Zone routing = map members to zones so
 * new contacts auto-assign. Performance = per-member calling report. Prototype
 * scaffolding (Structure/Work/Audit) still has routes for deep links but is kept
 * out of the primary nav to avoid clutter.
 */
export function TeamAccessSecondaryNav() {
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
    <nav className="crm-team-subnav" aria-label="Team & Access sections">
      <ul>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePrefix === item.matchPrefix;
          return (
            <li key={item.to}>
              <NavLink
                to={`${item.to}${suffix}`}
                className={isActive ? 'crm-team-subnav__link crm-team-subnav__link--active' : 'crm-team-subnav__link'}
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
