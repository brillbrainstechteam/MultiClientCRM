import { BookOpenCheck, ClipboardCheck, LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

interface SecondaryNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  matchPrefix: string;
  end?: boolean;
}

const items: SecondaryNavItem[] = [
  { label: 'Repository', to: '/templates', icon: LayoutGrid, matchPrefix: '/templates', end: true },
  { label: 'Ready-Made Library', to: '/templates/library', icon: BookOpenCheck, matchPrefix: '/templates/library' },
  { label: 'Internal Approvals', to: '/templates/approvals', icon: ClipboardCheck, matchPrefix: '/templates/approvals' },
];

/** Templates' own tabs inside the shared CRM shell (mirrors Contacts' secondary nav). */
export function TemplatesSecondaryNav() {
  const location = useLocation();

  const scope = new URLSearchParams();
  const current = new URLSearchParams(location.search);
  for (const key of ['role', 'branchId', 'whatsappNumberId']) {
    const value = current.get(key);
    if (value) scope.set(key, value);
  }
  const suffix = scope.toString() ? `?${scope.toString()}` : '';

  const activePrefix = items
    .filter((item) =>
      item.end
        ? location.pathname === item.matchPrefix
        : location.pathname === item.matchPrefix || location.pathname.startsWith(`${item.matchPrefix}/`),
    )
    .sort((a, b) => b.matchPrefix.length - a.matchPrefix.length)[0]?.matchPrefix;

  return (
    <nav className="crm-templates-subnav" aria-label="Templates sections">
      <ul>
        {items.map((item) => {
          const Icon = item.icon;
          const active = activePrefix === item.matchPrefix;
          return (
            <li key={item.to}>
              <NavLink
                to={`${item.to}${suffix}`}
                className={active ? 'crm-templates-subnav__link crm-templates-subnav__link--active' : 'crm-templates-subnav__link'}
                aria-current={active ? 'page' : undefined}
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
