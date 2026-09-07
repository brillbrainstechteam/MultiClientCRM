import { useState } from 'react';
import { ArrowLeft, Copy } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, ErrorState, PermissionRestricted, Tabs, Toast, type TabItem } from '@crm/design-system';
import { findWhatsAppNumber } from '@crm/mock-data';
import { CampaignStatusBadge } from '../components';
import { typeLabel } from '../campaigns-labels';
import { findCampaign } from '../data/mockCampaigns';
import { newDraftId } from './builder/builder-state';
import { resolveCampaignCapabilities } from '../domain/capabilityResolver';
import type { Campaign, RecipientStatus } from '../domain/types';
import { can } from '../permissions';
import { ArchiveConfirmModal } from '../overlays/ArchiveConfirmModal';
import { CancelCampaignModal } from '../overlays/CancelCampaignModal';
import { ExportRecipientsModal } from '../overlays/ExportRecipientsModal';
import { PauseResumeModal } from '../overlays/PauseResumeModal';
import { RecipientDetailDrawer } from '../overlays/RecipientDetailDrawer';
import { RescheduleDrawer } from '../overlays/RescheduleDrawer';
import { ResultSegmentModal } from '../overlays/ResultSegmentModal';
import { RetryFailedModal } from '../overlays/RetryFailedModal';
import { ActivityTab } from './detail/ActivityTab';
import { AnalyticsTab } from './detail/AnalyticsTab';
import { CampaignDraftState } from './detail/CampaignDraftState';
import { OverviewTab } from './detail/OverviewTab';
import { RecipientsTab } from './detail/RecipientsTab';
import { SpendTab } from './detail/SpendTab';

type SessionOverride = Partial<Pick<Campaign, 'status' | 'scheduledAt' | 'timezone' | 'cancelledReason' | 'cancelledAt' | 'recipients'>>;

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'recipients', label: 'Recipients' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'spend', label: 'Spend' },
  { id: 'activity', label: 'Activity' },
];

/** Dashboard's alert/AI-insight links use `tab=results` — alias it to the Recipients tab. */
function normalizeTab(raw: string | null): string {
  if (raw === 'results') return 'recipients';
  if (raw && tabs.some((t) => t.id === raw)) return raw;
  return 'overview';
}

/**
 * CAM-S02 — Campaign Detail. Shared architecture across every lifecycle
 * state; tab content and contextual actions read from the same capability
 * resolver used across the module so this stays the single source of truth.
 */
