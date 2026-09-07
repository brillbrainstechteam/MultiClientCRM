import { ArrowLeft, ArrowRight, RotateCcw, Upload } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button } from '@crm/design-system';
import { WizardShell } from '@crm/design-system';
import type { ImportMethod } from '@crm/mock-data';
import {
  ExtractStep,
  MapStep,
  MethodStep,
  PreviewStep,
  ProcessingStep,
  ResultsStep,
  SourceStep,
  ValidateStep,
} from './steps';
import {
  sequenceFor,
  stepFromPath,
  stepLabels,
  stepPaths,
  type StepId,
} from './import-flow';

const NEW_JOB_ID = 'imp-20260810-01';
const SCOPE_KEYS = ['role', 'branchId', 'whatsappNumberId'] as const;

/**
 * The one Import Wizard container. Rendered for every `/contacts/imports/new/*`
 * step; it derives the current step from the URL, sequences steps by method
 * (Intelligent → extraction; others → mapping) and owns Back/Continue/Cancel.
 * State variants are read from `?state=` so each is reproducible by URL.
 */
export function ImportWizard() {
  const location = useLocation();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();

  const method = (searchParams.get('method') as ImportMethod | null) ?? null;
  const state = searchParams.get('state');
  const googleConnected = searchParams.get('googleAuth') === 'connected';

  const sequence = sequenceFor(method);
  const rawStep = stepFromPath(location.pathname);
  // Normalise a map/extract mismatch to the method's actual third step.
  const currentStep: StepId =
    rawStep === 'mapping' && method === 'intelligent'
      ? 'extraction'
      : rawStep === 'extraction' && method !== 'intelligent'
        ? 'mapping'
        : rawStep;
  const index = Math.max(0, sequence.indexOf(currentStep));

  const steps = sequence.map((id) => ({ id, label: stepLabels[id] }));

  /** Navigate to a step, carrying scope + method + google auth, dropping state. */
  const goStep = (id: StepId) => {
    const params = new URLSearchParams();
    for (const key of SCOPE_KEYS) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    if (method) params.set('method', method);
    if (googleConnected) params.set('googleAuth', 'connected');
    navigate(`${stepPaths[id]}?${params.toString()}`);
  };

  const goNext = () => goStep(sequence[Math.min(sequence.length - 1, index + 1)]);
  const goPrev = () => goStep(sequence[Math.max(0, index - 1)]);
  const cancel = () => navigate(scopedHref('/contacts/imports'));

  const pickMethod = (m: ImportMethod) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('method', m);
      return next;
    });

  const openGoogle = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('modal', 'google-contacts');
      return next;
    });

  /* ---- Continue-enabled rules per step -------------------------------- */
  const continueDisabled =
    (currentStep === 'method' && !method) ||
    (currentStep === 'source' &&
      (state === 'invalid-file' ||
        ((method === 'google' || method === 'sheets') && !googleConnected))) ||
    (currentStep === 'mapping' && state === 'incomplete-mapping');

  return (
    <WizardShell
      title="Import contacts"
      subtitle="Bring contacts into TalkTrack. Nothing is written until you start the import."
      steps={steps}
      currentId={currentStep}
      onCancel={cancel}
      footer={renderFooter()}
    >
      {renderStep()}
    </WizardShell>
  );

  function renderStep() {
    switch (currentStep) {
      case 'method':
        return <MethodStep method={method} onPick={pickMethod} />;
      case 'source':
        return <SourceStep method={method ?? 'csv'} state={state} googleConnected={googleConnected} onOpenGoogle={openGoogle} />;
      case 'mapping':
        return <MapStep state={state} />;
      case 'extraction':
        return <ExtractStep state={state} />;
      case 'validation':
        return <ValidateStep state={state} />;
      case 'preview':
        return <PreviewStep />;
      case 'processing':
        return <ProcessingStep state={state} jobId={NEW_JOB_ID} />;
      case 'results':
        return <ResultsStep state={state} />;
      default:
        return null;
    }
  }

  function renderFooter() {
    if (currentStep === 'processing') {
      if (state === 'fatal') {
        return (
          <>
            <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => goStep('preview')}>
              Back to preview
            </Button>
            <span />
          </>
        );
      }
      if (state === 'recoverable-failure') {
        return (
          <>
            <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => goStep('preview')}>
              Back to preview
            </Button>
            <Button variant="primary" iconLeft={<RotateCcw />} onClick={() => goStep('processing')}>
              Retry
            </Button>
          </>
        );
      }
      return (
        <>
          <span />
          <Button variant="primary" iconRight={<ArrowRight />} onClick={() => goStep('results')}>
            View results
          </Button>
        </>
      );
    }

    if (currentStep === 'results') {
      return (
        <>
          <Button variant="secondary" iconLeft={<RotateCcw />} onClick={() => goStep('method')}>
            Start another
          </Button>
          <div className="crm-wizard__footer-actions">
            <Button variant="secondary" onClick={() => navigate(scopedHref(`/contacts/imports/jobs/${NEW_JOB_ID}`))}>
              Open import job
            </Button>
            <Button variant="primary" onClick={() => navigate(scopedHref('/contacts/all', { source: 'Walk-in register' }))}>
              View imported contacts
            </Button>
          </div>
        </>
      );
    }

    const isPreview = currentStep === 'preview';
    return (
      <>
        {index > 0 ? (
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={goPrev}>
            Back
          </Button>
        ) : (
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          iconLeft={isPreview ? <Upload /> : undefined}
          iconRight={isPreview ? undefined : <ArrowRight />}
          disabled={continueDisabled}
          onClick={() => (isPreview ? goStep('processing') : goNext())}
        >
          {isPreview ? 'Start import' : 'Continue'}
        </Button>
      </>
    );
  }
}
