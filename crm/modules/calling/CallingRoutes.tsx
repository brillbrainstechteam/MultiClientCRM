import { Navigate, Route, Routes } from 'react-router-dom';
import { CallingLayout } from './CallingLayout';
import CallAnalyticsScreen from './screens/CallAnalyticsScreen';
import CallDeskScreen from './screens/CallDeskScreen';
import CallHistoryScreen from './screens/CallHistoryScreen';
import CallListDetailScreen from './screens/CallListDetailScreen';
import CallListsScreen from './screens/CallListsScreen';
import CallQueueScreen from './screens/CallQueueScreen';
import CallWorkspaceScreen from './screens/CallWorkspaceScreen';
import CreateCallListWizard from './screens/CreateCallListWizard';

/**
 * Calling route table (CODE_FIRST_ADAPTER.md §1). Screens are added as their
 * batch completes; everything else falls back to Call Desk rather than a
 * dead end.
 */
export function CallingRoutes() {
  return (
    <Routes>
      <Route element={<CallingLayout />}>
        <Route index element={<CallDeskScreen />} />
        <Route path="queue" element={<CallQueueScreen />} />
        <Route path="task/:taskId" element={<CallWorkspaceScreen />} />
        <Route path="history" element={<CallHistoryScreen />} />
        <Route path="lists" element={<CallListsScreen />} />
        <Route path="lists/new" element={<CreateCallListWizard />} />
        <Route path="lists/:listId" element={<CallListDetailScreen />} />
        <Route path="analytics" element={<CallAnalyticsScreen />} />
        <Route path="*" element={<Navigate to="/calling" replace />} />
      </Route>
    </Routes>
  );
}
