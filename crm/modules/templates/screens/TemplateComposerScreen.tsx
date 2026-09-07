import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, ConfirmDialog, WizardShell, type StepperItem } from '@crm/design-system';
import { existingTemplateNames } from '../data/mockTemplates';
import { can } from '../permissions';
import { useTargetWaba, useWabaScope } from '../use-waba-scope';
import { basicsValid, BasicsStep } from './composer/BasicsStep';
import { ComposeStep } from './composer/ComposeStep';
import { PreviewStep, computeValidation } from './composer/PreviewStep';
import { ReviewStep } from './composer/ReviewStep';
import { SubmissionOutcomeModal } from './composer/SubmissionOutcomeModal';
import { initComposerDraft, type ComposerDraft } from './composer/composer-state';

const steps: StepperItem[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'compose', label: 'Compose' },
  { id: 'preview', label: 'Preview & Validate' },
  { id: 'review', label: 'Review & Submit' },
];

/**
 * `/templates/new` — the shared Template Composer (TPL-S04–S09). One
 * integrated shell across Basics → Compose → Preview & Validate → Review &
 * Submit, driven entirely by query state (CODE_FIRST_ADAPTER.md). Remounts
 * (and re-initializes the draft) only when the composer's *target* changes —
 * not on every step navigation.
 */
export default function TemplateComposerScreen() {
  const [searchParams] = useSearchParams();
  const targetWaba = useTargetWaba();

  const draftKey = [
    searchParams.get('source') ?? 'scratch',
    searchParams.get('cloneFrom') ?? searchParams.get('templateId') ?? searchParams.get('libraryId') ?? searchParams.get('familyId') ?? 'new',
  ].join(':');

  return <ComposerInner key={draftKey} defaultWabaId={targetWaba.id} />;
}

