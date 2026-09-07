import { Outlet, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, PermissionRestricted } from '@crm/design-system';
import { can } from './permissions';

/**
 * Deep-link guard for the whole module (mirrors `AutomationLayout`). Every
 * role can see Catalogue & Orders in the shell, but `catalogue.view` still
 * gates a direct URL — no role/scope combination should ever be able to see
 * a screen the shell wouldn't otherwise offer it (CLAUDE.md §9).
 */
export function CatalogueOrdersLayout() {
  const { visibleModules, currentUser, role } = useWorkspace();
  const navigate = useNavigate();

  if (!visibleModules.includes('catalogue-orders') || !can(role, 'catalogue.view')) {
    return (
      <PermissionRestricted
        title="You do not have access to this area"
        description={`Your role (${currentUser.roleLabel}) cannot open Catalogue & Orders. Ask a workspace owner if you need access.`}
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
