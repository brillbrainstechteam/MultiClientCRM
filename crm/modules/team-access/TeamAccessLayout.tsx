import { Outlet, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, PermissionRestricted } from '@crm/design-system';
import { TeamAccessSecondaryNav } from './components';
import { OperationalOverlays } from './overlays/OperationalOverlays';

/**
 * Wraps every Team & Access page with the module's secondary navigation. The
 * global shell (sidebar + top bar + scope bar) is provided by AppShell above
 * this. `agent` already loses the module from the sidebar
 * (`roleHiddenModules`); this catches direct deep links too.
 */
export function TeamAccessLayout() {
  const navigate = useNavigate();
  const { visibleModules, currentUser } = useWorkspace();

  if (!visibleModules.includes('team-access')) {
    return (
      <PermissionRestricted
        title="You do not have access to this area"
        description={`Your role (${currentUser.roleLabel}) cannot open Team & Access. Ask a workspace owner if you need access.`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        }
      />
    );
  }

  return (
    <div className="crm-team-layout">
      <TeamAccessSecondaryNav />
      <div className="crm-team-layout__body">
        <Outlet />
      </div>
      <OperationalOverlays />
    </div>
  );
}
