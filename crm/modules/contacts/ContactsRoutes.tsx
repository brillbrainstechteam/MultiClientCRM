import type { ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireCapability } from './components';
import { ContactsLayout } from './ContactsLayout';
import { ContactsScreenPlaceholder } from './ContactsScreenPlaceholder';
import type { Capability } from './permissions';
import AllContactsScreen from './screens/AllContactsScreen';
import Customer360Screen from './screens/Customer360Screen';
import OverviewScreen from './screens/OverviewScreen';
import SegmentsScreen from './screens/SegmentsScreen';
import SegmentDetailScreen from './screens/SegmentDetailScreen';
import SegmentBuilderScreen from './screens/SegmentBuilderScreen';
import ImportsHubScreen from './screens/ImportsHubScreen';
import ImportJobDetailScreen from './screens/ImportJobDetailScreen';
import DataQualityScreen from './screens/DataQualityScreen';
import ContactReportsScreen from './screens/ContactReportsScreen';
import DuplicateMergeScreen from './screens/DuplicateMergeScreen';
import { ImportWizard } from './imports/ImportWizard';
import ZoneAssignmentSettings from './zones/ZoneAssignmentSettings';
import {
  contactPages,
  importWizardSteps,
  segmentEditScreen,
  type ContactScreen,
} from './contacts-manifest';

/**
 * Screens implemented so far (keyed by full-page path since CON-S06 shares its
 * id across new/edit). Everything else stays a registered placeholder.
 */
const implemented: Record<string, ComponentType> = {
  '/contacts': OverviewScreen,
  '/contacts/all': AllContactsScreen,
  '/contacts/customer/:contactId': Customer360Screen,
  '/contacts/segments': SegmentsScreen,
  '/contacts/segments/:segmentId': SegmentDetailScreen,
  '/contacts/segments/new': SegmentBuilderScreen,
  '/contacts/segments/:segmentId/edit': SegmentBuilderScreen,
  '/contacts/imports': ImportsHubScreen,
  '/contacts/imports/jobs/:jobId': ImportJobDetailScreen,
  '/contacts/data-quality': DataQualityScreen,
  '/contacts/data-quality/duplicates/:clusterId': DuplicateMergeScreen,
  '/contacts/reports': ContactReportsScreen,
  // Every wizard step renders the one ImportWizard, which derives its step from the URL.
  '/contacts/imports/new/method': ImportWizard,
  '/contacts/imports/new/source': ImportWizard,
  '/contacts/imports/new/mapping': ImportWizard,
  '/contacts/imports/new/validation': ImportWizard,
  '/contacts/imports/new/extraction': ImportWizard,
  '/contacts/imports/new/preview': ImportWizard,
  '/contacts/imports/new/processing': ImportWizard,
  '/contacts/imports/new/results': ImportWizard,
};

/**
 * Deep-link capability guards: an agent hitting these routes gets an
 * access-denied state instead of the protected view (CLAUDE.md §9).
 */
const routeGuards: Record<string, { capability: Capability; area: string }> = {
  '/contacts/imports': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/imports/jobs/:jobId': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/imports/new/method': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/imports/new/source': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/imports/new/mapping': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/imports/new/validation': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/imports/new/extraction': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/imports/new/preview': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/imports/new/processing': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/imports/new/results': { capability: 'manageImports', area: 'Imports & Sync' },
  '/contacts/reports': { capability: 'viewReports', area: 'Contact Reports' },
};

/** Turn an absolute manifest path into a path relative to `/contacts`. */
function childPath(screen: ContactScreen): string {
  return screen.path.replace(/^\/contacts\/?/, '');
}

function screenElement(screen: ContactScreen) {
  const Implemented = implemented[screen.path];
  const element = Implemented ? <Implemented /> : <ContactsScreenPlaceholder screen={screen} />;
  const guard = routeGuards[screen.path];
  return guard ? (
    <RequireCapability capability={guard.capability} area={guard.area}>
      {element}
    </RequireCapability>
  ) : (
    element
  );
}

function screenRoute(screen: ContactScreen) {
  const relative = childPath(screen);
  const element = screenElement(screen);
  if (relative === '') {
    return <Route key={screen.path} index element={element} />;
  }
  return <Route key={screen.path} path={relative} element={element} />;
}

/**
 * Contacts route table (adapter route contract). Batch 1 fills in CON-S01/S02/
 * S03; CON-S19 opens as a drawer over these pages (mounted in ContactsLayout).
 */
export function ContactsRoutes() {
  return (
    <Routes>
      <Route element={<ContactsLayout />}>
        {contactPages.map(screenRoute)}
        {screenRoute(segmentEditScreen)}
        {importWizardSteps.map(screenRoute)}
        <Route path="zones" element={<ZoneAssignmentSettings context="contacts" />} />
        <Route path="imports/new" element={<Navigate to="/contacts/imports/new/method" replace />} />
        <Route path="*" element={<Navigate to="/contacts" replace />} />
      </Route>
    </Routes>
  );
}
