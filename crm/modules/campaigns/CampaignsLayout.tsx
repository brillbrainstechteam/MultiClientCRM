import { Outlet } from 'react-router-dom';
import { CampaignFilterDrawer } from './overlays/CampaignFilterDrawer';

/**
 * Wraps every Campaigns page with the shell the whole module shares. The
 * Filter Drawer (CAM-DR01) is mounted once here so it can open over the
 * Overview page via `?drawer=filters` (mirrors ContactsLayout/TemplatesLayout).
 */
export function CampaignsLayout() {
  return (
    <div className="crm-campaigns-layout">
      <Outlet />
      <CampaignFilterDrawer />
    </div>
  );
}
