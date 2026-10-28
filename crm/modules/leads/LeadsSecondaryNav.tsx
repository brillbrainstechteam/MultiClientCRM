import { Inbox, Radio, Binoculars } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { can, type Capability } from '@crm/modules/contacts/permissions';

/**
 * Leads module secondary navigation — the acquisition journey, in order:
 * Lead Sources (connect channels) → Lead Intake (triage/route/qualify) →
 * Find New Businesses (B2B prospecting). Reuses the Contacts sub-nav styling.
 */
interface Item { label: string; to: string; icon: LucideIcon; matchPrefix: string; requires?: Capability }

const items: Item[] = [
  { label: 'Lead Intake', to: '/leads/intake', icon: Inbox, matchPrefix: '/leads/intake' },
  { label: 'Lead Sources', to: '/leads/sources', icon: Radio, matchPrefix: '/leads/sources', requires: 'manageImports' },
  { label: 'Find New Businesses', to: '/leads/find', icon: Binoculars, matchPrefix: '/leads/find', requires: 'manageImports' },
];

export function LeadsSecondaryNav() {
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
    .filter((item) => location.pathname === item.matchPrefix || location.pathname.startsWith(`${item.matchPrefix}/`))
    .sort((a, b) => b.matchPrefix.length - a.matchPrefix.length)[0]?.matchPrefix;

  return (
    <nav className="crm-contacts-subnav" aria-label="Leads sections">
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
