import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, PermissionRestricted } from '@crm/design-system';
import { can, type Capability } from '../permissions';

/**
 * Deep-link guard for Team & Access screens. `agent` already loses the whole
 * module from the sidebar (`roleHiddenModules`); this additionally
 * differentiates owner-only areas (Roles, Assignment Rules, Audit export)
 * from owner+manager areas for a role that does reach the module.
 */
export function RequireCapability({
  capability,
  area,
  children,
}: {
  capability: Capability;
  area: string;
  children: ReactNode;
}) {
  const { role, currentUser } = useWorkspace();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  if (can(role, capability)) return <>{children}</>;

  return (
    <PermissionRestricted
      title={`${area} isn't available for your role`}
      description={`Your role (${currentUser.roleLabel}) doesn't have access to ${area}. Ask a workspace owner if you need it.`}
      actions={
        <Button variant="secondary" onClick={() => navigate(scopedHref('/team-access'))}>
          Go to Team & Access Overview
        </Button>
      }
    />
  );
}
