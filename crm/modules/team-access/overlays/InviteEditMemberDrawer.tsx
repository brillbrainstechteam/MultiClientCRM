import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { branches, findWhatsAppNumber, teams } from '@crm/mock-data';
import {
  Badge,
  Button,
  Checkbox,
  Drawer,
  Input,
  Select,
  Stepper,
  Toast,
} from '@crm/design-system';
import { departments, findRole, roles, teamMembers, whatsappNumbers } from '../team-access-mock-data';
import { SEAT_LIMIT, isDuplicateActive, isPendingExisting, isReactivatable, ownerRoleUserCount, seatsUsed } from '../team-access-selectors';
import type { TeamMember } from '../team-access-types';

const steps = [
  { id: 'identity', label: 'Identity' },
  { id: 'scope', label: 'Role & Scope' },
  { id: 'numbers', label: 'Number Access' },
  { id: 'review', label: 'Review' },
];

/**
 * TEAM-S04 + TEAM-S19 merged — one guided Invite / Edit / Onboard drawer
 * (SIMPLIFICATION_DECISIONS.md §2). Triggered by `?drawer=invite` (add, from
 * People/Overview/Dashboard Quick Actions) or `?drawer=edit&memberId=…`
 * (edit, from Member Profile) — same component either way.
 */
export function InviteEditMemberDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const drawer = searchParams.get('drawer');
  const open = drawer === 'invite' || drawer === 'edit';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'step', 'memberId', 'mode', 'state']) next.delete(key);
      return next;
    });

  if (!open) return null;

  const memberId = searchParams.get('memberId');
  const existing = memberId ? teamMembers.find((m) => m.id === memberId) : undefined;

  return (
    <MemberForm
      key={`${existing ? 'edit' : 'add'}:${memberId ?? 'new'}`}
      existing={existing}
      onClose={close}
      searchParams={searchParams}
      setSearchParams={setSearchParams}
    />
  );
}

