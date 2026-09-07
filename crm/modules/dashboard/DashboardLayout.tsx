import { Outlet } from 'react-router-dom';
import { AlertStatusProvider } from './alert-status-context';
import { DashboardOverlays } from './overlays/DashboardOverlays';

/**
 * Wraps every Dashboard route. The global shell (sidebar + top bar + scope
 * bar) is provided by AppShell above this. Contextual overlays (DASH-S03–S16)
 * are mounted here so they can open over either Dashboard page via query
 * state, the same pattern Contacts uses for CON-S12–S19.
 */
export function DashboardLayout() {
  return (
    <AlertStatusProvider>
      <Outlet />
      <DashboardOverlays />
    </AlertStatusProvider>
  );
}
