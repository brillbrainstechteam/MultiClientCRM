import { Route, Routes } from 'react-router-dom';
import { ProviderAdminShell } from './ProviderAdminShell';
import ProviderAdminHome from './ProviderAdminHome';
import ProviderClientDetail from './ProviderClientDetail';

/** Registers `/provider/*` — a separate shell/route family (CODE_FIRST_ADAPTER.md "Provider Admin"). */
export function ProviderAdminRoutes() {
  return (
    <Routes>
      <Route element={<ProviderAdminShell />}>
        <Route index element={<ProviderAdminHome />} />
        <Route path="clients/:tenantId" element={<ProviderClientDetail />} />
      </Route>
    </Routes>
  );
}
