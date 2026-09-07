import { ArrowRight, CircleCheck, PlayCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { Badge, Banner, Button } from '@crm/design-system';
import {
  findOnboardingNumber,
  firstIncompleteNumber,
  onboardingSessions,
  type OnboardingNumberRecord,
  type OnboardingSession,
} from '@crm/mock-data';

type GroupStatus = 'complete' | 'current' | 'upcoming';

const GROUPS: { id: string; label: string; stages: string[] }[] = [
  { id: 'business', label: 'Business & Number', stages: ['number'] },
  { id: 'connection', label: 'Connection', stages: ['strategy', 'meta'] },
  { id: 'activate', label: 'Activate & Assign', stages: ['activate'] },
  { id: 'ready', label: 'Ready', stages: ['ready'] },
];

const STAGE_ORDER = ['number', 'strategy', 'meta', 'activate', 'ready'];

function groupStatuses(session: OnboardingSession | null): { id: string; label: string; status: GroupStatus }[] {
  if (!session) return GROUPS.map((group) => ({ id: group.id, label: group.label, status: 'upcoming' as const }));
  const currentIndex = STAGE_ORDER.indexOf(session.stage);
  return GROUPS.map((group) => {
    const groupIndex = Math.min(...group.stages.map((s) => STAGE_ORDER.indexOf(s)));
    const status: GroupStatus =
      groupIndex < currentIndex ? 'complete' : groupIndex === currentIndex ? 'current' : 'upcoming';
    return { id: group.id, label: group.label, status };
  });
}

const blockerCopy: Record<string, { title: string; description: string }> = {
  webhook_setup_issue: {
    title: 'A technical connection issue needs attention',
    description: 'The webhook that delivers messages to your Inbox failed to confirm. Support can usually fix this without you doing anything.',
  },
  payment_failed: {
    title: 'Your last plan payment failed',
    description: 'Retrying is safe — you will not be charged twice for the same period.',
  },
};

function continueTarget(record: OnboardingNumberRecord, session: OnboardingSession): string {
  const params = new URLSearchParams({ stage: session.stage, numberId: record.id });
  if (session.step) params.set('step', session.step);
  return `/setup/connect?${params.toString()}`;
}

/**
 * ONB-S01/C01 — Setup Home. Keeps it to: current number, completed stages,
 * blocker, next CTA, saved-progress (SKILL.md "Setup Home"). Resumes from the
 * first actionable incomplete step and never restarts the whole wizard.
 */
export default function SetupHome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forcedState = searchParams.get('state');
  const numberParam = searchParams.get('number');

  let record: OnboardingNumberRecord | undefined;
  let session: OnboardingSession | null = null;

  if (forcedState === 'first-use') {
    record = undefined;
    session = null;
  } else if (forcedState === 'resume') {
    record = findOnboardingNumber('wa_jaipur_pending');
    session = onboardingSessions.wa_jaipur_pending;
  } else if (forcedState === 'blocked') {
    record = findOnboardingNumber('wa_chennai_migrate');
    session = onboardingSessions.wa_chennai_migrate;
  } else if (numberParam) {
    record = findOnboardingNumber(numberParam);
    session = record ? (onboardingSessions[record.id] ?? null) : null;
  } else {
    record = firstIncompleteNumber();
    session = record ? (onboardingSessions[record.id] ?? null) : null;
  }

  const allDone = !record;
  const groups = groupStatuses(session);
  const blocker = session?.blocker ? blockerCopy[session.blocker] : undefined;

  return (
    <div className="crm-setup-home">
      <PageHeader
        title="Set up WhatsApp"
        description="Connect your first WhatsApp number so your team can start messaging customers from the CRM."
      />

      {allDone ? (
        <div className="crm-setup-home__card">
          <span className="crm-setup-home__status-icon crm-setup-home__status-icon--done" aria-hidden="true">
            <CircleCheck />
          </span>
          <h2>Your workspace is ready</h2>
          <p>Every WhatsApp number you've started is either live or does not need further setup right now.</p>
          <div className="crm-setup-home__actions">
            <Button variant="primary" iconRight={<ArrowRight />} onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
            <Button variant="secondary" onClick={() => navigate('/settings/whatsapp/add-number')}>
              Add another number
            </Button>
          </div>
        </div>
      ) : (
        <div className="crm-setup-home__card">
          <div className="crm-setup-home__intro">
            <div>
              <span className="crm-setup-home__eyebrow">
                {record ? `Setting up ${record.displayName}` : 'Start your first number'}
              </span>
              <h2>{record ? 'Continue where you left off' : "Let's connect your first WhatsApp number"}</h2>
              <p>
                {record
                  ? 'Your progress is saved automatically — pick up exactly where you left off.'
                  : 'Takes about 10 minutes. You can save and exit at any point.'}
              </p>
            </div>
            <Badge tone={record ? 'info' : 'neutral'}>
              {record ? (record.status === 'draft' ? 'Draft' : 'In progress') : 'Not started'}
            </Badge>
          </div>

          {blocker ? <Banner tone="warning" title={blocker.title} description={blocker.description} /> : null}

          <ol className="crm-setup-home__progress">
            {groups.map((group) => (
              <li key={group.id} className={`crm-setup-home__progress-item crm-setup-home__progress-item--${group.status}`}>
                <span className="crm-setup-home__progress-marker" aria-hidden="true">
                  {group.status === 'complete' ? <CircleCheck /> : null}
                </span>
                {group.label}
              </li>
            ))}
          </ol>

          <div className="crm-setup-home__actions">
            <Button
              variant="primary"
              iconLeft={<PlayCircle />}
              onClick={() =>
                navigate(
                  record && session
                    ? continueTarget(record, session)
                    : '/setup/connect?stage=number&step=basics',
                )
              }
            >
              {record ? 'Continue setup' : 'Start setup'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
