import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { Badge, Banner, Button, ConfirmDialog, ErrorState, Modal, Tabs, Toast, Toggle } from '@crm/design-system';
import { RiskBadge } from '../components';
import { findRole } from '../team-access-mock-data';
import { ownerRoleUserCount, usersForRole } from '../team-access-selectors';
import type { PermissionGroup, Role } from '../team-access-types';

const tabs = [
  { id: 'actions', label: 'Module Actions' },
  { id: 'scope', label: 'Record Scope' },
  { id: 'protection', label: 'Data Protection' },
  { id: 'users', label: 'Effective Users' },
  { id: 'impact', label: 'Change Impact' },
];

/** Module actions treated as high-risk: changing them always offers approval, never silently applies. */
const highRiskActionLabels = new Set(['Delete record', 'Delete conversation', 'Manage roles', 'Manage assignment rules', 'Export data']);

const scopeExplanation: Record<Role['recordScopeLevel'], string> = {
  workspace: 'Sees and can act on records across every branch and team in the workspace.',
  branch: 'Sees and can act on records within their own branch only.',
  team: 'Sees and can act on records owned by their own team only.',
  own: 'Sees and can act only on records they own or are assigned.',
};

/** TSET-S02 — Role Detail. Grouped Module Actions / Record Scope / Data Protection / Effective Users / Change Impact. */
export default function RoleDetailScreen() {
  const { roleId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = findRole(roleId);

  const activeTab = searchParams.get('tab') ?? 'actions';
  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  const [openGroupId, setOpenGroupId] = useState<string | null>(role?.permissionGroups[0]?.id ?? null);
  const [pendingGroups, setPendingGroups] = useState<PermissionGroup[] | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const changeModal = searchParams.get('modal') === 'change-preview';
  const approvalRequired = searchParams.get('approval') === 'required';
  const isStale = searchParams.get('state') === 'stale';

  if (!role) {
    return (
      <ErrorState
        title="Role not found"
        description="This role may have been removed or renamed."
        actions={<Button variant="secondary" onClick={() => navigate('/settings/team/roles')}>Back to Roles</Button>}
      />
    );
  }

  const isLastOwner = role.isLastOwnerProtected && ownerRoleUserCount() <= 1;
  const effectiveGroups = pendingGroups ?? role.permissionGroups;
  const hasPendingChanges = pendingGroups !== null;
  const users = usersForRole(role.id);

  const openChangePreview = () => {
    const anyHighRisk = effectiveGroups.some((group) =>
      group.actions.some((action) => {
        const original = role.permissionGroups.find((g) => g.id === group.id)?.actions.find((a) => a.id === action.id);
        return original && original.granted !== action.granted && highRiskActionLabels.has(action.label);
      }),
    );
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('modal', 'change-preview');
      if (anyHighRisk) next.set('approval', 'required');
      else next.delete('approval');
      return next;
    });
  };

  const closeChangePreview = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      next.delete('approval');
      return next;
    });

  const toggleAction = (groupId: string, actionId: string) => {
    if (role.isLastOwnerProtected) return;
    setPendingGroups((prev) => {
      const base = prev ?? role.permissionGroups;
      return base.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              actions: group.actions.map((action) => {
                if (action.id !== actionId) return action;
                // Custom roles are never allowed to reach the two highest-authority actions from this screen (privilege-escalation guard).
                if (role.kind === 'custom' && !action.granted && (action.label === 'Manage roles' || action.label === 'Delete record')) {
                  return action;
                }
                return { ...action, granted: !action.granted };
              }),
            },
      );
    });
  };

  const changedActions = pendingGroups
    ? pendingGroups.flatMap((group) => {
        const original = role.permissionGroups.find((g) => g.id === group.id);
        return group.actions
          .filter((action) => original?.actions.find((a) => a.id === action.id)?.granted !== action.granted)
          .map((action) => ({ group: group.label, label: action.label, granted: action.granted }));
      })
    : [];

  return (
    <div className="crm-role-detail">
      <PageHeader
        title={role.name}
        description={role.description}
        breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'Team & Access' }, { label: 'Roles', to: '/settings/team/roles' }, { label: role.name }]}
        actions={
          <>
            <Badge tone={role.kind === 'custom' ? 'brand' : 'neutral'}>{role.kind === 'custom' ? 'Custom role' : 'Standard role'}</Badge>
            <RiskBadge risk={role.risk} />
          </>
        }
        toolbar={<Tabs tabs={tabs} activeId={activeTab} onChange={setTab} ariaLabel="Role detail sections" />}
      />

      {isLastOwner ? (
        <Banner
          tone="warning"
          title="This role protects the last Owner"
          description="Every workspace must retain at least one Owner with full authority. Module actions for this role can't be reduced while only one active Owner remains."
        />
      ) : null}

      {activeTab === 'actions' ? (
        <div className="crm-role-detail__panel">
          <p>Actions this role is granted, grouped by module. Expand a group to review or change individual actions.</p>
          {effectiveGroups.map((group) => (
            <div key={group.id} className="crm-role-detail__group">
              <button
                type="button"
                className="crm-role-detail__group-head"
                onClick={() => setOpenGroupId(openGroupId === group.id ? null : group.id)}
                aria-expanded={openGroupId === group.id}
              >
                <span>{group.label}</span>
                <Badge tone="neutral">{group.actions.filter((a) => a.granted).length}/{group.actions.length} granted</Badge>
              </button>
              {openGroupId === group.id ? (
                <div className="crm-role-detail__group-body">
                  {group.actions.map((action) => (
                    <Toggle
                      key={action.id}
                      label={action.label}
                      checked={action.granted}
                      disabled={role.isLastOwnerProtected || (role.kind === 'custom' && !action.granted && (action.label === 'Manage roles' || action.label === 'Delete record'))}
                      description={
                        role.kind === 'custom' && !action.granted && (action.label === 'Manage roles' || action.label === 'Delete record')
                          ? 'Custom roles cannot be granted this action in this workspace.'
                          : undefined
                      }
                      onChange={() => toggleAction(group.id, action.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {!role.isLastOwnerProtected ? (
            <div className="crm-role-detail__action-row">
              <Button variant="secondary" disabled={!hasPendingChanges} onClick={() => setPendingGroups(null)}>
                Discard changes
              </Button>
              <Button variant="primary" disabled={!hasPendingChanges} onClick={openChangePreview}>
                Save changes
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'scope' ? (
        <div className="crm-role-detail__panel">
          <strong>{role.recordScopeSummary}</strong>
          <p>{scopeExplanation[role.recordScopeLevel]}</p>
          <Badge tone="neutral">Scope level: {role.recordScopeLevel}</Badge>
        </div>
      ) : null}

      {activeTab === 'protection' ? (
        <div className="crm-role-detail__panel">
          <Toggle label="Mask phone number" checked={role.dataProtection.maskPhone} disabled description="Hide full phone numbers in lists and profiles for this role." />
          <Toggle label="Mask email address" checked={role.dataProtection.maskEmail} disabled description="Hide full email addresses in lists and profiles for this role." />
          <Toggle label="Allow copy" checked={role.dataProtection.allowCopy} disabled />
          <Toggle label="Allow download" checked={role.dataProtection.allowDownload} disabled />
          <Toggle label="Allow export" checked={role.dataProtection.allowExport} disabled />
          {role.dataProtection.exceptions.length ? (
            <div>
              <strong>Exceptions</strong>
              <ul>
                {role.dataProtection.exceptions.map((exception) => (
                  <li key={exception}>{exception}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No exceptions configured.</p>
          )}
          <p className="crm-field__hint">Data protection changes go through the same Module Actions save flow above (progressive disclosure keeps the two together conceptually but change control shared).</p>
        </div>
      ) : null}

      {activeTab === 'users' ? (
        <div className="crm-role-detail__panel">
          {users.length === 0 ? (
            <p>No active or pending members currently hold this role.</p>
          ) : (
            users.map((member) => (
              <div key={member.id} className="crm-role-detail__action-row">
                <span>{member.name}</span>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/team-access/people/${member.id}`)}>
                  Open profile
                </Button>
              </div>
            ))
          )}
        </div>
      ) : null}

      {activeTab === 'impact' ? (
        <div className="crm-role-detail__panel">
          <div className="crm-role-detail__action-row">
            <span>Members currently holding this role</span>
            <Badge tone="neutral">{users.length}</Badge>
          </div>
          <div className="crm-role-detail__action-row">
            <span>Last changed</span>
            <span>{new Date(role.lastChangedAt).toLocaleString('en-IN')} by {role.lastChangedBy}</span>
          </div>
          {role.kind === 'custom' ? (
            <>
              <p>Deleting this role requires every member currently on it to be reassigned to another role first.</p>
              <Button variant="danger" size="sm" disabled={users.length > 0} onClick={() => setDeleteConfirm(true)}>
                Delete custom role
              </Button>
              {users.length > 0 ? <p className="crm-field__hint">Reassign all {users.length} member(s) off this role before it can be deleted.</p> : null}
            </>
          ) : (
            <p>Standard roles can't be deleted — they're part of the base permission model.</p>
          )}
        </div>
      ) : null}

      <Modal open={changeModal} title="Review permission changes" onClose={closeChangePreview} footer={
        <>
          <Button variant="secondary" onClick={closeChangePreview}>Cancel</Button>
          {isStale ? (
            <Button
              variant="secondary"
              onClick={() =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('state');
                  return next;
                })
              }
            >
              Refresh and review again
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                closeChangePreview();
                setPendingGroups(null);
                setToast(approvalRequired ? 'Change submitted for approval.' : `${role.name} updated.`);
              }}
            >
              {approvalRequired ? 'Request approval' : 'Confirm changes'}
            </Button>
          )}
        </>
      }>
        <div className="crm-role-detail__panel">
          {isStale ? (
            <Banner tone="danger" title="This role changed since you opened it" description="Someone else updated this role's permissions while you were editing. Refresh to see the latest version before applying your changes — your edits are kept, but the comparison below may be out of date." />
          ) : null}
          {approvalRequired ? (
            <Banner tone="warning" title="High-risk change" description="This change affects a sensitive action. It will be submitted for maker-checker approval instead of applying immediately (SIMPLIFICATION_DECISIONS.md §17 — approval stays optional for ordinary changes)." />
          ) : null}
          <p>{changedActions.length} action(s) changing for {role.name}, affecting {users.length} member(s):</p>
          {changedActions.map((change) => (
            <div key={`${change.group}-${change.label}`} className="crm-role-detail__action-row">
              <span>{change.group} → {change.label}</span>
              <Badge tone={change.granted ? 'success' : 'danger'}>{change.granted ? 'Granting' : 'Revoking'}</Badge>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteConfirm}
        title={`Delete "${role.name}"?`}
        message="This custom role has no members on it. Deleting it cannot be undone."
        tone="danger"
        confirmLabel="Delete role"
        onConfirm={() => {
          setDeleteConfirm(false);
          navigate('/settings/team/roles');
        }}
        onCancel={() => setDeleteConfirm(false)}
      />

      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
