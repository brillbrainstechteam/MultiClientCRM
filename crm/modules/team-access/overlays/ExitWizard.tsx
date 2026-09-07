import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Banner, Button, Checkbox, Drawer, ErrorState, Select, Stepper, Toast } from '@crm/design-system';
import { exitDependenciesFor, findMember, findRole, teamMembers, teamRecords } from '../team-access-mock-data';
import { ownerRoleUserCount } from '../team-access-selectors';
import type { ExitDependency } from '../team-access-types';

const steps = [
  { id: 'block', label: 'Block Access' },
  { id: 'dependencies', label: 'Dependency Scan' },
  { id: 'transfer', label: 'Transfer Mapping' },
  { id: 'safeguards', label: 'Security & Data Review' },
  { id: 'review', label: 'Confirm' },
  { id: 'result', label: 'Result' },
];

const reasonOptions = [
  { value: 'voluntary', label: 'Voluntary resignation' },
  { value: 'involuntary', label: 'Involuntary termination' },
  { value: 'suspended', label: 'Suspended pending review' },
];

/**
 * TEAM-S20 — Employee Exit & Work Transfer. High-risk dedicated wizard
 * (`?wizard=exit&step=…`), triggered from Member Profile / People "Start
 * Exit". Reads `memberId` from the query (the overlay is mounted at the
 * layout level, outside the `:memberId` route param scope) — trigger sites
 * pass it explicitly alongside the path segment.
 */
export function ExitWizard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const wizard = searchParams.get('wizard');
  const open = wizard === 'exit';
  const memberId = searchParams.get('memberId') ?? '';

  if (!open) return null;

  return <ExitForm key={memberId} memberId={memberId} searchParams={searchParams} setSearchParams={setSearchParams} />;
}

