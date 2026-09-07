import {
  ChartNoAxesCombined,
  History,
  LayoutGrid,
  Network,
  Users,
  Workflow,
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
  { label: 'People', to: '/team-access/people', icon: Users, matchPrefix: '/team-access/people', requires: 'viewPeople' },
  { label: 'Structure', to: '/team-access/structure', icon: Network, matchPrefix: '/team-access/structure', requires: 'manageTeamsBranches' },
  { label: 'Work Distribution', to: '/team-access/work', icon: Workflow, matchPrefix: '/team-access/work', requires: 'manageWorkload' },
  { label: 'Performance', to: '/team-access/performance', icon: ChartNoAxesCombined, matchPrefix: '/team-access/performance', requires: 'viewPerformance' },
  { label: 'Audit', to: '/team-access/audit', icon: History, matchPrefix: '/team-access/audit', requires: 'viewAudit' },
];

/**
 * The module's six operational destinations (SIMPLIFICATION_DECISIONS.md §1).
 * Structure also covers Teams/Branches/Numbers; Work Distribution covers
 * Workload/Routing/Queues/Escalations — sub-navigation lives inside those
 * pages as tabs, not as additional top-level entries.
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
