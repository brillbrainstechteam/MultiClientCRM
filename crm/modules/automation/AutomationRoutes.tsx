import { Navigate, Route, Routes } from 'react-router-dom';
import { AutomationLayout } from './AutomationLayout';
import AutomationLibraryScreen from './screens/AutomationLibraryScreen';
import AutomationFlowsScreen from './screens/AutomationFlowsScreen';
import StarterGalleryScreen from './screens/StarterGalleryScreen';
import FlowBuilderScreen from './screens/FlowBuilderScreen';

/**
 * Automation route table (CODE_FIRST_ADAPTER.md §1 "Canonical routes").
 * Three real routes — almost everything else (validation/test/publish/
 * versions/activity/node config) is query-state on the Builder route.
 */
export function AutomationRoutes() {
  return (
    <Routes>
      <Route element={<AutomationLayout />}>
        <Route index element={<AutomationLibraryScreen />} />
        <Route path="flows" element={<AutomationFlowsScreen />} />
        <Route path="new" element={<StarterGalleryScreen />} />
        <Route path=":flowId" element={<FlowBuilderScreen />} />
        <Route path="*" element={<Navigate to="/automation" replace />} />
      </Route>
    </Routes>
  );
}
