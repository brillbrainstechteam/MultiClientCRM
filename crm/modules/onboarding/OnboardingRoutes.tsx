import { Route, Routes } from 'react-router-dom';
import { GuidedSetupShell } from './GuidedSetupShell';
import GuidedSetup from './screens/GuidedSetup';
import Ready from './screens/Ready';
import SetupHome from './screens/SetupHome';

/**
 * Onboarding route table (CODE_FIRST_ADAPTER.md §1). Mounted at `/setup/*`,
 * top-level and outside `AppShell` — a client mid first-time setup uses the
 * dedicated `GuidedSetupShell`, not the full authenticated CRM chrome.
 */
export function OnboardingRoutes() {
  return (
    <Routes>
      <Route element={<GuidedSetupShell />}>
        <Route index element={<SetupHome />} />
        <Route path="connect" element={<GuidedSetup mode="first-time" />} />
        <Route path="ready" element={<Ready />} />
      </Route>
    </Routes>
  );
}
