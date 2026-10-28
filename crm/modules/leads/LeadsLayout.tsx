import { Outlet } from 'react-router-dom';
import { LeadsSecondaryNav } from './LeadsSecondaryNav';

/**
 * Wraps every Leads page with the module's secondary navigation. The global
 * shell (sidebar + top bar + scope bar) is provided by AppShell above this.
 * Reuses the Contacts layout CSS so the two modules look identical.
 */
export function LeadsLayout() {
  return (
    <div className="crm-contacts-layout">
      <LeadsSecondaryNav />
      <div className="crm-contacts-layout__body">
        <Outlet />
      </div>
    </div>
  );
}