function ExitForm({
  memberId,
  searchParams,
  setSearchParams,
}: {
  memberId: string;
  searchParams: URLSearchParams;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
}) {
  const step = searchParams.get('step') ?? 'block';
  const forcedState = searchParams.get('state');

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['wizard', 'step', 'memberId', 'state']) next.delete(key);
      return next;
    });

  const setStep = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', id);
      return next;
    });

  const member = findMember(memberId);
  const role = member ? findRole(member.roleId) : undefined;

  const [reason, setReason] = useState<'voluntary' | 'involuntary' | 'suspended'>('voluntary');
  const [blocked, setBlocked] = useState(false);
  const [recipients, setRecipients] = useState<Record<ExitDependency['category'], string>>({} as Record<ExitDependency['category'], string>);
  const [attributionAck, setAttributionAck] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (!member) return null;

  const isLastOwnerBlocked = Boolean(role?.isLastOwnerProtected) && ownerRoleUserCount() <= 1;

  if (isLastOwnerBlocked) {
    return (
      <Drawer open title="Can't start exit" onClose={close} width="wide" footer={<Button variant="secondary" onClick={close}>Close</Button>}>
        <ErrorState
          title="This is the workspace's only Owner"
          description={`${member.name} holds the only Owner role. Every workspace must retain at least one Owner — assign another member as Owner before starting this exit.`}
        />
      </Drawer>
    );
  }

  const dependencies = exitDependenciesFor(member.id);
  const transferable = dependencies.filter((d) => d.transferRequired);
  const recipientFor = (dep: ExitDependency) => recipients[dep.category] ?? dep.defaultRecipientId ?? '';
  const setRecipient = (category: ExitDependency['category'], value: string) =>
    setRecipients((prev) => ({ ...prev, [category]: value }));

  const recipientLabel = (id: string) => teamMembers.find((m) => m.id === id)?.name ?? teamRecords.find((t) => t.id === id)?.id ?? id;

  // Deterministic partial-result fixture: campaign/workflow dependencies always need manual follow-up
  // (mirrors the audit_005/audit_006 member_ritu exit precedent) so partial-success stays visible, not just forced by `?state=`.
  const campaignDependency = dependencies.find((d) => d.category === 'campaign_workflow');
  const isPartial = forcedState === 'partial' || Boolean(campaignDependency && campaignDependency.count > 0);

  if (step === 'result') {
    return (
      <>
        <Drawer open title={`Exit — ${member.name}`} onClose={close} width="wide" footer={<Button variant="secondary" onClick={close}>Close</Button>}>
          <div className="crm-exit">
            <Badge tone={isPartial ? 'warning' : 'success'}>{isPartial ? 'Access blocked — transfer completed with follow-up needed' : 'Exit completed'}</Badge>
            <div className="crm-exit__panel">
              <div className="crm-exit__row"><span>Access</span><span>Blocked immediately</span></div>
              <div className="crm-exit__row"><span>Sessions & tokens</span><span>Revoked</span></div>
              <div className="crm-exit__row"><span>Historical attribution</span><span>Unchanged — past actions still show {member.name}</span></div>
              {transferable.map((dep) => (
                <div key={dep.category} className="crm-exit__row">
                  <span>{dep.label}</span>
                  <span>
                    {dep.category === 'campaign_workflow' && isPartial ? (
                      <Badge tone="warning">Needs manual reassignment</Badge>
                    ) : (
                      `Transferred to ${recipientLabel(recipientFor(dep))}`
                    )}
                  </span>
                </div>
              ))}
            </div>
            {isPartial ? (
              <Button variant="secondary" size="sm" onClick={() => setToast('Retry queued for the campaign/workflow dependency.')}>
                Retry failed item
              </Button>
            ) : null}
            <p className="crm-field__hint">{member.name} is now Inactive. Access stays blocked even though one item needs manual follow-up.</p>
          </div>
        </Drawer>
        {toast ? <Toast tone="info" message={toast} onDismiss={() => setToast(null)} /> : null}
      </>
    );
  }

  return (
    <Drawer
      open
      title={`Start exit — ${member.name}`}
      subtitle="High-risk flow: block access, scan dependencies, map transfers, then confirm."
      onClose={close}
      width="wide"
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <div style={{ flex: 1 }} />
          {step !== 'block' ? (
            <Button variant="secondary" onClick={() => setStep(steps[Math.max(steps.findIndex((s) => s.id === step) - 1, 0)].id)}>
              Back
            </Button>
          ) : null}
          {step !== 'review' ? (
            <Button
              variant="primary"
              disabled={(step === 'block' && !blocked) || (step === 'safeguards' && !attributionAck)}
              onClick={() => setStep(steps[Math.min(steps.findIndex((s) => s.id === step) + 1, steps.length - 1)].id)}
            >
              Continue
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setStep('result')}>
              Confirm exit
            </Button>
          )}
        </>
      }
    >
      <Stepper items={steps} currentId={step} />

      <div className="crm-invite-form" style={{ marginTop: 'var(--crm-space-4)' }}>
        {step === 'block' ? (
          <div className="crm-exit">
            <Select label="Reason" options={reasonOptions} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} />
            {reason !== 'voluntary' ? (
              <Banner tone="warning" title="Block Now recommended" description="Involuntary or suspended exits should block access immediately, before dependency review, to limit risk." />
            ) : (
              <Banner tone="info" title="Access will be blocked immediately" description="Blocking access does not require dependencies to be resolved first — transfer mapping happens next." />
            )}
            <Checkbox
              label={`Block ${member.name}'s access now`}
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
            />
          </div>
        ) : null}

        {step === 'dependencies' ? (
          <div className="crm-exit">
            <Banner tone="info" title="Access is blocked" description="Continuing to review what needs to be transferred before this exit is confirmed." />
            {dependencies.map((dep) => (
              <div key={dep.category} className="crm-exit__row">
                <span>{dep.label}</span>
                <span>{dep.count} {dep.transferRequired ? <Badge tone="warning">Transfer required</Badge> : <Badge tone="neutral">No transfer needed</Badge>}</span>
              </div>
            ))}
          </div>
        ) : null}

        {step === 'transfer' ? (
          <div className="crm-exit">
            {transferable.length === 0 ? (
              <p>Nothing requires transfer for this member.</p>
            ) : (
              transferable.map((dep) => (
                <Select
                  key={dep.category}
                  label={`${dep.label} (${dep.count}) → recipient`}
                  options={[
                    { value: '', label: 'Choose a recipient…' },
                    ...teamMembers.filter((m) => m.id !== member.id && m.employmentStatus === 'active').map((m) => ({ value: m.id, label: m.name })),
                  ]}
                  value={recipientFor(dep)}
                  onChange={(e) => setRecipient(dep.category, e.target.value)}
                />
              ))
            )}
          </div>
        ) : null}

        {step === 'safeguards' ? (
          <div className="crm-exit">
            <div className="crm-exit__row"><span>Active sessions & tokens</span><span>{member.activeSessionCount} will be revoked</span></div>
            <div className="crm-exit__row"><span>Roles & number access</span><span>Removed on confirm</span></div>
            <Banner tone="info" title="Historical attribution never changes" description="Past conversations, calls and audit events stay attributed to this person even after exit." />
            <Checkbox
              label="I understand historical records stay attributed to this person and won't be reassigned"
              checked={attributionAck}
              onChange={(e) => setAttributionAck(e.target.checked)}
            />
          </div>
        ) : null}

        {step === 'review' ? (
          <div className="crm-invite-review">
            <div className="crm-invite-review__row"><span>Member</span><span>{member.name}</span></div>
            <div className="crm-invite-review__row"><span>Reason</span><span>{reasonOptions.find((r) => r.value === reason)?.label}</span></div>
            <div className="crm-invite-review__row"><span>Access</span><span>Blocked</span></div>
            {transferable.map((dep) => (
              <div key={dep.category} className="crm-invite-review__row">
                <span>{dep.label}</span>
                <span>{recipientFor(dep) ? recipientLabel(recipientFor(dep)) : 'Not mapped — will need manual follow-up'}</span>
              </div>
            ))}
            <div className="crm-invite-review__row"><span>Result after transfer</span><span>Deactivated (not deleted) — history preserved</span></div>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
