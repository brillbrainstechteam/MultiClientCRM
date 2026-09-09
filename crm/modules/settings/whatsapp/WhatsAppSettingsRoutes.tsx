import { Route, Routes } from 'react-router-dom';
import GuidedSetup from '@crm/modules/onboarding/screens/GuidedSetup';
import NumberDetail from './NumberDetail';
import NumbersRealScreen from './NumbersRealScreen';

/**
 * Registers `/settings/whatsapp/*` (CODE_FIRST_ADAPTER.md "Ongoing Number
 * Registry" / "Number Detail" / "Add Number"). Mounted inside the normal
 * `AppShell` — unlike first-time Guided Setup, adding a number here happens
 * from within an already-onboarded workspace.
 */
export function WhatsAppSettingsRoutes() {
  return (
    <Routes>
      <Route index element={<NumbersRealScreen />} />
      <Route path="add-number" element={<GuidedSetup mode="add-number" />} />
      <Route path="numbers/:numberId" element={<NumberDetail />} />
    </Routes>
  );
}
