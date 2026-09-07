import { useState } from 'react';
import { CircleCheck, CircleDashed, LifeBuoy, PencilLine, Settings2, TriangleAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { useWorkspace } from '@crm/app/workspace-context';
import { PageHeader } from '@crm/components';
import { Badge, Button, EmptyState, Modal, Select, Tabs, type TabItem } from '@crm/design-system';
import {
  branches,
  findBranch,
  findOnboardingNumber,
  findTeam,
  findUser,
  findWhatsAppNumber,
  onboardingRoleFor,
  plans,
  teams,
  users,
} from '@crm/mock-data';
import { can } from '@crm/modules/onboarding/permissions';
import { NumberActionModal } from './NumberActionModal';
import { NUMBER_STATUS_META, PAYER_MODE_LABEL, PURPOSE_LABEL } from './number-status';

const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'connection', label: 'Connection' },
  { id: 'mapping', label: 'Access & Mapping' },
  { id: 'history', label: 'History' },
  { id: 'usage', label: 'Usage & Billing' },
  { id: 'activity', label: 'Activity' },
];

/** N02 — Number Detail (SKILL.md "Number Detail"). Tabs stay deterministic query state, not sub-routes. */
export default function NumberDetail() {
  const navigate = useNavigate();
  const { numberId = '' } = useParams<{ numberId: string }>();
  const [searchParams, patch] = useQueryPatch();
  const { role } = useWorkspace();
  const onboardingRole = onboardingRoleFor(role);

  const record = findOnboardingNumber(numberId);
  const tab = searchParams.get('tab') ?? 'overview';
  const mappingModalOpen = searchParams.get('modal') === 'mapping';

  const [mappingOverride, setMappingOverride] = useState<{ branchId: string | null; teamId: string | null; managerUserId: string | null } | null>(null);
  const [mappingDraft, setMappingDraft] = useState<{ branchId: string; teamId: string; managerUserId: string } | null>(null);

  const setTab = (id: string) => patch({ tab: id });

  if (!record) {
    return (
      <div>
        <PageHeader title="Number not found" breadcrumbs={[{ label: 'Settings', to: '/settings' }, { label: 'WhatsApp & Connections', to: '/settings/whatsapp' }]} />
        <EmptyState
          title="This number doesn't exist"
          description="It may have been removed, or the link is out of date."
          actions={<Button variant="primary" onClick={() => navigate('/settings/whatsapp')}>Back to registry</Button>}
        />
      </div>
    );
  }

  const registryEntry = record.linkedRegistryId ? findWhatsAppNumber(record.linkedRegistryId) : undefined;
  const effectiveBranchId = mappingOverride ? mappingOverride.branchId : record.branchId;
  const effectiveTeamId = mappingOverride ? mappingOverride.teamId : record.teamId;
  const effectiveManagerId = mappingOverride ? mappingOverride.managerUserId : record.managerUserId;
  const branch = effectiveBranchId ? findBranch(effectiveBranchId) : undefined;
  const team = effectiveTeamId ? findTeam(effectiveTeamId) : undefined;
  const manager = effectiveManagerId ? findUser(effectiveManagerId) : undefined;
  const plan = plans.find((p) => p.id === record.billingContext.planId);
  const statusMeta = NUMBER_STATUS_META[record.status];
  const canEditMapping = can(onboardingRole, 'manageTeamMapping');

  return (
    <div className="crm-number-detail">
      <PageHeader
        title={record.displayName}
        description={record.phone || 'Phone number pending'}
        breadcrumbs={[
          { label: 'Settings', to: '/settings' },
          { label: 'WhatsApp & Connections', to: '/settings/whatsapp' },
          { label: record.displayName },
        ]}
        actions={
          <>
            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            <Button variant="secondary" iconLeft={<Settings2 />} onClick={() => patch({ modal: 'number-action' })}>
              Manage connection
            </Button>
          </>
        }
        toolbar={<Tabs tabs={TABS} activeId={tab} onChange={setTab} ariaLabel="Number detail sections" />}
      />

      {tab === 'overview' ? (
        <div className="crm-number-detail__grid">
          <section className="crm-number-detail__card">
            <h3>Identity</h3>
            <dl className="crm-number-detail__facts">
              <div><dt>Display name</dt><dd>{record.displayName}</dd></div>
              <div><dt>Phone</dt><dd>{record.phone || 'Pending'}</dd></div>
              <div><dt>Purpose</dt><dd>{PURPOSE_LABEL[record.purpose] ?? record.purpose}</dd></div>
              <div><dt>Business / location</dt><dd>{branch ? `${branch.name} — ${branch.city}` : 'Main Business'}</dd></div>
              <div><dt>Created</dt><dd>{new Date(record.createdAt).toLocaleDateString()}</dd></div>
            </dl>
          </section>
          <section className="crm-number-detail__card">
            <h3>Jump to</h3>
            <div className="crm-number-detail__links">
              <Button variant="ghost" onClick={() => navigate(`/inbox?whatsappNumberId=${record.id}`)}>Inbox</Button>
              <Button variant="ghost" onClick={() => navigate('/templates')}>Templates</Button>
              <Button variant="ghost" onClick={() => navigate('/campaigns')}>Campaigns</Button>
              <Button variant="ghost" onClick={() => navigate('/reports')}>Reports</Button>
              <Button variant="ghost" onClick={() => navigate(`/team-access?returnTo=${encodeURIComponent(`/settings/whatsapp/numbers/${record.id}`)}`)}>Team &amp; Access</Button>
              <Button variant="ghost" onClick={() => navigate('/billing?tab=plan')}>Billing</Button>
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'connection' ? (
        <section className="crm-number-detail__card">
          <h3>Connection health</h3>
          <p className="crm-number-detail__muted">
            Meta capacity: <strong>{record.metaCapacityState === 'available' ? 'Available' : record.metaCapacityState === 'limited' ? 'Limited' : 'At capacity'}</strong>
            {registryEntry ? <> · Quality rating: <strong>{registryEntry.qualityRating}</strong> · {registryEntry.messagingLimit}</> : null}
          </p>
          <ul className="crm-number-detail__progress">
            {record.connectionProgress.map((step) => {
              const Icon = step.status === 'complete' ? CircleCheck : step.status === 'failed' ? TriangleAlert : CircleDashed;
              return (
                <li key={step.id} className={`crm-number-detail__progress-item crm-number-detail__progress-item--${step.status}`}>
                  <Icon aria-hidden="true" />
                  <span>{step.label}</span>
                  {step.status === 'failed' ? (
                    <Button variant="ghost" size="sm" iconLeft={<LifeBuoy />} onClick={() => navigate(`/setup/connect?stage=meta&step=progress&numberId=${record.id}&drawer=issue&issue=${step.id}`)}>
                      Get help
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <details className="crm-review-advanced">
            <summary>Technical Details</summary>
            <ul className="crm-number-detail__technical">
              {record.connectionProgress.map((step) => (
                <li key={step.id}><code>{step.id}</code>: {step.technical}</li>
              ))}
              <li><code>wabaId</code>: {record.wabaId ?? '—'}</li>
              <li><code>metaReturnState</code>: {record.metaReturnState ?? '—'}</li>
            </ul>
          </details>
        </section>
      ) : null}

      {tab === 'mapping' ? (
        <section className="crm-number-detail__card">
          <h3>Access &amp; mapping</h3>
          <dl className="crm-number-detail__facts">
            <div><dt>Business / location</dt><dd>{branch ? branch.name : 'Main Business'}</dd></div>
            <div><dt>Team</dt><dd>{team ? team.name : 'Unassigned'}</dd></div>
            <div><dt>Manager / owner</dt><dd>{manager ? manager.name : 'Unassigned'}</dd></div>
          </dl>
          <div className="crm-number-detail__links">
            <Button
              variant="secondary"
              iconLeft={<PencilLine />}
              disabled={!canEditMapping}
              title={!canEditMapping ? 'Your role cannot edit number mapping.' : undefined}
              onClick={() => {
                setMappingDraft({
                  branchId: effectiveBranchId ?? '',
                  teamId: effectiveTeamId ?? '',
                  managerUserId: effectiveManagerId ?? '',
                });
                patch({ modal: 'mapping' });
              }}
            >
              Edit mapping
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/team-access?returnTo=${encodeURIComponent(`/settings/whatsapp/numbers/${record.id}`)}`)}>
              Manage advanced permissions in Team &amp; Access
            </Button>
          </div>
        </section>
      ) : null}

      {tab === 'history' ? (
        <section className="crm-number-detail__card">
          <h3>History</h3>
          <p className="crm-number-detail__muted">
            {record.historyChoice && record.historyChoice !== 'skipped'
              ? `${record.historyChoice === 'imported' ? 'Imported' : record.historyChoice === 'reference' ? 'Reference upload' : 'Manual summary'} — starting ${record.historyStart ?? 'unknown date'}.`
              : 'No history added yet. Optional — never blocks going live.'}
          </p>
          <Button variant="secondary" onClick={() => navigate(`/settings/history?numberId=${record.id}`)}>
            Open History Centre
          </Button>
        </section>
      ) : null}

      {tab === 'usage' ? (
        <section className="crm-number-detail__card">
          <h3>Usage &amp; billing context</h3>
          <dl className="crm-number-detail__facts">
            <div><dt>Payer model</dt><dd>{PAYER_MODE_LABEL[record.billingContext.payerMode]}</dd></div>
            <div><dt>Plan</dt><dd>{plan ? `${plan.name} — ${plan.currency} ${plan.total.toFixed(2)}/${plan.billingCycle === 'monthly' ? 'mo' : 'yr'}` : 'Unknown plan'}</dd></div>
          </dl>
          <Button variant="secondary" onClick={() => navigate('/billing?tab=messaging-balance')}>
            View messaging balance
          </Button>
        </section>
      ) : null}

      {tab === 'activity' ? (
        <section className="crm-number-detail__card">
          <h3>Activity</h3>
          <ul className="crm-number-detail__activity">
            <li>{new Date(record.createdAt).toLocaleString()} — Number setup started.</li>
            {record.metaReturnState ? <li>Meta connection returned: {record.metaReturnState}.</li> : null}
            {record.disconnectIntent ? <li>Last connection action: {record.disconnectIntent}.</li> : null}
            {record.status === 'live' ? <li>Number is live and sending/receiving messages.</li> : null}
          </ul>
        </section>
      ) : null}

      <Modal
        open={mappingModalOpen && Boolean(mappingDraft)}
        title="Edit business, team and manager"
        onClose={() => patch({ modal: null })}
        footer={
          <>
            <Button variant="ghost" onClick={() => patch({ modal: null })}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (mappingDraft) {
                  setMappingOverride({
                    branchId: mappingDraft.branchId || null,
                    teamId: mappingDraft.teamId || null,
                    managerUserId: mappingDraft.managerUserId || null,
                  });
                }
                patch({ modal: null });
              }}
            >
              Save mapping
            </Button>
          </>
        }
      >
        {mappingDraft ? (
          <div className="crm-number-detail__mapping-form">
            <Select
              label="Business / location"
              options={[{ value: '', label: 'Main Business' }, ...branches.map((b) => ({ value: b.id, label: `${b.name} — ${b.city}` }))]}
              value={mappingDraft.branchId}
              onChange={(e) => setMappingDraft({ ...mappingDraft, branchId: e.target.value })}
            />
            <Select
              label="Team"
              options={[{ value: '', label: 'Unassigned' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
              value={mappingDraft.teamId}
              onChange={(e) => setMappingDraft({ ...mappingDraft, teamId: e.target.value })}
            />
            <Select
              label="Manager / owner"
              options={[{ value: '', label: 'Unassigned' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
              value={mappingDraft.managerUserId}
              onChange={(e) => setMappingDraft({ ...mappingDraft, managerUserId: e.target.value })}
            />
          </div>
        ) : null}
      </Modal>

      <NumberActionModal record={record} role={onboardingRole} />
    </div>
  );
}
