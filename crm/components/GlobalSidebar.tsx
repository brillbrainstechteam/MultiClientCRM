import { Lock } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useConnectionStatus } from '@crm/app/use-connection-status';
import { useWorkspace } from '@crm/app/workspace-context';
import { navGroups, navItems } from '@crm/routes/navigation';
import { WorkspaceIdentity } from './WorkspaceIdentity';

/**
 * Primary module navigation. Modules hidden from the acting role are not
 * rendered at all — their existence must not be exposed (CLAUDE.md §9).
 */
export function GlobalSidebar() {
  const { visibleModules } = useWorkspace();
  const { connected } = useConnectionStatus();
  const location = useLocation();

  // Scope selections travel with navigation so cross-module context survives.
  const preservedScope = new URLSearchParams();
  const current = new URLSearchParams(location.search);
  for (const key of ['role', 'branchId', 'whatsappNumberId']) {
    const value = current.get(key);
    if (value) preservedScope.set(key, value);
  }
  const suffix = preservedScope.toString() ? `?${preservedScope.toString()}` : '';

  return (
    <nav className="crm-sidebar" aria-label="Modules">
      <WorkspaceIdentity />

      <div className="crm-sidebar__scroll">
        {navGroups.map((group) => {
          const items = navItems.filter(
            (item) => item.group === group.key && visibleModules.includes(item.key),
          );
          if (items.length === 0) return null;

          return (
            <section key={group.key} className="crm-sidebar__group">
              <h2 className="crm-sidebar__group-label">{group.label}</h2>
              <ul>
                {items.map((item) => {
                  const Icon = item.icon;
                  const locked = !connected && Boolean(item.requiresConnection);
                  return (
                    <li key={item.key}>
                      <NavLink
                        to={`${item.path}${suffix}`}
                        className={({ isActive }) =>
                          [
                            'crm-sidebar__link',
                            isActive ? 'crm-sidebar__link--active' : '',
                            locked ? 'crm-sidebar__link--locked' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')
                        }
                        title={locked ? 'Connect a WhatsApp number to use this' : undefined}
                      >
                        <Icon className="crm-sidebar__icon" aria-hidden="true" />
                        <span className="crm-sidebar__label">{item.label}</span>
                        {locked ? <Lock className="crm-sidebar__lock" aria-label="Locked until connected" /> : null}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="crm-sidebar__endorsement">
        <span className="crm-sidebar__endorsement-label">An initiative by</span>
        <span className="crm-sidebar__endorsement-name">BrillBrains Consultants</span>
      </div>
    </nav>
  );
}
