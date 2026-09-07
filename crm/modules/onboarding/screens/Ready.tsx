import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CircleCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSession } from '@crm/app/app-session';
import { PageHeader } from '@crm/components';
import { Badge, Button, EmptyState } from '@crm/design-system';
import {
  findOnboardingNumber,
  firstIncompleteNumber,
  onboardingNumbers,
  readinessForNumber,
  type OnboardingNumberRecord,
  type ReadinessDimension,
  type ReadinessIssue,
  type ReadinessState,
} from '@crm/mock-data';
import { HistoryCard } from '../components/HistoryCard';
import { ReadinessDimensionRow } from '../components/ReadinessDimensionRow';
import { RolloutCard } from '../components/RolloutCard';

const DIMENSION_COPY: Record<ReadinessDimension, { label: string; description: string }> = {
  connection: { label: 'Connection', description: 'This WhatsApp number is technically connected to Meta.' },
  inbox: { label: 'Inbox', description: 'Someone on your team is assigned to see and reply from this number.' },
  outbound: { label: 'Outbound messaging', description: 'You can send template and paid messages to customers.' },
  billing: { label: 'Billing', description: 'Your CRM plan is active and the last payment went through.' },
  history: { label: 'History', description: 'Optional — past conversations can be brought in any time.' },
};

const FALLBACK_ISSUE: Record<Exclude<ReadinessDimension, 'history'>, ReadinessIssue> = {
  connection: {
    dimension: 'connection',
    reason: 'This number still has an unresolved connection issue.',
    fixLabel: 'Resume connection',
    fixTo: '/setup/connect?stage=meta&step=progress',
    who: 'support',
  },
  inbox: {
    dimension: 'inbox',
    reason: 'No one has been assigned to handle this number yet.',
    fixLabel: 'Assign team',
    fixTo: '/setup/connect?stage=activate&step=team',
    who: 'you',
  },
  outbound: {
    dimension: 'outbound',
    reason: 'Outbound messaging is not funded yet.',
    fixLabel: 'Add messaging balance',
    fixTo: '/billing?tab=messaging-balance',
    who: 'you',
  },
  billing: {
    dimension: 'billing',
    reason: 'Plan activation has not completed yet.',
    fixLabel: 'Review billing',
    fixTo: '/setup/connect?stage=activate&step=payment',
    who: 'you',
  },
};

/** Demo-only state overrides so `?state=` can show a dimension combination without a matching fixture. */
const STATE_OVERRIDES: Record<string, Partial<Record<ReadinessDimension, ReadinessState>>> = {
  'inbox-ready-outbound-needs-setup': { inbox: 'ready', outbound: 'needs_attention' },
  'connection-attention': { connection: 'needs_attention', inbox: 'not_applicable', outbound: 'not_applicable' },
};

function resolveRecord(numberParam: string | null): OnboardingNumberRecord | undefined {
  if (numberParam) return findOnboardingNumber(numberParam);
  return firstIncompleteNumber() ?? findOnboardingNumber('wa_kolkata_ready');
}

/**
 * ONB-S03 / C19 — Readiness & Go Live. Five independent dimensions, never one
 * binary "Ready" (SKILL.md "Readiness"). History is optional and never blocks
 * `Go to Inbox`; the first connected number is sufficient to finish onboarding.
 */
export default function Ready() {
  const navigate = useNavigate();
  const { setConnected } = useAppSession();
  const [searchParams] = useSearchParams();
  const numberParam = searchParams.get('number');
  const stateOverrideKey = searchParams.get('state');
  const cardParam = searchParams.get('card');

  const record = resolveRecord(numberParam);
  const [historyExpanded, setHistoryExpanded] = useState(cardParam === 'history');
  const rolloutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardParam === 'rollout') rolloutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [cardParam]);

  // Reaching the readiness screen means a number is connected — flip the
  // workspace out of the first-run zero state so the Dashboard shows live data.
  useEffect(() => {
    if (record) setConnected(true);
  }, [record, setConnected]);

  if (!record) {
    return (
      <div>
        <PageHeader title="Ready" description="Independent readiness dimensions and next actions." />
        <EmptyState
          title="No number is ready to review yet"
          description="Start or resume Guided Setup to connect your first WhatsApp number."
          actions={<Button variant="primary" onClick={() => navigate('/setup')}>Back to Setup Home</Button>}
        />
      </div>
    );
  }

  const baseReadiness = readinessForNumber(record);
  const overrides = stateOverrideKey ? STATE_OVERRIDES[stateOverrideKey] : undefined;
  const readiness = overrides ? { ...baseReadiness, ...overrides } : baseReadiness;

  const dimensions: ReadinessDimension[] = ['connection', 'inbox', 'outbound', 'billing', 'history'];
  const isFirstNumber = onboardingNumbers.filter((n) => n.tenantId === record.tenantId && n.status === 'live').length <= 1;

  const issueFor = (dimension: ReadinessDimension): ReadinessIssue | undefined => {
    const state = readiness[dimension];
    if (state !== 'needs_attention') return undefined;
    return readiness.issues.find((issue) => issue.dimension === dimension) ?? FALLBACK_ISSUE[dimension as Exclude<ReadinessDimension, 'history'>];
  };

  return (
    <div className="crm-ready">
      <PageHeader title="Ready" description="Independent readiness dimensions and next actions." />

      <div className="crm-ready__card">
        <div className="crm-ready__intro">
          <div>
            <span className="crm-ready__eyebrow">Stage 5 · Ready</span>
            <h2>{record.displayName}</h2>
            <p>
              {record.phone || 'Phone number pending'} — check each dimension below. History is optional and never
              blocks going live.
            </p>
          </div>
          <Badge tone={readiness.connection === 'ready' ? 'success' : 'warning'}>
            {readiness.connection === 'ready' ? 'Connected' : 'Needs attention'}
          </Badge>
        </div>

        <div className="crm-ready__dimensions">
          {dimensions.map((dimension) => (
            <ReadinessDimensionRow
              key={dimension}
              dimension={dimension}
              label={DIMENSION_COPY[dimension].label}
              description={DIMENSION_COPY[dimension].description}
              state={readiness[dimension]}
              issue={issueFor(dimension)}
            />
          ))}
        </div>

        {isFirstNumber ? (
          <p className="crm-ready__note">
            Your first WhatsApp number is enough to go live. You can add more numbers, fix optional items or bring in
            history any time from Settings.
          </p>
        ) : null}

        <div className="crm-ready__actions">
          <Button variant="primary" iconRight={<ArrowRight />} onClick={() => navigate('/inbox')}>
            Go to Inbox
          </Button>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
          <Button variant="ghost" onClick={() => navigate(`/settings/whatsapp/numbers/${record.id}`)}>
            Review settings
          </Button>
        </div>
      </div>

      <div className="crm-ready__optional-cards">
        <HistoryCard
          numberId={record.id}
          historyChoice={record.historyChoice}
          expanded={historyExpanded}
          onToggle={() => setHistoryExpanded((value) => !value)}
        />
        <div ref={rolloutRef}>
          <RolloutCard />
        </div>
      </div>

      <div className="crm-ready__secondary-actions">
        <span className="crm-ready__note">
          <CircleCheck aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Onboarding for this number is complete.
        </span>
        <Button variant="secondary" size="sm" onClick={() => navigate('/settings/whatsapp/add-number')}>
          Add another number
        </Button>
      </div>
    </div>
  );
}