function ComposerInner({ defaultWabaId }: { defaultWabaId: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();
  const { wabas } = useWabaScope();

  const [draft, setDraft] = useState<ComposerDraft>(() =>
    initComposerDraft({
      source: searchParams.get('source'),
      cloneFrom: searchParams.get('cloneFrom'),
      libraryId: searchParams.get('libraryId'),
      familyId: searchParams.get('familyId'),
      templateId: searchParams.get('templateId'),
      requestedFormat: searchParams.get('format'),
      defaultWabaId,
    }),
  );

  const [confirmExit, setConfirmExit] = useState(false);
  const [outcomeReference, setOutcomeReference] = useState<string>('');

  const step = searchParams.get('step') ?? 'basics';
  const forcedComposeState = searchParams.get('state');
  const focusSection = searchParams.get('focus');
  const approvalMode = searchParams.get('approval') === 'required' ? 'required' : 'off';
  const modal = searchParams.get('modal');
  const result = searchParams.get('result') === 'failure' ? 'failure' : 'success';

  const returnTo = searchParams.get('returnTo') ?? '/templates';
  const waba = wabas.find((w) => w.id === draft.wabaId) ?? wabas[0];
  const existingNames = existingTemplateNames(draft.wabaId, draft.editingTemplateId);
  const validation = computeValidation(draft, existingNames);
  const canApproveDirectly = can(role, 'internalApprove');

  const setStep = (id: string, extra?: Record<string, string | null>) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', id);
      next.delete('focus');
      if (extra) {
        for (const [key, value] of Object.entries(extra)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
      }
      return next;
    });

  const goCompose = (format?: string) => setStep('compose', format ? { format } : undefined);

  const saveDraft = () => navigate(scopedHref('/templates', { view: 'draft' }));

  const exitWithoutSaving = () => navigate(scopedHref(returnTo));

  const openSubmissionOutcome = (outcome: 'success' | 'failure') => {
    setOutcomeReference(`meta_tpl_${Math.floor(1000000 + Math.random() * 8999999)}`);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('modal', 'submission-outcome');
      next.set('result', outcome);
      return next;
    });
  };

  const closeOutcomeModal = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      next.delete('result');
      return next;
    });

  const submit = () => {
    if (approvalMode === 'required' && !canApproveDirectly) {
      navigate(scopedHref('/templates/approvals', { view: 'awaiting-review' }));
      return;
    }
    openSubmissionOutcome('success');
  };

  const primaryReviewLabel =
    approvalMode === 'required' ? (canApproveDirectly ? 'Approve & Submit to Meta' : 'Send for Approval') : 'Submit to Meta';

  return (
    <div className="crm-tpl-composer">
      <WizardShell
        title={draft.editingTemplateId ? `Editing · ${draft.name || 'Untitled template'}` : draft.name || 'New template'}
        subtitle="Discover → Create → Preview → Validate → Approve → Submit"
        steps={steps}
        currentId={step}
        onCancel={() => setConfirmExit(true)}
        footer={
          <div className="crm-tpl-composer__footer">
            <div className="crm-tpl-composer__footer-left">
              {step !== 'basics' ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (step === 'compose') setStep('basics');
                    else if (step === 'preview') setStep('compose');
                    else if (step === 'review') setStep('preview');
                  }}
                >
                  Back
                </Button>
              ) : null}
              <Button variant="ghost" onClick={saveDraft}>Save Draft</Button>
            </div>
            <div className="crm-tpl-composer__footer-right">
              {step === 'basics' ? (
                <Button variant="primary" onClick={() => goCompose()} disabled={!basicsValid(draft)}>Continue</Button>
              ) : null}
              {step === 'compose' ? (
                <Button variant="primary" onClick={() => setStep('preview')}>Continue</Button>
              ) : null}
              {step === 'preview' ? (
                <Button variant="primary" onClick={() => setStep('review')} disabled={validation.errors.length > 0}>
                  Continue
                </Button>
              ) : null}
              {step === 'review' ? (
                <>
                  <Button variant="ghost" onClick={() => openSubmissionOutcome('failure')}>Simulate failure</Button>
                  <Button variant="primary" onClick={submit}>{primaryReviewLabel}</Button>
                </>
              ) : null}
            </div>
          </div>
        }
      >
        {step === 'basics' ? <BasicsStep draft={draft} setDraft={setDraft} /> : null}
        {step === 'compose' ? (
          <ComposeStep draft={draft} setDraft={setDraft} forcedState={forcedComposeState} focusSection={focusSection} />
        ) : null}
        {step === 'preview' ? (
          <PreviewStep
            draft={draft}
            existingNames={existingNames}
            onFocusIssue={(sectionId) => {
              if (sectionId === 'basics') setStep('basics');
              else setStep('compose', { format: draft.format, focus: sectionId });
            }}
          />
        ) : null}
        {step === 'review' ? (
          <ReviewStep
            draft={draft}
            waba={waba}
            validation={validation}
            creatorId={currentUser.id}
            approvalMode={approvalMode}
            onApprovalModeChange={(mode) =>
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (mode === 'off') next.delete('approval');
                else next.set('approval', 'required');
                return next;
              })
            }
            canApproveDirectly={canApproveDirectly}
          />
        ) : null}
      </WizardShell>

      <SubmissionOutcomeModal
        open={modal === 'submission-outcome'}
        result={result}
        templateName={draft.name}
        metaReference={outcomeReference || `meta_tpl_${draft.name}`}
        onViewTemplate={() =>
          navigate(
            draft.editingTemplateId
              ? scopedHref(`/templates/${draft.editingTemplateId}`)
              : scopedHref('/templates', { view: 'pending' }),
          )
        }
        onBackToTemplates={() => navigate(scopedHref('/templates'))}
        onRetry={() => openSubmissionOutcome('success')}
        onEditTemplate={closeOutcomeModal}
      />

      <ConfirmDialog
        open={confirmExit}
        title="Discard changes?"
        message="Leaving now discards this composer session unless you saved a draft."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="danger"
        onCancel={() => setConfirmExit(false)}
        onConfirm={exitWithoutSaving}
      />
    </div>
  );
}
