import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { Badge, Banner, Button, DataTable, EmptyState, LoadingSkeleton, type Column } from '@crm/design-system';
import {
  currentCapacity,
  findBranch,
  findTeam,
  onboardingRoleFor,
  onboardingNumbers,
  resolveCapacity,
  type OnboardingNumberRecord,
} from '@crm/mock-data';
import { useWorkspace } from '@crm/app/workspace-context';
import { can } from '@crm/modules/onboarding/permissions';
import { NUMBER_STATUS_META, PAYER_MODE_LABEL, PURPOSE_LABEL } from './number-status';

/** Demo-only capacity overrides so `?state=` can show a blocker without touching the real fixture. */
function capacityForState(state: string | null) {
  if (state === 'plan-limit') {
    return resolveCapacity({ connectedCount: 3, planIncludedNumbers: 3, numberAddOnEntitlement: 0, currentMetaNumberCapacity: 5 });
  }
  if (state === 'meta-capacity-limit') {
    return resolveCapacity({ connectedCount: 5, planIncludedNumbers: 10, numberAddOnEntitlement: 0, currentMetaNumberCapacity: 5 });
  }
  return currentCapacity();
}

/**
 * N01 — Number Registry, the Settings-owned ongoing view (SKILL.md "Number
 * Registry"). Shows every number regardless of lifecycle status — draft,
 * in-setup, live, paused, stopped, deregistered — unlike the ScopeBar's
 * live-only `whatsappNumbers` list.
 */
export default function NumberRegistry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const stateParam = searchParams.get('state');
  const { role } = useWorkspace();
  const onboardingRole = onboardingRoleFor(role);
  const canManage = can(onboardingRole, 'manageNumbers');

  const isLoading = stateParam === 'loading';
  const rows: OnboardingNumberRecord[] = stateParam === 'no-numbers' ? [] : onboardingNumbers;
  const capacity = capacityForState(stateParam);

  const columns: Column<OnboardingNumberRecord>[] = [
    {
      key: 'number',
      header: 'Number',
      render: (row) => (
        <div className="crm-number-registry__cell-main">
          <span className="crm-number-registry__name">{row.displayName}</span>
          <span className="crm-number-registry__phone">{row.phone || 'Phone pending'}</span>
        </div>
      ),
    },
    { key: 'purpose', header: 'Purpose', render: (row) => PURPOSE_LABEL[row.purpose] ?? row.purpose },
    {
      key: 'team',
      header: 'Business / Team',
      render: (row) => {
        const branch = row.branchId ? findBranch(row.branchId) : undefined;
        const team = row.teamId ? findTeam(row.teamId) : undefined;
        return (
          <div className="crm-number-registry__cell-main">
            <span>{branch ? branch.name : 'Main Business'}</span>
            <span className="crm-number-registry__muted">{team ? team.name : 'Unassigned'}</span>
          </div>
        );
      },
    },
    {
      key: 'connection',
      header: 'Connection',
      render: (row) => {
        const meta = NUMBER_STATUS_META[row.status];
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: 'billing',
      header: 'Billing',
      render: (row) => <span className="crm-number-registry__muted">{PAYER_MODE_LABEL[row.billingContext.payerMode]}</span>,
    },
    {
      key: 'history',
      header: 'History',
      render: (row) => <span className="crm-number-registry__muted">{row.historyStart ? row.historyStart : 'Not added'}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="crm-number-registry__row-actions">
          {row.status === 'live' ? (
            <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); navigate(`/inbox?whatsappNumberId=${row.id}`); }}>
              Open Inbox
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={(event) => { event.stopPropagation(); navigate(`/settings/whatsapp/numbers/${row.id}`); }}>
            View details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="crm-number-registry">
      <PageHeader
        title="WhatsApp & Connections"
        description="Every WhatsApp number connected to this workspace, across every stage of setup."
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'WhatsApp & Connections' }]}
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus />}
            disabled={!canManage || !capacity.canAdd}
            title={!canManage ? 'Your role cannot add numbers.' : !capacity.canAdd ? capacity.explanation : undefined}
            onClick={() => navigate('/settings/whatsapp/add-number')}
          >
            Add number
          </Button>
        }
      />

      {!capacity.canAdd ? <Banner tone="warning" title="You're at capacity for adding another number" description={capacity.explanation} /> : null}

      {isLoading ? (
        <LoadingSkeleton lines={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No WhatsApp numbers yet"
          description="Connect your first WhatsApp number to start messaging customers from the CRM."
          actions={
            <Button variant="primary" iconLeft={<Plus />} onClick={() => navigate('/setup')}>
              Start setup
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="WhatsApp numbers"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/settings/whatsapp/numbers/${row.id}`)}
        />
      )}
    </div>
  );
}
