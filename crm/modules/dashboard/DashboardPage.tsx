import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import OverviewScreen from './screens/OverviewScreen';
import AlertsScreen from './screens/AlertsScreen';

/**
 * Dashboard route table (CODE_FIRST_ADAPTER.md route contract). DASH-S01 is
 * the workspace landing page; DASH-S02 is the only other full page. Every
 * other DASH-S id is a contextual overlay mounted inside DashboardLayout.
 */
export default function DashboardPage() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<OverviewScreen />} />
        <Route path="alerts" element={<AlertsScreen />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