export default function CampaignDetailScreen() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser, visibleModules } = useWorkspace();

  const [archivedThisSession, setArchivedThisSession] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [sessionOverride, setSessionOverride] = useState<SessionOverride>({});

  const campaign = campaignId ? findCampaign(campaignId) : undefined;
  const tab = normalizeTab(searchParams.get('tab'));
  const returnTo = searchParams.get('returnTo');
  const drawer = searchParams.get('drawer');
  const modal = searchParams.get('modal');
  const recipientId = searchParams.get('recipientId');
  const segmentResult = (searchParams.get('result') as RecipientStatus | 'all' | null) ?? 'all';
  const flash = searchParams.get('flash');

  const setTab = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });

  const openOverlay = (key: 'drawer' | 'modal', value: string, extra?: Record<string, string>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      if (extra) for (const [k, v] of Object.entries(extra)) next.set(k, v);
      return next;
    });
  const closeOverlay = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'modal', 'recipientId', 'result']) next.delete(key);
      return next;
    });
  const flashMessage = (message: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'modal', 'recipientId']) next.delete(key);
      next.set('flash', message);
      return next;
    });
  const dismissFlash = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('flash');
      return next;
    });

  if (!visibleModules.includes('campaigns')) {
    return (
      <PermissionRestricted
        title="You do not have access to Campaigns"
        description={`Your role (${currentUser.roleLabel}) cannot open Campaigns.`}
      />
    );
  }

  if (!campaign) {
    return (
      <ErrorState
        title="Campaign not found"
        description="This campaign may have been removed, or the link is out of date."
        actions={
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(scopedHref('/campaigns'))}>
            Back to Campaigns
          </Button>
        }
      />
    );
  }

  if (campaign.status === 'draft') {
    return <CampaignDraftState campaign={campaign} />;
  }

  const isArchived = campaign.isArchived || archivedThisSession;
  const effectiveCampaign: Campaign = { ...campaign, ...sessionOverride, isArchived };
  const sender = effectiveCampaign.whatsappNumberId ? findWhatsAppNumber(effectiveCampaign.whatsappNumberId) : undefined;
  const capabilities = resolveCampaignCapabilities(role, effectiveCampaign, sender);

  const canArchive =
    can(role, 'campaign.archive') && (effectiveCampaign.status === 'completed' || effectiveCampaign.status === 'cancelled') && !isArchived;
  const canDuplicate = can(role, 'campaign.create');
  const canCreateFollowUp = can(role, 'campaign.create');
  const selectedRecipient = recipientId ? effectiveCampaign.recipients.find((r) => r.id === recipientId) : undefined;
  const exportRows = effectiveCampaign.recipients.length;

  const createFollowUp = (result: RecipientStatus | 'all') =>
    navigate(
      scopedHref('/campaigns/new', {
        source: 'follow-up',
        sourceCampaignId: effectiveCampaign.id,
        ...(result !== 'all' ? { result } : {}),
        draftId: newDraftId(),
        step: 'setup',
      }),
    );

  return (
    <div className="crm-camp-detail">
      <PageHeader
        title={effectiveCampaign.name}
        breadcrumbs={[{ label: 'Campaigns', to: scopedHref('/campaigns') }, { label: effectiveCampaign.name }]}
        description={`${typeLabel[effectiveCampaign.type]} · ${sender ? `${sender.displayName} (${sender.displayNumber})` : 'No sender selected'}`}
        actions={
          <>
            {returnTo ? (
              <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(returnTo)}>
                Back
              </Button>
            ) : null}
            <span className="crm-camp-detail__status">
              <CampaignStatusBadge campaign={effectiveCampaign} />
            </span>
            {effectiveCampaign.status === 'scheduled' && can(role, 'campaign.schedule') ? (
              <Button variant="secondary" onClick={() => openOverlay('drawer', 'reschedule')}>
                Reschedule
              </Button>
            ) : null}
            {effectiveCampaign.status === 'scheduled' && capabilities.canCancel ? (
              <Button variant="secondary" onClick={() => openOverlay('modal', 'cancel')}>
                Cancel
              </Button>
            ) : null}
            {effectiveCampaign.status === 'live' && capabilities.canPause ? (
              <Button variant="secondary" onClick={() => openOverlay('modal', 'pause')}>
                Pause
              </Button>
            ) : null}
            {effectiveCampaign.status === 'paused' && capabilities.canResume ? (
              <Button variant="secondary" onClick={() => openOverlay('modal', 'resume')}>
                Resume
              </Button>
            ) : null}
            <Button
              variant="secondary"
              iconLeft={<Copy />}
              disabled={!canDuplicate}
              title={canDuplicate ? undefined : 'Your role cannot create campaigns.'}
              onClick={() =>
                navigate(
                  scopedHref('/campaigns/new', {
                    source: 'duplicate',
                    sourceCampaignId: effectiveCampaign.id,
                    draftId: `cam_dup_${effectiveCampaign.id}_${Date.now()}`,
                    step: 'setup',
                  }),
                )
              }
            >
              Duplicate
            </Button>
            {canArchive ? (
              <Button variant="secondary" onClick={() => setArchiveOpen(true)}>
                Archive
              </Button>
            ) : null}
          </>
        }
        toolbar={<Tabs tabs={tabs} activeId={tab} ariaLabel="Campaign detail" onChange={setTab} />}
      />

      {tab === 'overview' ? <OverviewTab campaign={effectiveCampaign} sender={sender} capabilities={capabilities} /> : null}
      {tab === 'recipients' ? (
        <RecipientsTab
          campaign={effectiveCampaign}
          onOpenRecipient={(id) => openOverlay('drawer', 'recipient', { recipientId: id })}
          onExport={() => openOverlay('modal', 'export')}
          canExport={capabilities.canExport}
          onCreateSegment={(result) => openOverlay('modal', 'create-segment', { result })}
          canCreateSegment={capabilities.canCreateResultSegment}
          onRetryFailed={() => openOverlay('modal', 'retry-failed')}
          canRetry={capabilities.canRetry}
          onCreateFollowUp={createFollowUp}
          canCreateFollowUp={canCreateFollowUp}
        />
      ) : null}
      {tab === 'analytics' ? <AnalyticsTab campaign={effectiveCampaign} /> : null}
      {tab === 'spend' ? <SpendTab campaign={effectiveCampaign} capabilities={capabilities} /> : null}
      {tab === 'activity' ? <ActivityTab campaign={effectiveCampaign} /> : null}

      <ArchiveConfirmModal
        open={archiveOpen}
        campaignName={effectiveCampaign.name}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => {
          setArchivedThisSession(true);
          setArchiveOpen(false);
        }}
      />

      <RescheduleDrawer
        open={drawer === 'reschedule'}
        currentScheduledAt={effectiveCampaign.scheduledAt}
        currentTimezone={effectiveCampaign.timezone}
        onClose={closeOverlay}
        onConfirm={(scheduledAt, timezone) => {
          setSessionOverride((prev) => ({ ...prev, scheduledAt, timezone }));
          flashMessage(`Schedule updated to ${scheduledAt ? new Date(scheduledAt).toLocaleString('en-IN') : 'the new time'}.`);
        }}
      />

      <CancelCampaignModal
        open={modal === 'cancel'}
        campaignName={effectiveCampaign.name}
        onCancel={closeOverlay}
        onConfirm={(reason) => {
          setSessionOverride((prev) => ({ ...prev, status: 'cancelled', cancelledReason: reason, cancelledAt: new Date().toISOString() }));
          flashMessage(`"${effectiveCampaign.name}" was cancelled.`);
        }}
      />

      <PauseResumeModal
        open={modal === 'pause' || modal === 'resume'}
        direction={modal === 'resume' ? 'resume' : 'pause'}
        campaignName={effectiveCampaign.name}
        onCancel={closeOverlay}
        onConfirm={() => {
          const next = modal === 'resume' ? 'live' : 'paused';
          setSessionOverride((prev) => ({ ...prev, status: next }));
          flashMessage(next === 'paused' ? `"${effectiveCampaign.name}" is paused.` : `"${effectiveCampaign.name}" has resumed sending.`);
        }}
      />

      <ExportRecipientsModal
        open={modal === 'export'}
        recipientCount={exportRows}
        onClose={closeOverlay}
        onExport={() => flashMessage('Export started — this is a prototype export with no real file generated.')}
      />

      <RecipientDetailDrawer
        open={drawer === 'recipient'}
        recipient={selectedRecipient}
        onClose={closeOverlay}
        returnTo={scopedHref(`/campaigns/${effectiveCampaign.id}`, { tab: 'recipients' })}
      />

      <ResultSegmentModal
        open={modal === 'create-segment'}
        campaign={effectiveCampaign}
        initialResult={segmentResult}
        onClose={closeOverlay}
      />

      <RetryFailedModal
        open={modal === 'retry-failed'}
        campaign={effectiveCampaign}
        onClose={closeOverlay}
        onConfirm={(retryIds) => {
          const retrySet = new Set(retryIds);
          setSessionOverride((prev) => ({
            ...prev,
            recipients: effectiveCampaign.recipients.map((r) =>
              retrySet.has(r.id) ? { ...r, status: 'queued', failureReason: undefined, failureCategory: undefined } : r,
            ),
          }));
          flashMessage(`${retryIds.length} recipient(s) queued for retry.`);
        }}
      />

      {flash ? <Toast tone="success" message={flash} onDismiss={dismissFlash} /> : null}
    </div>
  );
}
