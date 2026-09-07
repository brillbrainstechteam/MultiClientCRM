import { Pencil, ShieldOff, UserRoundX } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Banner, Button, ConfirmDialog, EmptyState, ErrorState, Tabs, Toast } from '@crm/design-system';
import { useState } from 'react';
import { AvailabilityBadge, EmploymentStatusBadge } from '../components';
import { can } from '../permissions';
import { resolveEffectiveAccess } from '../resolvers';
import {
  auditEvents,
  findMember,
  findPerformance,
  findRole,
  findWorkload,
} from '../team-access-mock-data';
import { memberBranchLabel, memberLastActivityLabel, memberTeamLabel } from '../team-access-selectors';
import { workTypeLabels, workTypes } from '../team-access-types';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'access', label: 'Access' },
  { id: 'workload', label: 'Workload' },
  { id: 'activity', label: 'Activity' },
  { id: 'security', label: 'Security' },
];

/** TEAM-S03 — Member Profile. Overview/Access/Workload/Activity/Security tabs. */
export default function MemberProfileScreen() {
  const { memberId = '' } = useParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role: actingRole, currentUser } = useWorkspace();
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const member = findMember(memberId);
  const activeTab = searchParams.get('tab') ?? 'overview';
  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  if (!member) {
    return (
      <ErrorState
        title="Member not found"
        description="This person may have been removed or the link is out of date."
        actions={
          <Button variant="secondary" onClick={() => navigate(scopedHref('/team-access/people'))}>
            Back to People
          </Button>
        }
      />
    );
  }

  const isViewingSelf = member.userId === currentUser.id;
  const isRestrictedViewer = !isViewingSelf && !can(actingRole, 'viewPeople');
  if (isRestrictedViewer) {
    return (
      <EmptyState title="Restricted profile" description="Your role can only view your own profile." />
    );
  }

  const role = findRole(member.roleId);
  const workload = findWorkload(member.id);
  const performance = findPerformance(member.id);
  const effectiveAccess = resolveEffectiveAccess(member.id);
  const memberEvents = auditEvents.filter((e) => e.targetId === member.id || e.actorId === member.id);
  const canEdit = can(actingRole, 'editMember') || isViewingSelf;
  const canStartExit = can(actingRole, 'startExit') && role && !role.isLastOwnerProtected;
  const canRevoke = can(actingRole, 'revokeSession');

  return (
    <div className="crm-team-member">
      <PageHeader
        title={member.name}
        description={member.title}
        breadcrumbs={[{ label: 'People', to: scopedHref('/team-access/people') }, { label: member.name }]}
        actions={
          <>
            {canEdit ? (
              <Button
                variant="secondary"
                iconLeft={<Pencil />}
                onClick={() => navigate(scopedHref(`/team-access/people/${member.id}`, { drawer: 'edit', memberId: member.id, step: 'identity' }))}
              >
                Edit member
              </Button>
            ) : null}
            {canStartExit && member.employmentStatus === 'active' ? (
              <Button
                variant="danger"
                iconLeft={<UserRoundX />}
                onClick={() => navigate(scopedHref(`/team-access/people/${member.id}`, { wizard: 'exit', step: 'block', memberId: member.id }))}
              >
                Start exit
              </Button>
            ) : null}
          </>
        }
        toolbar={<Tabs tabs={tabs} activeId={activeTab} onChange={setTab} ariaLabel="Member profile sections" />}
      />

      {member.employmentStatus === 'inactive' ? (
        <Banner tone="warning" title="This member is inactive" description="Access is blocked. History and past attribution are preserved and remain searchable." />
      ) : null}
      {member.employmentStatus === 'pending' ? (
        <Banner
          tone="info"
          title={member.inviteStatus === 'expired' ? 'Invitation expired' : 'Invitation pending'}
          description={member.inviteStatus === 'expired' ? 'Resend the invitation from People to restore access.' : 'This person has not yet accepted their invitation.'}
        />
      ) : null}

      {activeTab === 'overview' ? (
        <div className="crm-team-member__panel">
          <div className="crm-team-member__grid">
            <Field label="Role" value={role?.name ?? member.roleId} />
            <Field label="Team(s)" value={memberTeamLabel(member)} />
            <Field label="Branch(es)" value={memberBranchLabel(member)} />
            <Field label="Employment status" value={<EmploymentStatusBadge status={member.employmentStatus} invite={member.inviteStatus} />} />
            <Field label="Availability" value={<AvailabilityBadge availability={member.availability} />} />
            <Field label="Manager" value={member.managerId ? findMember(member.managerId)?.name ?? member.managerId : '—'} />
            <Field label="Email" value={effectiveAccess?.maskedFields.includes('email') ? maskEmail(member.email) : member.email} />
            <Field label="Mobile" value={effectiveAccess?.maskedFields.includes('phone') ? maskPhone(member.mobile) : member.mobile} />
            <Field label="Joined" value={member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('en-IN') : '—'} />
          </div>
          {workload ? (
            <div className="crm-team-member__grid">
              <Field label="Open conversations" value={String(workload.openConversations)} />
              <Field label="Owned contacts" value={String(workload.ownedContacts)} />
              <Field label="Overdue" value={String(workload.overdueConversations)} />
            </div>
          ) : null}
          {member.userId && workload && workload.ownedContacts > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/contacts?ownerId=${member.userId}&sourceModule=team-access&returnTo=${encodeURIComponent(scopedHref(`/team-access/people/${member.id}`))}`)}
            >
              View owned contacts in Contacts
            </Button>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'access' && effectiveAccess ? (
        <div className="crm-team-member__panel">
          <Field label="Record scope" value={effectiveAccess.recordScopeSummary} />
          <Field
            label="WhatsApp number access"
            value={
              effectiveAccess.numberScope.length === 0
                ? 'No numbers granted'
                : effectiveAccess.numberScope.map((n) => `${n.label}${n.isDefault ? ' (default)' : ''}`).join(', ')
            }
          />
          <Field label="Masked fields" value={effectiveAccess.maskedFields.length ? effectiveAccess.maskedFields.join(', ') : 'None — full visibility'} />
          <div>
            <p className="crm-team-member__field-label">Allowed actions</p>
            <ul>
              {effectiveAccess.allowedActions.slice(0, 12).map((a) => (
                <li key={a} className="crm-team-member__field-value">{a}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {activeTab === 'workload' ? (
        <div className="crm-team-member__panel">
          {workload ? (
            <>
              <div className="crm-team-member__grid">
                <Field label="Open conversations" value={String(workload.openConversations)} />
                <Field label="Overdue conversations" value={String(workload.overdueConversations)} />
                <Field label="Calls due / overdue" value={`${workload.callsDue} / ${workload.callsOverdue}`} />
                <Field label="Open leads" value={String(workload.leadsOpen)} />
                <Field label="Open tasks" value={String(workload.tasksOpen)} />
                <Field label="Open follow-ups" value={String(workload.followUpsOpen)} />
              </div>
              <div className="crm-team-member__capacity-list">
                {workTypes.map((wt) => {
                  const capacity = member.capacityByWorkType[wt];
                  const pct = capacity.max ? Math.min((capacity.current / capacity.max) * 100, 100) : 0;
                  const over = capacity.max !== null && capacity.current > capacity.max;
                  return (
                    <div key={wt} className="crm-team-member__capacity-row">
                      <span>{workTypeLabels[wt]}</span>
                      <span className="crm-team-member__capacity-bar">
                        <span
                          className={`crm-team-member__capacity-fill crm-team-member__capacity-fill--${over ? 'over' : 'ok'}`}
                          style={{ width: `${capacity.max ? pct : 0}%` }}
                        />
                      </span>
                      <span>{capacity.max !== null ? `${capacity.current}/${capacity.max}` : 'No cap'}</span>
                    </div>
                  );
                })}
              </div>
              {workload.callsDue + workload.callsOverdue > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/calling?${member.userId ? `userId=${member.userId}&` : ''}returnTo=${encodeURIComponent(scopedHref(`/team-access/people/${member.id}`, { tab: 'workload' }))}`,
                    )
                  }
                >
                  View calls in Calling
                </Button>
              ) : null}
            </>
          ) : (
            <EmptyState title="No workload data" description="This member has no assigned work in scope." />
          )}
          {performance ? (
            <div className="crm-team-member__grid">
              <Field label="Assigned (period)" value={performance.dataAvailable ? String(performance.assigned) : 'Not available'} />
              <Field label="Resolved (period)" value={performance.dataAvailable ? String(performance.resolved) : 'Not available'} />
              <Field label="First response" value={performance.firstResponseMinutes !== null ? `${performance.firstResponseMinutes}m` : 'Not available'} />
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'activity' ? (
        <div className="crm-team-member__panel">
          {memberEvents.length === 0 ? (
            <EmptyState title="No activity recorded" description="Assignment, access and membership events for this member will appear here." />
          ) : (
            memberEvents.map((event) => (
              <div key={event.id} className="crm-team-member__activity-row">
                <span>{event.summary}</span>
                <span className="crm-team-member__activity-meta">
                  {new Date(event.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {event.actorName}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}

      {activeTab === 'security' ? (
        <div className="crm-team-member__panel">
          <div className="crm-team-member__grid">
            <Field label="Two-factor authentication" value={<Badge tone={member.twoFactorEnabled ? 'success' : 'neutral'}>{member.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</Badge>} />
            <Field label="Active sessions" value={String(member.activeSessionCount)} />
            <Field label="Last activity" value={memberLastActivityLabel(member)} />
          </div>
          <p className="crm-team-member__field-value">
            This is a read-only session summary — the full Security settings surface (login policy, 2FA enforcement) lives in
            workspace Settings, not Team & Access.
          </p>
          {canRevoke && member.activeSessionCount > 0 ? (
            <div>
              <Button variant="danger" iconLeft={<ShieldOff />} onClick={() => setRevokeConfirm(true)}>
                Revoke all sessions
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {revokeConfirm ? (
        <ConfirmDialog
          open
          tone="danger"
          title="Revoke all sessions?"
          message={`${member.name} will be signed out of every device immediately and must sign in again.`}
          confirmLabel="Revoke sessions"
          onCancel={() => setRevokeConfirm(false)}
          onConfirm={() => {
            setRevokeConfirm(false);
            setToast(`All sessions revoked for ${member.name}.`);
          }}
        />
      ) : null}
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="crm-team-member__field">
      <span className="crm-team-member__field-label">{label}</span>
      <span className="crm-team-member__field-value">{value}</span>
    </div>
  );
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(mobile: string): string {
  return mobile.replace(/\d(?=\d{4})/g, '•');
}
