import { useSearchParams } from 'react-router-dom';
import { Button } from '@crm/design-system';

const steps = [
  {
    title: 'Needs attention',
    body: 'Everything that needs action today lives here first — unassigned chats, overdue follow-ups, delayed orders and account issues. Each card drills into the exact records behind it.',
  },
  {
    title: 'Filters & saved views',
    body: 'Narrow the whole Dashboard by date, team or comparison period, or jump straight to a published view like Sales or Support.',
  },
  {
    title: 'Drill-down everywhere',
    body: 'Any metric, row or card you can click takes you to the exact filtered records behind it — nothing here is just a static number.',
  },
  {
    title: 'Quick actions',
    body: 'Start a chat, add a contact, launch a campaign or invite a teammate without leaving the Dashboard — each hands off straight to the right module.',
  },
];

/** DASH-S16 — Guided Tour. Coach-mark walkthrough for first login or Help. */
export function GuidedTour() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get('tour') === '1';
  const step = Math.min(Math.max(Number(searchParams.get('step') ?? '1'), 1), steps.length);

  if (!active) return null;

  const goToStep = (next: number) =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('tour', '1');
      params.set('step', String(next));
      return params;
    });

  const finish = () =>
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete('tour');
      params.delete('step');
      return params;
    });

  const current = steps[step - 1];
  const isLast = step === steps.length;

  return (
    <div className="crm-guided-tour">
      <div className="crm-guided-tour__scrim" />
      <div className="crm-guided-tour__card" role="dialog" aria-modal="true" aria-label="Guided tour">
        <p className="crm-guided-tour__step">
          Step {step} of {steps.length}
        </p>
        <h2 className="crm-guided-tour__title">{current.title}</h2>
        <p className="crm-guided-tour__body">{current.body}</p>
        <div className="crm-guided-tour__actions">
          <Button variant="ghost" size="sm" onClick={finish}>
            Skip
          </Button>
          <span className="crm-guided-tour__spacer" />
          {step > 1 ? (
            <Button variant="secondary" size="sm" onClick={() => goToStep(step - 1)}>
              Back
            </Button>
          ) : null}
          <Button variant="primary" size="sm" onClick={() => (isLast ? finish() : goToStep(step + 1))}>
            {isLast ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
