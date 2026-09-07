import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Banner, Button, Modal, WizardShell, type StepperItem } from '@crm/design-system';
import { findWhatsAppNumber } from '@crm/mock-data';
import type { Campaign, CampaignType } from '../domain/types';
import { audienceValid, builderSteps, initCampaignDraft, personalisationValid, setupValid, templateValid } from './builder/builder-state';
import { AudienceStep } from './builder/AudienceStep';
import { PersonalisationStep } from './builder/PersonalisationStep';
import { ReviewStep } from './builder/ReviewStep';
import { SetupStep } from './builder/SetupStep';
import { TemplateStep } from './builder/TemplateStep';

const phase2StepId: Partial<Record<CampaignType, string>> = {
  recurring: 'recurrence',
  trigger: 'trigger',
  api: 'api',
};

const phase2Label: Partial<Record<CampaignType, string>> = {
  recurring: 'Recurrence Setup',
  trigger: 'Trigger Setup',
  api: 'API Setup',
};

const backStep: Record<string, string> = {
  template: 'setup',
  audience: 'template',
  personalisation: 'audience',
  review: 'personalisation',
};

/** Phase-2 handoffs point at the real (placeholder) Automation/Settings routes rather than inventing new ones — CLAUDE.md §8. */
function phase2Description(type: CampaignType, scopedHref: (path: string, extra?: Record<string, string>) => string, builderUrl: string) {
  if (type === 'recurring') {
    return 'Recurring campaigns are a Phase 2 capability. Recurrence rules (frequency, end conditions, overlap handling) are not yet defined for this prototype.';
  }
  if (type === 'trigger') {
    return (
      <>
        Trigger-based campaigns are a Phase 2 capability. One trigger maps to one campaign message — multi-step or
        branching automation belongs to the <Link to={scopedHref('/automation', { returnTo: builderUrl })}>Journey builder</Link>, and
        integration setup belongs to <Link to={scopedHref('/settings', { section: 'integrations', returnTo: builderUrl })}>Settings</Link>.
      </>
    );
  }
  return (
    <>
      API-triggered campaigns are a Phase 2 capability. Credentials, authentication and webhook administration belong
      to <Link to={scopedHref('/settings', { section: 'integrations', returnTo: builderUrl })}>Settings</Link> — this prototype does not invent a
      final payload or rate-limit contract.
    </>
  );
}

/**
 * `/campaigns/new` — one continuous builder shell (CAM-S03/S04 real; S05–S07
 * are Batch 3/4 placeholders so the lifecycle still reads as connected —
 * CLAUDE.md "Guide the user through the campaign rather than exposing one
 * large configuration form"). Remounts only when the draft's *identity*
 * changes (draftId/source/sourceCampaignId), not on every step navigation.
 */
export default function CampaignBuilderScreen() {
  const [searchParams] = useSearchParams();

  const draftKey = [
    searchParams.get('draftId') ?? 'new',
    searchParams.get('source') ?? '',
    searchParams.get('sourceCampaignId') ?? '',
  ].join(':');

  return <BuilderInner key={draftKey} />;
}

