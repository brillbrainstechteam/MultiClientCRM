import { Outlet } from 'react-router-dom';
import { TemplatesSecondaryNav } from './components';
import { CreateTemplateModal } from './overlays/CreateTemplateModal';
import { RejectionDrawer } from './overlays/RejectionDrawer';
import { BulkActionModal } from './overlays/BulkActionModal';

/**
 * Wraps every Templates page with the module's secondary navigation. Overlays
 * that can open over any page via query state are mounted once here (mirrors
 * ContactsLayout): Create Template modal (`?modal=create`), Rejection &
 * Resolution drawer (`?drawer=rejection`) and the bulk-action modal
 * (`?mode=bulk&modal=bulk-action`).
 */
export function TemplatesLayout() {
  return (
    <div className="crm-templates-layout">
      <TemplatesSecondaryNav />
      <div className="crm-templates-layout__body">
        <Outlet />
      </div>
      <CreateTemplateModal />
      <RejectionDrawer />
      <BulkActionModal />
    </div>
  );
}
