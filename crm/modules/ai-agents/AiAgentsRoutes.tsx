import { Navigate, Route, Routes } from 'react-router-dom';
import { AiAgentsLayout } from './AiAgentsLayout';
import AgentsLibraryScreen from './screens/AgentsLibraryScreen';
import AgentCreateScreen from './screens/AgentCreateScreen';
import AgentDetailScreen from './screens/AgentDetailScreen';
import TestLabScreen from './screens/TestLabScreen';
import UsageCostScreen from './screens/UsageCostScreen';
import AgentPickerHostScreen from './screens/AgentPickerHostScreen';

/**
 * AI Agents route table (CODE_FIRST_ADAPTER.md "Canonical routes"). Four
 * primary surfaces; Knowledge/Safety/Versions/Activity live as `?tab=` state
 * on the Setup/Detail route rather than separate pages.
 */
export function AiAgentsRoutes() {
  return (
    <Routes>
      <Route element={<AiAgentsLayout />}>
        <Route index element={<AgentsLibraryScreen />} />
        <Route path="new" element={<AgentCreateScreen />} />
        <Route path="usage" element={<UsageCostScreen />} />
        <Route path="picker" element={<AgentPickerHostScreen />} />
        <Route path=":agentId/test" element={<TestLabScreen />} />
        <Route path=":agentId" element={<AgentDetailScreen />} />
        <Route path="*" element={<Navigate to="/ai-agents" replace />} />
      </Route>
    </Routes>
  );
}
