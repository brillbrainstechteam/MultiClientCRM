import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireCapability } from '../components';
import { CustomRoleDrawer } from '../overlays/CustomRoleDrawer';
import ZoneAssignmentSettings from '@crm/modules/contacts/zones/ZoneAssignmentSettings';
import RoleDetailScreen from './RoleDetailScreen';
import RoleDirectoryScreen from './RoleDirectoryScreen';

/**
 * Registers /settings/team/roles* (TSET-S01/S02) plus the Custom Role wizard
 * overlay, and /settings/team/zones — the administrative Zone Assignment area
 * (same shared config as Contacts → Zone & Assignment Settings, §6).
 * Owner-only (permissions.ts `manageRoles`).
 */
export function RolesSettingsRoutes() {
  return (
    <RequireCapability capability="manageRoles" area="Roles & Permissions">
      <Routes>
        <Route index element={<RoleDirectoryScreen />} />
        <Route path="zones" element={<ZoneAssignmentSettings context="team" />} />
        <Route path=":roleId" element={<RoleDetailScreen />} />
        <Route path="*" element={<Navigate to="/settings/team/roles" replace />} />
      </Routes>
      <CustomRoleDrawer />
    </RequireCapability>
  );
}
