import { Navigate, Route, Routes } from 'react-router-dom';
import { TemplatesLayout } from './TemplatesLayout';
import TemplatesRepositoryScreen from './screens/TemplatesRepositoryScreen';
import TemplateDetailScreen from './screens/TemplateDetailScreen';
import TemplateComposerScreen from './screens/TemplateComposerScreen';
import TemplateLibraryScreen from './screens/TemplateLibraryScreen';
import TemplateApprovalsScreen from './screens/TemplateApprovalsScreen';
import TemplatePickerHostScreen from './screens/TemplatePickerHostScreen';

/**
 * Templates route table (CODE_FIRST_ADAPTER.md "Canonical route/state
 * manifest"). Most TPL-S ids live as query-state on these few real routes
 * rather than one route per screen — see `templates-manifest.ts` for the
 * full screen-id audit table.
 */
export function TemplatesRoutes() {
  return (
    <Routes>
      <Route element={<TemplatesLayout />}>
        <Route index element={<TemplatesRepositoryScreen />} />
        <Route path="new" element={<TemplateComposerScreen />} />
        <Route path="library" element={<TemplateLibraryScreen />} />
        <Route path="approvals" element={<TemplateApprovalsScreen />} />
        <Route path="picker" element={<TemplatePickerHostScreen />} />
        <Route path=":templateId" element={<TemplateDetailScreen />} />
        <Route path="*" element={<Navigate to="/templates" replace />} />
      </Route>
    </Routes>
  );
}
