import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireCapability } from '@crm/modules/contacts/components';
import { LeadsLayout } from './LeadsLayout';
import IntakeQueueScreen from '@crm/modules/contacts/screens/IntakeQueueScreen';
import ConnectionsScreen from '@crm/modules/contacts/screens/ConnectionsScreen';
import ProspectingScreen from '@crm/modules/contacts/screens/ProspectingScreen';
import LeakageScreen from './screens/LeakageScreen';

/**
 * Leads module routes (the acquisition journey). The screens are shared with the
 * old Contacts module — they moved here, not copies. /contacts/* keeps redirects
 * for any existing links.
 */
export function LeadsRoutes() {
  return (
    <Routes>
      <Route element={<LeadsLayout />}>
        <Route index element={<Navigate to="/leads/intake" replace />} />
        <Route path="intake" element={<IntakeQueueScreen />} />
        <Route
          path="leakage"
          element={<RequireCapability capability="viewReports" area="Lead Leakage"><LeakageScreen /></RequireCapability>}
        />
        <Route
          path="sources"
          element={<RequireCapability capability="manageImports" area="Lead Sources"><ConnectionsScreen /></RequireCapability>}
        />
        <Route
          path="find"
          element={<RequireCapability capability="manageImports" area="Find New Businesses"><ProspectingScreen /></RequireCapability>}
        />
        <Route path="*" element={<Navigate to="/leads/intake" replace />} />
      </Route>
    </Routes>
  );
}
