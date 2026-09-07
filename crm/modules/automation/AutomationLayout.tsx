import { Outlet, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, PermissionRestricted } from '@crm/design-system';

/**
 * Deep-link guard for the whole module. The shell already hides Automation
 * from `agent` in the left nav (`workspace-context.tsx` `roleHiddenModules`);
 * this stops a direct URL visit from leaking the module to a role that
 * should never see it (mirrors `ModulePlaceholder`'s same check).
 */
export function AutomationLayout() {
  const { visibleModules, currentUser } = useWorkspace();
  const navigate = useNavigate();

  if (!visibleModules.includes('automation')) {
    return (
      <PermissionRestricted
        title="You do not have access to this area"
        description={`Your role (${currentUser.roleLabel}) cannot open Journeys & Automation. Ask a workspace owner if you need access.`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        }
      />
    );
  }

  return <Outlet />;
}