function BuilderInner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { currentUser, branchId, availableWhatsAppNumbers } = useWorkspace();

  const [draft, setDraft] = useState<Campaign>(() =>
    initCampaignDraft({
      draftId: searchParams.get('draftId'),
      source: searchParams.get('source'),
      sourceCampaignId: searchParams.get('sourceCampaignId'),
      resultType: searchParams.get('result'),
      requestedType: searchParams.get('type'),
      creatorId: currentUser.id,
      branchId: branchId === 'all' ? currentUser.branchId : branchId,
      defaultWhatsAppNumberId: availableWhatsAppNumbers[0]?.id ?? null,
    }),
  );
  const [exitModalOpen, setExitModalOpen] = useState(false);

  const step = searchParams.get('step') ?? draft.draftLastStep ?? 'setup';
  const returnTo = searchParams.get('returnTo') ?? '/campaigns';
  const sender = draft.whatsappNumberId ? findWhatsAppNumber(draft.whatsappNumberId) : undefined;

  const isPhase2Type = draft.type === 'recurring' || draft.type === 'trigger' || draft.type === 'api';
  const steps: StepperItem[] = isPhase2Type
    ? [{ id: 'setup', label: 'Setup' }, { id: phase2StepId[draft.type]!, label: phase2Label[draft.type]! }]
    : builderSteps;

  const setStep = (id: string) => {
    setDraft((d) => ({ ...d, draftLastStep: id === 'setup' || id === 'template' || id === 'audience' || id === 'personalisation' || id === 'review' ? (id as Campaign['draftLastStep']) : d.draftLastStep }));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', id);
      return next;
    });
  };

  const goBack = () => setStep(isPhase2Type ? 'setup' : (backStep[step] ?? 'setup'));
  const goContinueFromSetup = () => setStep(isPhase2Type ? phase2StepId[draft.type]! : 'template');
  const goContinueFromTemplate = () => setStep('audience');
  const goContinueFromAudience = () => setStep('personalisation');
  const goContinueFromPersonalisation = () => setStep('review');

  const saveDraftAndExit = () => navigate(scopedHref('/campaigns', { view: 'draft' }));
  const discardAndExit = () => navigate(returnTo.startsWith('/') ? returnTo : scopedHref(returnTo));
  const backToOneTime = () => {
    setDraft((d) => ({ ...d, type: 'one-time', updatedAt: new Date().toISOString() }));
    setStep('setup');
  };

  const builderUrl = `/campaigns/new?${searchParams.toString()}`;

  const title = draft.name || (draft.type === 'follow-up' ? 'Follow-up campaign' : 'New campaign');

  return (
    <div className="crm-camp-builder">
      <WizardShell
        title={title}
        subtitle="Setup → Template → Audience → Personalisation → Review & Launch"
        steps={steps}
        currentId={isPhase2Type ? (step === 'setup' ? 'setup' : phase2StepId[draft.type]!) : step}
        onCancel={() => setExitModalOpen(true)}
        footer={
          <div className="crm-camp-builder__footer">
            <div className="crm-camp-builder__footer-left">
              {step !== 'setup' ? (
                <Button variant="secondary" onClick={goBack}>
                  Back
                </Button>
              ) : null}
              <Button variant="ghost" onClick={saveDraftAndExit}>
                Save Draft
              </Button>
            </div>
            <div className="crm-camp-builder__footer-right">
              {step === 'setup' ? (
                <Button variant="primary" onClick={goContinueFromSetup} disabled={!setupValid(draft)}>
                  Continue
                </Button>
              ) : null}
              {step === 'template' ? (
                <Button variant="primary" onClick={goContinueFromTemplate} disabled={!templateValid(draft)}>
                  Continue
                </Button>
              ) : null}
              {step === 'audience' ? (
                <Button variant="primary" onClick={goContinueFromAudience} disabled={!audienceValid(draft)}>
                  Continue
                </Button>
              ) : null}
              {step === 'personalisation' ? (
                <Button variant="primary" onClick={goContinueFromPersonalisation} disabled={!personalisationValid(draft)}>
                  Continue
                </Button>
              ) : null}
              {isPhase2Type && step !== 'setup' ? (
                <Button variant="secondary" onClick={backToOneTime}>
                  Switch to one-time campaign
                </Button>
              ) : null}
            </div>
          </div>
        }
      >
        {step === 'setup' ? (
          <SetupStep draft={draft} setDraft={setDraft} availableWhatsAppNumbers={availableWhatsAppNumbers} />
        ) : null}

        {!isPhase2Type && step === 'template' ? (
          <TemplateStep draft={draft} setDraft={setDraft} sender={sender} builderUrl={builderUrl} />
        ) : null}

        {!isPhase2Type && step === 'audience' ? (
          <AudienceStep draft={draft} setDraft={setDraft} branchId={draft.branchId} builderUrl={builderUrl} />
        ) : null}
        {!isPhase2Type && step === 'personalisation' ? (
          <PersonalisationStep draft={draft} setDraft={setDraft} />
        ) : null}
        {!isPhase2Type && step === 'review' ? (
          <ReviewStep draft={draft} setDraft={setDraft} sender={sender} onDeepLink={(target) => setStep(target ?? 'setup')} />
        ) : null}

        {isPhase2Type && step !== 'setup' ? (
          <div className="crm-camp-builder__phase2">
            <Banner
              tone="warning"
              title={<><Badge tone="warning">Phase 2</Badge>&nbsp; {phase2Label[draft.type]} is not available yet</>}
              description={phase2Description(draft.type, scopedHref, builderUrl)}
            />
          </div>
        ) : null}
      </WizardShell>

      <Modal
        open={exitModalOpen}
        title="Leave this campaign draft?"
        onClose={() => setExitModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setExitModalOpen(false)}>
              Continue Editing
            </Button>
            <Button variant="danger" onClick={discardAndExit}>
              Discard Changes
            </Button>
            <Button variant="primary" onClick={saveDraftAndExit}>
              Save Draft &amp; Exit
            </Button>
          </>
        }
      >
        <p className="crm-camp-builder__exit-copy">
          Choose whether to keep this draft, discard your changes, or continue editing. Exiting never sends or
          schedules the campaign.
        </p>
      </Modal>
    </div>
  );
}
