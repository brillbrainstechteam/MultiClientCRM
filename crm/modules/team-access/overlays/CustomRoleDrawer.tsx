import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Drawer, Input, Select, Stepper, Textarea, Toast, Toggle } from '@crm/design-system';
import { roles } from '../team-access-mock-data';
import type { RecordScopeLevel } from '../team-access-types';

const steps = [
  { id: 'purpose', label: 'Name & Purpose' },
  { id: 'actions', label: 'Module Actions' },
  { id: 'scope', label: 'Record Scope' },
  { id: 'protection', label: 'Data Protection' },
  { id: 'review', label: 'Review' },
];

const startingActionGroups = [
  { id: 'inbox', label: 'Inbox & Conversations', actions: ['View conversations', 'Reply', 'Reassign'] },
  { id: 'contacts', label: 'Contacts & Companies', actions: ['View records', 'Create/edit', 'Change owner'] },
  { id: 'campaigns', label: 'Campaigns & Automation', actions: ['View', 'Create/edit'] },
  { id: 'reports', label: 'Reports & Exports', actions: ['View reports'] },
];

const scopeOptions: { value: RecordScopeLevel; label: string }[] = [
  { value: 'branch', label: 'Branch — all teams and records in the branch' },
  { value: 'team', label: 'Team — team records only' },
  { value: 'own', label: 'Own — only records this member owns or is assigned' },
];

/**
 * TSET-S03 normalized — Custom Role Builder drawer. Opened from Roles
 * (`?drawer=create&step=purpose|actions|scope|protection|review`).
 * "Manage roles" and "Delete record" stay unreachable for custom roles
 * (privilege-escalation guard, mirrored in RoleDetailScreen).
 */
export function CustomRoleDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const open = searchParams.get('drawer') === 'create';
  const step = searchParams.get('step') ?? 'purpose';

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [grantedActions, setGrantedActions] = useState<Set<string>>(new Set());
  const [scopeLevel, setScopeLevel] = useState<RecordScopeLevel>('team');
  const [maskPhone, setMaskPhone] = useState(true);
  const [maskEmail, setMaskEmail] = useState(false);
  const [allowExport, setAllowExport] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'step']) next.delete(key);
      return next;
    });

  if (!open) return null;

  const setStep = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', id);
      return next;
    });

  const toggleAction = (actionKey: string) =>
    setGrantedActions((prev) => {
      const next = new Set(prev);
      if (next.has(actionKey)) next.delete(actionKey);
      else next.add(actionKey);
      return next;
    });

  const nameTaken = name.trim().length > 0 && roles.some((r) => r.name.toLowerCase() === name.trim().toLowerCase());

  if (submitted) {
    return (
      <>
        <Drawer open title="Create custom role" onClose={close} width="wide" footer={<Button variant="secondary" onClick={close}>Close</Button>}>
          <div className="crm-invite-success">
            <Badge tone="success">Role created</Badge>
            <p>"{name}" is ready. Assign it to members from People → Invite/Edit, or from a member's Access tab.</p>
            <Button variant="secondary" onClick={() => { close(); navigate('/settings/team/roles'); }}>
              Back to Roles
            </Button>
          </div>
        </Drawer>
        <Toast tone="success" message="Custom role created" onDismiss={() => {}} />
      </>
    );
  }

  return (
    <Drawer
      open
      title="Create custom role"
      subtitle="Name & purpose, module actions, record scope, data protection, then review."
      onClose={close}
      width="wide"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <div style={{ flex: 1 }} />
          {step !== 'purpose' ? (
            <Button variant="secondary" onClick={() => setStep(steps[Math.max(steps.findIndex((s) => s.id === step) - 1, 0)].id)}>
              Back
            </Button>
          ) : null}
          {step !== 'review' ? (
            <Button
              variant="primary"
              disabled={step === 'purpose' && (!name.trim() || nameTaken)}
              onClick={() => setStep(steps[Math.min(steps.findIndex((s) => s.id === step) + 1, steps.length - 1)].id)}
            >
              Continue
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setSubmitted(true)}>
              Create role
            </Button>
          )}
        </>
      }
    >
      <Stepper items={steps} currentId={step} />

      <div className="crm-invite-form" style={{ marginTop: 'var(--crm-space-4)' }}>
        {step === 'purpose' ? (
          <>
            <Input
              label="Role name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Regional Campaign Coordinator"
              hint={nameTaken ? undefined : 'Shown wherever roles are listed or assigned.'}
              error={nameTaken ? 'A role with this name already exists.' : undefined}
            />
            <Textarea label="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What is this role for, and who typically needs it?" />
          </>
        ) : null}

        {step === 'actions' ? (
          <>
            <p>Grant the actions this role needs. High-authority actions like "Manage roles" and record deletion aren't available to custom roles.</p>
            {startingActionGroups.map((group) => (
              <div key={group.id} className="crm-invite-panel">
                <strong>{group.label}</strong>
                {group.actions.map((action) => {
                  const key = `${group.id}:${action}`;
                  return (
                    <Toggle key={key} label={action} checked={grantedActions.has(key)} onChange={() => toggleAction(key)} />
                  );
                })}
              </div>
            ))}
          </>
        ) : null}

        {step === 'scope' ? (
          <Select
            label="Record scope"
            options={scopeOptions}
            value={scopeLevel}
            onChange={(e) => setScopeLevel(e.target.value as RecordScopeLevel)}
          />
        ) : null}

        {step === 'protection' ? (
          <>
            <Toggle label="Mask phone number" checked={maskPhone} onChange={setMaskPhone} />
            <Toggle label="Mask email address" checked={maskEmail} onChange={setMaskEmail} />
            <Toggle label="Allow export" checked={allowExport} onChange={setAllowExport} />
          </>
        ) : null}

        {step === 'review' ? (
          <div className="crm-invite-review">
            <div className="crm-invite-review__row"><span>Name</span><span>{name || '—'}</span></div>
            <div className="crm-invite-review__row"><span>Purpose</span><span>{purpose || '—'}</span></div>
            <div className="crm-invite-review__row"><span>Actions granted</span><span>{grantedActions.size}</span></div>
            <div className="crm-invite-review__row"><span>Record scope</span><span>{scopeOptions.find((o) => o.value === scopeLevel)?.label}</span></div>
            <div className="crm-invite-review__row"><span>Mask phone / email</span><span>{maskPhone ? 'Yes' : 'No'} / {maskEmail ? 'Yes' : 'No'}</span></div>
            <div className="crm-invite-review__row"><span>Allow export</span><span>{allowExport ? 'Yes' : 'No'}</span></div>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
