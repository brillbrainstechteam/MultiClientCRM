import {
  ChartNoAxesCombined,
  LayoutGrid,
  MapPin,
  ShieldCheck,
  Upload,
  Users,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { can, type Capability } from '../permissions';

interface SecondaryNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Match nested routes so deep pages keep the parent tab active. */
  matchPrefix: string;
  /** `end` for the overview so it isn't active on every child route. */
  end?: boolean;
  /** When set, the tab is hidden from roles lacking this capability. */
  requires?: Capability;
}

const items: SecondaryNavItem[] = [
  { label: 'Overview', to: '/contacts', icon: LayoutGrid, matchPrefix: '/contacts', end: true },
  { label: 'All Contacts', to: '/contacts/all', icon: Users, matchPrefix: '/contacts/all' },
  { label: 'Segments', to: '/contacts/segments', icon: Layers, matchPrefix: '/contacts/segments' },
  { label: 'Imports & Sync', to: '/contacts/imports', icon: Upload, matchPrefix: '/contacts/imports', requires: 'manageImports' },
  {
    label: 'Data Quality',
    to: '/contacts/data-quality',
    icon: ShieldCheck,
    matchPrefix: '/contacts/data-quality',
  },
  {
    label: 'Reports',
    to: '/contacts/reports',
    icon: ChartNoAxesCombined,
    matchPrefix: '/contacts/reports',
    requires: 'viewReports',
  },
  {
    label: 'Zones',
    to: '/contacts/zones',
    icon: MapPin,
    matchPrefix: '/contacts/zones',
  },
];

/**
 * Contacts secondary navigation — the module's own tabs inside the global CRM
 * shell. Scope query params are preserved so switching tabs keeps branch/number
 * context (DOCX non-negotiable rule: Contacts stays inside the shell).
 */
export function ContactsSecondaryNav() {
  const location = useLocation();
  const { role } = useWorkspace();

  const scope = new URLSearchParams();
  const current = new URLSearchParams(location.search);
  for (const key of ['role', 'branchId', 'whatsappNumberId']) {
    const value = current.get(key);
    if (value) scope.set(key, value);
  }
  const suffix = scope.toString() ? `?${scope.toString()}` : '';

  // Hide tabs a role can never open, rather than showing a dead link.
  const visibleItems = items.filter((item) => !item.requires || can(role, item.requires));

  const activePrefix = visibleItems
    .filter((item) =>
      item.end
        ? location.pathname === item.matchPrefix
        : location.pathname === item.matchPrefix ||
          location.pathname.startsWith(`${item.matchPrefix}/`),
    )
    .sort((a, b) => b.matchPrefix.length - a.matchPrefix.length)[0]?.matchPrefix;

  return (
    <nav className="crm-contacts-subnav" aria-label="Contacts sections">
      <ul>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePrefix === item.matchPrefix;
          return (
            <li key={item.to}>
              <NavLink
                to={`${item.to}${suffix}`}
                className={isActive ? 'crm-contacts-subnav__link crm-contacts-subnav__link--active' : 'crm-contacts-subnav__link'}
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
