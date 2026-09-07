import { Outlet } from 'react-router-dom';
import { CallingDataProvider } from './calling-data-context';
import { CallingSecondaryNav } from './components/CallingSecondaryNav';

/**
 * Wraps every Calling route with the module's session-scoped data provider
 * (log outcome / follow-up / assign / list actions all need to be visible
 * across the Desk, Queue, Workspace, History and Lists screens) and a
 * persistent secondary nav so every sub-page can return to the Call Desk.
 */
export function CallingLayout() {
  return (
    <CallingDataProvider>
      <div className="crm-calling-shell">
        <CallingSecondaryNav />
        <div className="crm-calling-shell__body">
          <Outlet />
        </div>
      </div>
    </CallingDataProvider>
  );
}
