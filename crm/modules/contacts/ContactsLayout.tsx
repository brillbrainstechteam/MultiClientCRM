import { Outlet } from 'react-router-dom';
import { ContactsSecondaryNav } from './components';
import { ContactDrawer } from './ContactDrawer';
import { GoogleContactsModal } from './imports/GoogleContactsModal';
import { OperationalOverlays } from './overlays/OperationalOverlays';

/**
 * Wraps every Contacts page with the module's secondary navigation. The global
 * shell (sidebar + top bar + scope bar) is provided by AppShell above this.
 * The Add/Edit drawer (CON-S19) and the operational overlays (CON-S12–S18) are
 * mounted here so they can open over any page via query state.
 */
export function ContactsLayout() {
  return (
    <div className="crm-contacts-layout">
      <ContactsSecondaryNav />
      <div className="crm-contacts-layout__body">
        <Outlet />
      </div>
      <ContactDrawer />
      <OperationalOverlays />
      <GoogleContactsModal />
    </div>
  );
}
