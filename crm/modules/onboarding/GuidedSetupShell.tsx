import { LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, Select } from '@crm/design-system';
import type { RoleKey } from '@crm/mock-data';

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'agent', label: 'Agent' },
];

/**
 * Dedicated first-time setup chrome (SKILL.md "preserve correct shell"). Kept
 * deliberately lighter than `AppShell` — no module sidebar, no scope bar —
 * because a client mid first-time setup has not "entered" the CRM workspace
 * yet. `Save & Exit` always returns to Setup Home; progress is never lost
 * because every step lives in the URL.
 */
export function GuidedSetupShell() {
  const navigate = useNavigate();
  const { workspace, role, setScope } = useWorkspace();

  return (
    <div className="crm-setup-shell">
      <header className="crm-setup-shell__bar">
        <div className="crm-setup-shell__brand">
          <span className="crm-setup-shell__tile" aria-hidden="true">
            TT
          </span>
          <span className="crm-setup-shell__wordmark">TalkTrack</span>
          <span className="crm-setup-shell__workspace">{workspace.name}</span>
        </div>
        <div className="crm-setup-shell__actions">
          <div className="crm-setup-shell__review-control">
            <Select
              label="View as role"
              size="sm"
              options={roleOptions}
              value={role}
              onChange={(event) => setScope({ role: event.target.value as RoleKey })}
            />
          </div>
          <Button variant="secondary" size="sm" iconLeft={<LogOut />} onClick={() => navigate('/setup')}>
            Save &amp; exit
          </Button>
        </div>
      </header>
      <main className="crm-setup-shell__content">
        <div className="crm-setup-shell__container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
