import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, PermissionRestricted } from '@crm/design-system';
import { can, type Capability } from '../permissions';

/**
 * Deep-link guard. Renders an access-denied state (no protected data) when the
 * acting role lacks `capability`; otherwise renders its children. Used so an
 * agent hitting `/contacts/reports` sees a restricted state, not the report.
 */
export function RequireCapability({
  capability,
  area,
  children,
}: {
  capability: Capability;
  area: string;
  children: React.ReactNode;
}) {
  const { role, currentUser } = useWorkspace();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();

  if (can(role, capability)) return <>{children}</>;

  return (
    <PermissionRestricted
      title={`${area} isn’t available for your role`}
      description={`Your role (${currentUser.roleLabel}) doesn’t have access to ${area}. Ask a workspace owner or manager if you need it.`}
      actions={
        <Button variant="secondary" onClick={() => navigate(scopedHref('/contacts'))}>
          Go to Contacts Overview
        </Button>
      }
    />
  );
}
