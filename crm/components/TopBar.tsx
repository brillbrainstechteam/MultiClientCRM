import { Bell, CircleHelp } from 'lucide-react';
import { useAppSession } from '@crm/app/app-session';
import { useWorkspace } from '@crm/app/workspace-context';
import { Avatar, IconButton, SearchField, Select } from '@crm/design-system';
import type { RoleKey } from '@crm/mock-data';

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'agent', label: 'Agent' },
];

const connectionOptions = [
  { value: 'connected', label: 'Connected' },
  { value: 'new', label: 'New (not connected)' },
];

/**
 * Global top bar: search affordance, notifications and the acting user.
 *
 * The role switcher is a prototype-review control, not a product feature — it
 * writes `?role=` so reviewers can capture each permission variant by URL.
 */
export function TopBar() {
  const { currentUser, role, setScope } = useWorkspace();
  const { connected, setConnected } = useAppSession();

  return (
    <header className="crm-topbar">
      <SearchField
        label="Search across the workspace"
        placeholder="Search contacts, conversations, campaigns…"
        width="380px"
        disabled
        title="Global search is defined by a later batch"
      />

      <div className="crm-topbar__right">
        {/* Prototype review controls — flip workspace state and acting role to
            reach every screen state. In production these come from real auth. */}
        <div className="crm-topbar__review-control">
          <Select
            label="Workspace"
            size="sm"
            options={connectionOptions}
            value={connected ? 'connected' : 'new'}
            onChange={(event) => setConnected(event.target.value === 'connected')}
          />
          <Select
            label="View as role"
            size="sm"
            options={roleOptions}
            value={role}
            onChange={(event) => setScope({ role: event.target.value as RoleKey })}
          />
        </div>

        <IconButton label="Help" icon={<CircleHelp />} disabled />
        <IconButton label="Notifications" icon={<Bell />} disabled />

        <div className="crm-topbar__user">
          <Avatar
            initials={currentUser.initials}
            name={currentUser.name}
            availability={currentUser.availability}
          />
          <span className="crm-topbar__user-text">
            <span className="crm-topbar__user-name">{currentUser.name}</span>
            <span className="crm-topbar__user-role">{currentUser.roleLabel}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
