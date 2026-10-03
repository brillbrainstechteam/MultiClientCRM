import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Upload } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button, WizardShell } from '@crm/design-system';
import type { ImportMethod } from '@crm/mock-data';
import { MethodStep } from './steps';
import { MapFields, Preview, Processing, Results, SourcePick, Validate } from './wizard-steps';
import { mappedRows, resetJob, useImportJob, validateRows } from './import-job-store';
import {
  sequenceFor,
  stepFromPath,
  stepLabels,
  stepPaths,
  type StepId,
} from './import-flow';

const SCOPE_KEYS = ['role', 'branchId', 'whatsappNumberId'] as const;

/** Methods whose real home is the Imports hub, not this wizard. */
const HUB_METHODS: ImportMethod[] = ['google', 'sheets', 'intelligent'];

/**
 * The one Import Wizard container. Rendered for every `/contacts/imports/new/*`
 * step; it derives the current step from the URL and sequences steps by method.
 *
 * The run itself (file, rows, mapping, result) lives in import-job-store rather
 * than component state, because each step is a separate route and this
 * component remounts on every navigation.
 */
export function ImportWizard() {
  const location = useLocation();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const job = useImportJob();

  const urlMethod = (searchParams.get('method') as ImportMethod | null) ?? null;

  // The hub links straight into the wizard with ?method=…; starting a different
  // method must clear whatever the previous run loaded.
  useEffect(() => {
    if (urlMethod && urlMethod !== job.method) resetJob(urlMethod);
  }, [urlMethod, job.method]);

  const method = job.method ?? urlMethod;
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

  /** Navigate to a step, carrying scope + method. */
  const goStep = (id: StepId) => {
    const params = new URLSearchParams();
    for (const key of SCOPE_KEYS) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    if (method) params.set('method', method);
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

  /* ---- Continue rules, derived from the actual run -------------------- */
  const rows = job.rows.length ? mappedRows(job) : [];
  const mapped = new Set(Object.values(job.mapping).filter(Boolean));
  const hasRequiredMapping = mapped.has('name') && mapped.has('mobile');
  const issues = rows.length ? validateRows(rows) : null;

  const continueDisabled =
    (currentStep === 'method' && !method) ||
    (currentStep === 'source' && (!job.rows.length || (method ? HUB_METHODS.includes(method) : false))) ||
    ((currentStep === 'mapping' || currentStep === 'extraction') && !hasRequiredMapping) ||
    (currentStep === 'validation' && (!issues || issues.importable === 0)) ||
    (currentStep === 'preview' && job.busy);

  return (
    <WizardShell
      title="Import contacts"
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
        return <SourcePick job={job} />;
      case 'mapping':
      case 'extraction':
        return <MapFields job={job} />;
      case 'validation':
        return <Validate job={job} />;
      case 'preview':
        return <Preview job={job} />;
      case 'processing':
        return <Processing job={job} />;
      case 'results':
        return <Results job={job} />;
      default:
        return null;
    }
  }

  function renderFooter() {
    if (currentStep === 'processing') {
      if (job.error) {
        return (
          <>
            <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => goStep('preview')}>
              Back to preview
            </Button>
            <Button variant="primary" iconLeft={<RotateCcw />} onClick={() => goStep('preview')}>
              Try again
            </Button>
          </>
        );
      }
      return (
        <>
          <span />
          <Button variant="primary" iconRight={<ArrowRight />} disabled={job.busy || !job.result} onClick={() => goStep('results')}>
            {job.busy ? 'Importing…' : 'View results'}
          </Button>
        </>
      );
    }

    if (currentStep === 'results') {
      return (
        <>
          <Button
            variant="secondary"
            iconLeft={<RotateCcw />}
            onClick={() => { resetJob(null); goStep('method'); }}
          >
            Start another
          </Button>
          <div className="crm-wizard__footer-actions">
            <Button variant="secondary" onClick={() => navigate(scopedHref('/contacts/imports'))}>
              Import history
            </Button>
            <Button variant="primary" onClick={() => navigate(scopedHref('/contacts/all'))}>
              View contacts
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
          {isPreview ? `Import ${issues?.importable ?? 0} contact${issues?.importable === 1 ? '' : 's'}` : 'Continue'}
        </Button>
      </>
    );
  }
}
