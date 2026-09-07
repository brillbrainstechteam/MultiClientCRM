import type { ComponentType } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { contactSettingsScreens } from '../contacts-manifest';
import { GoogleContactsModal } from '../imports/GoogleContactsModal';
import {
  AssignmentScreen,
  ClassificationScreen,
  ConsentScreen,
  ContactFieldsScreen,
  IntegrationsScreen,
  LifecycleScreen,
  PermissionsScreen,
  SourcesScreen,
  TagsScreen,
} from './ContactSettingsScreens';
import { DependencyDialog } from './settings-ui';
import type { ReactNode } from 'react';

/** CFG-CON id → screen component, keyed by route path. */
const screenByPath: Record<string, ComponentType> = {
  '/settings/contacts/fields': ContactFieldsScreen,
  '/settings/contacts/tags': TagsScreen,
  '/settings/contacts/lifecycle': LifecycleScreen,
  '/settings/contacts/classification': ClassificationScreen,
  '/settings/contacts/sources': SourcesScreen,
  '/settings/contacts/assignment': AssignmentScreen,
  '/settings/contacts/consent': ConsentScreen,
  '/settings/contacts/integrations': IntegrationsScreen,
  '/settings/contacts/permissions': PermissionsScreen,
};

/**
 * Dependency-warning copy shared across settings screens, keyed by `?confirm=`.
 * Reused ConfirmDialog surfaces the affected-records warning before a
 * destructive configuration change.
 */
const dependencyCopies: Record<string, (label: string) => { title: string; message: ReactNode; confirm: string }> = {
  'delete-field': (label) => ({
    title: `Delete field “${label}”?`,
    message: 'This field is used by 214 contacts and 1 segment. Deleting it removes the stored values and cannot be undone.',
    confirm: 'Delete field',
  }),
  'delete-tag': (label) => ({
    title: `Delete tag “${label}”?`,
    message: 'This tag is applied to contacts and referenced by segments. Deleting it removes it everywhere it is used.',
    confirm: 'Delete tag',
  }),
  'merge-tag': (label) => ({
    title: `Merge tag “${label}”?`,
    message: 'Merging moves every contact from this tag onto the target tag. This cannot be undone.',
    confirm: 'Merge tag',
  }),
  'delete-source': (label) => ({
    title: `Delete source “${label}”?`,
    message: 'Contacts keep their original source for traceability. Deleting only stops it being offered for new records.',
    confirm: 'Delete source',
  }),
};

/** Shared Settings shell: header + left nav + configuration content. */
function ContactSettingsLayout() {
  return (
    <div className="crm-con-settings">
      <PageHeader
        title="Contact configuration"
        description="Low-frequency administrative setup for the Contacts module. Lives under Settings, not daily Contacts navigation."
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Contacts' }]}
      />
      <div className="crm-con-settings__body">
        <nav className="crm-con-settings__nav" aria-label="Contact settings">
          <ul>
            {contactSettingsScreens.map((screen) => (
              <li key={screen.id}>
                <NavLink
                  to={screen.path}
                  end
                  className={({ isActive }) =>
                    isActive
                      ? 'crm-con-settings__link crm-con-settings__link--active'
                      : 'crm-con-settings__link'
                  }
                >
                  {screen.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="crm-con-settings__content">
          <Outlet />
        </div>
      </div>

      {/* Shared destructive-change warning + reused Google connection modal. */}
      <DependencyDialog copies={dependencyCopies} />
      <GoogleContactsModal />
    </div>
  );
}

/** Registers /settings/contacts/* (CFG-CON-S01–S09). */
export function ContactSettingsRoutes() {
  return (
    <Routes>
      <Route element={<ContactSettingsLayout />}>
        <Route index element={<Navigate to="/settings/contacts/fields" replace />} />
        {contactSettingsScreens.map((screen) => {
          const Screen = screenByPath[screen.path];
          return (
            <Route
              key={screen.id}
              path={screen.path.replace(/^\/settings\/contacts\/?/, '')}
              element={Screen ? <Screen /> : null}
            />
          );
        })}
        <Route path="*" element={<Navigate to="/settings/contacts/fields" replace />} />
      </Route>
    </Routes>
  );
}
