import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { Badge, Button, type Column, DataTable } from '@crm/design-system';
import { RiskBadge } from '../components';
import { roles } from '../team-access-mock-data';
import { usersForRole } from '../team-access-selectors';
import type { Role } from '../team-access-types';

/** TSET-S01 — Role Directory. Standard/custom roles with user count, scope, risk and last changed. */
export default function RoleDirectoryScreen() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const columns: Column<Role>[] = [
    { key: 'name', header: 'Role', render: (r) => r.name },
    { key: 'kind', header: 'Type', render: (r) => <Badge tone={r.kind === 'custom' ? 'brand' : 'neutral'}>{r.kind === 'custom' ? 'Custom' : 'Standard'}</Badge> },
    { key: 'users', header: 'Users', render: (r) => String(usersForRole(r.id).length) },
    { key: 'scope', header: 'Scope', render: (r) => r.recordScopeSummary },
    { key: 'risk', header: 'Risk', render: (r) => <RiskBadge risk={r.risk} /> },
    { key: 'changed', header: 'Last changed', render: (r) => new Date(r.lastChangedAt).toLocaleDateString('en-IN') },
  ];

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Standard and custom roles. Low-frequency administration — daily assignment lives in Team & Access → People."
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Team & Access' }, { label: 'Roles' }]}
        actions={
          <Button variant="primary" iconLeft={<Plus />} onClick={() => setSearchParams({ drawer: 'create', step: 'purpose' })}>
            Create custom role
          </Button>
        }
      />
      <DataTable caption="Roles" columns={columns} rows={roles} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/settings/team/roles/${r.id}`)} />
    </div>
  );
}
