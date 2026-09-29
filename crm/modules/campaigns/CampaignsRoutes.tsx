import { Navigate, Route, Routes } from 'react-router-dom';
import { CampaignsLayout } from './CampaignsLayout';
import CampaignsOverviewScreen from './screens/CampaignsOverviewScreen';
import CampaignDetailScreen from './screens/CampaignDetailScreen';
import CampaignBuilderScreen from './screens/CampaignBuilderScreen';
import CampaignsCompareScreen from './screens/CampaignsCompareScreen';
import PlannerScreen from './screens/PlannerScreen';

/**
 * Campaigns route table (CODE_FIRST_ADAPTER.md "Canonical routes"). `new` is
 * a real screen from Batch 2 onward (Setup/Template are fully built; later
 * steps show an in-shell placeholder until Batch 3/4 land — see
 * CampaignBuilderScreen). `compare` is real from Batch 6 onward.
 */
export function CampaignsRoutes() {
  return (
    <Routes>
      <Route element={<CampaignsLayout />}>
        <Route index element={<CampaignsOverviewScreen />} />
        <Route path="new" element={<CampaignBuilderScreen />} />
        <Route path="planner" element={<PlannerScreen />} />
        <Route path="compare" element={<CampaignsCompareScreen />} />
        <Route path=":campaignId" element={<CampaignDetailScreen />} />
        <Route path="*" element={<Navigate to="/campaigns" replace />} />
      </Route>
    </Routes>
  );
}