function MemberForm({
  existing,
  onClose,
  searchParams,
  setSearchParams,
}: {
  existing: TeamMember | undefined;
  onClose: () => void;
  searchParams: URLSearchParams;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { currentUser, role: actingRole } = useWorkspace();
  const mode: 'add' | 'edit' = existing ? 'edit' : 'add';
  const step = searchParams.get('step') ?? 'identity';
  const forcedState = searchParams.get('state');

  const [name, setName] = useState(existing?.name ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [mobile, setMobile] = useState(existing ? existing.mobile.replace('+91', '').trim() : '');
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [roleId, setRoleId] = useState(existing?.roleId ?? 'role_team_member');
  const [branchId, setBranchId] = useState(existing?.branchIds[0] ?? branches[0].id);
  const [teamId, setTeamId] = useState(existing?.teamIds[0] ?? teams[0].id);
  const [departmentId, setDepartmentId] = useState(existing?.departmentIds[0] ?? departments[0].id);
  const [copyFromId, setCopyFromId] = useState('');
  const [numberAccess, setNumberAccess] = useState<string[]>(existing?.numberAccess ?? []);
  const [defaultNumberId, setDefaultNumberId] = useState(existing?.defaultNumberId ?? '');
  const [submitted, setSubmitted] = useState(false);

  const setStep = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', id);
      return next;
    });

  const duplicate = mode === 'add' ? isDuplicateActive(email) : undefined;
  const reactivatable = mode === 'add' ? isReactivatable(email) : undefined;
  const pendingExisting = mode === 'add' ? isPendingExisting(email) : undefined;

  const numbersInBranch = whatsappNumbers.filter((n) => n.branchId === branchId);
  const teamsInBranch = teams.filter((t) => t.branchId === branchId);

  const applyCopyFrom = (sourceId: string) => {
    setCopyFromId(sourceId);
    const source = teamMembers.find((m) => m.id === sourceId);
    if (!source) return;
    setRoleId(source.roleId);
    setBranchId(source.branchIds[0] ?? branchId);
    setTeamId(source.teamIds[0] ?? teamId);
    setDepartmentId(source.departmentIds[0] ?? departmentId);
    setNumberAccess(source.numberAccess);
    setDefaultNumberId(source.defaultNumberId ?? '');
  };

  const toggleNumber = (numberId: string) => {
    setNumberAccess((prev) => {
      const next = prev.includes(numberId) ? prev.filter((n) => n !== numberId) : [...prev, numberId];
      if (!next.includes(defaultNumberId)) setDefaultNumberId(next[0] ?? '');
      return next;
    });
  };

  const seatBlocked = mode === 'add' && (forcedState === 'seat-limit' || seatsUsed() >= SEAT_LIMIT);
  const role = findRole(roleId);

  // Self-lockout guard: block the sole active Owner from demoting themself
  // away from the Owner role, which would lock the tenant out of ownership —
  // the RoleDetailScreen last-owner protection guards the Role entity's
  // permissions, but not a member's role assignment, so this path needs its
  // own check.
  const isEditingSelf = mode === 'edit' && existing?.userId === currentUser.id;
  const existingRole = existing ? findRole(existing.roleId) : undefined;
  const selfLockout =
    isEditingSelf && existingRole?.isLastOwnerProtected && roleId !== existing?.roleId && ownerRoleUserCount() <= 1;

  // Privilege-escalation guard: a Manager can invite/edit members but must
  // not be able to grant Owner authority (above their own delegable
  // authority). Keep an already-Owner member's current role visible/editable
  // for a Manager so an existing assignment isn't silently hidden — only new
  // grants of Owner are blocked.
  const grantableRoles =
    actingRole === 'owner' ? roles : roles.filter((r) => !r.isLastOwnerProtected || r.id === existing?.roleId);
  const copyableMembers = teamMembers.filter(
    (m) => m.employmentStatus === 'active' && (actingRole === 'owner' || !findRole(m.roleId)?.isLastOwnerProtected),
  );

  const title = mode === 'edit' ? `Edit ${existing?.name}` : 'Invite team member';
  const subtitle =
    mode === 'edit'
      ? 'Update role, scope and number access. Changes are recorded in the audit trail.'
      : 'Identity, role & scope, number access, then review — one flow for inviting or onboarding.';

  if (submitted) {
    return (
      <>
        <Drawer open title={title} subtitle={subtitle} onClose={onClose} width="wide" footer={null}>
          <div className="crm-invite-success">
            <Badge tone="success">{mode === 'edit' ? 'Changes saved' : 'Invitation sent'}</Badge>
            <p>
              {mode === 'edit'
                ? `${name || existing?.name} has been updated.`
                : `${name} will receive an invitation by ${channel === 'whatsapp' ? 'WhatsApp' : 'email'}. They can accept it to activate their account.`}
            </p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </Drawer>
        <Toast tone="success" message={mode === 'edit' ? 'Member updated' : 'Invitation sent'} onDismiss={() => {}} />
      </>
    );
  }

  if (step === 'review' && seatBlocked) {
    return (
      <Drawer open title={title} subtitle={subtitle} onClose={onClose} width="wide" footer={<Button variant="secondary" onClick={onClose}>Keep as draft</Button>}>
        <div className="crm-invite-panel crm-invite-panel--warning">
          <strong>Seat limit reached</strong>
          <p>
            Your plan includes {SEAT_LIMIT} seats and all are in use or pending. This invitation is kept as a draft — go
            to Billing to add seats, then send it.
          </p>
          <div className="crm-invite-panel__actions">
            <Button variant="primary" onClick={() => navigate(scopedHref('/billing', { returnTo: '/team-access/people' }))}>
              Go to Billing
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Keep as draft
            </Button>
          </div>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      width="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <div style={{ flex: 1 }} />
          {step !== 'identity' ? (
            <Button variant="secondary" onClick={() => setStep(steps[Math.max(steps.findIndex((s) => s.id === step) - 1, 0)].id)}>
              Back
            </Button>
          ) : null}
          {step !== 'review' ? (
            <Button
              variant="primary"
              disabled={(step === 'identity' && (!name || !email || Boolean(duplicate))) || (step === 'scope' && selfLockout)}
              onClick={() => setStep(steps[Math.min(steps.findIndex((s) => s.id === step) + 1, steps.length - 1)].id)}
            >
              Continue
            </Button>
          ) : (
            <Button variant="primary" disabled={selfLockout} onClick={() => setSubmitted(true)}>
              {mode === 'edit' ? 'Save changes' : 'Send invitation'}
            </Button>
          )}
        </>
      }
    >
      <Stepper items={steps} currentId={step} />

      <div className="crm-invite-form" style={{ marginTop: 'var(--crm-space-4)' }}>
        {step === 'identity' ? (
          <>
            <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Divya Rao" />
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={mode === 'edit'}
            />
            <Input label="Mobile" leadingAddon="+91" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="98110 20099" />
            {mode === 'add' ? (
              <Select
                label="Invitation channel"
                options={[
                  { value: 'whatsapp', label: 'WhatsApp' },
                  { value: 'email', label: 'Email' },
                ]}
                value={channel}
                onChange={(e) => setChannel(e.target.value as 'whatsapp' | 'email')}
              />
            ) : null}

            {duplicate ? (
              <div className="crm-invite-panel crm-invite-panel--warning">
                <strong>Already an active member</strong>
                <p>{duplicate.name} is already active with this email.</p>
                <div className="crm-invite-panel__actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate(scopedHref(`/team-access/people/${duplicate.id}`));
                    }}
                  >
                    Open existing profile
                  </Button>
                </div>
              </div>
            ) : null}
            {reactivatable ? (
              <div className="crm-invite-panel">
                <strong>Inactive member found</strong>
                <p>{reactivatable.name} previously worked here. Reactivate instead of creating a new invite.</p>
                <div className="crm-invite-panel__actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate(scopedHref(`/team-access/people/${reactivatable.id}`));
                    }}
                  >
                    Open profile to reactivate
                  </Button>
                </div>
              </div>
            ) : null}
            {pendingExisting ? (
              <div className="crm-invite-panel">
                <strong>Invitation already pending</strong>
                <p>{pendingExisting.name} already has a pending invitation with this email.</p>
                <div className="crm-invite-panel__actions">
                  <Button variant="secondary" size="sm" onClick={() => navigate(scopedHref('/team-access/people', { view: 'pending' }))}>
                    View pending invites
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 'scope' ? (
          <>
            {mode === 'add' ? (
              <>
                <Select
                  label="Copy approved setup from employee"
                  options={[{ value: '', label: 'Start from scratch' }, ...copyableMembers.map((m) => ({ value: m.id, label: `${m.name} — ${findRole(m.roleId)?.name ?? ''}` }))]}
                  value={copyFromId}
                  onChange={(e) => applyCopyFrom(e.target.value)}
                />
                <p className="crm-field__hint">Optional shortcut — every field stays editable after copying.</p>
              </>
            ) : null}
            <div className="crm-invite-grid">
              <Select label="Base role" options={grantableRoles.map((r) => ({ value: r.id, label: r.name }))} value={roleId} onChange={(e) => setRoleId(e.target.value)} />
              <Select label="Branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} value={branchId} onChange={(e) => setBranchId(e.target.value)} />
              <Select label="Team" options={teamsInBranch.map((t) => ({ value: t.id, label: t.name }))} value={teamId} onChange={(e) => setTeamId(e.target.value)} />
              <Select
                label="Department (optional grouping)"
                options={[{ value: '', label: 'None' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              />
            </div>
            {actingRole !== 'owner' ? (
              <p className="crm-field__hint">
                Owner / Super Admin isn't offered here — granting Owner authority is limited to existing Owners.
              </p>
            ) : null}
            {role ? (
              <div className="crm-invite-panel">
                <strong>{role.name}</strong>
                <p>{role.description}</p>
                <Badge tone={role.risk === 'high' ? 'danger' : role.risk === 'elevated' ? 'warning' : 'neutral'}>{role.recordScopeSummary}</Badge>
              </div>
            ) : null}
            {selfLockout ? (
              <div className="crm-invite-panel crm-invite-panel--warning">
                <strong>You can't remove your own Owner access</strong>
                <p>
                  You're the only active Owner in this workspace. Changing your own role away from Owner would leave the
                  workspace without one. Ask another Owner to make this change, or promote a second member to Owner
                  first.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {step === 'numbers' ? (
          <>
            <div className="crm-invite-numbers">
              {numbersInBranch.length === 0 ? (
                <p>No WhatsApp numbers are connected in this branch.</p>
              ) : (
                numbersInBranch.map((n) => (
                  <Checkbox
                    key={n.id}
                    label={`${n.displayName} (${n.displayNumber})${n.connectionStatus !== 'connected' ? ' — ' + n.connectionStatus : ''}`}
                    checked={numberAccess.includes(n.id)}
                    onChange={() => toggleNumber(n.id)}
                  />
                ))
              )}
            </div>
            {numberAccess.length > 0 ? (
              <Select
                label="Default number"
                options={numberAccess.map((id) => ({ value: id, label: findWhatsAppNumber(id)?.displayName ?? id }))}
                value={defaultNumberId}
                onChange={(e) => setDefaultNumberId(e.target.value)}
              />
            ) : null}
          </>
        ) : null}

        {step === 'review' ? (
          <div className="crm-invite-review">
            <div className="crm-invite-review__row"><span>Name</span><span>{name || '—'}</span></div>
            <div className="crm-invite-review__row"><span>Email</span><span>{email || '—'}</span></div>
            <div className="crm-invite-review__row"><span>Role</span><span>{role?.name}</span></div>
            <div className="crm-invite-review__row"><span>Branch / Team</span><span>{branches.find((b) => b.id === branchId)?.name} / {teams.find((t) => t.id === teamId)?.name}</span></div>
            <div className="crm-invite-review__row"><span>Number access</span><span>{numberAccess.length ? numberAccess.map((id) => findWhatsAppNumber(id)?.displayName).join(', ') : 'None'}</span></div>
            <div className="crm-invite-review__row"><span>Default number</span><span>{defaultNumberId ? findWhatsAppNumber(defaultNumberId)?.displayName : '—'}</span></div>
            <div className="crm-invite-review__row"><span>Seats used after this</span><span>{seatsUsed()}{mode === 'add' ? ' + 1' : ''} / {SEAT_LIMIT}</span></div>
            {mode === 'add' ? (
              <div className="crm-invite-review__row"><span>Two-factor requirement</span><span>{role?.risk !== 'standard' ? 'Required at first sign-in' : 'Optional'}</span></div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
