import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  Megaphone,
  MessageSquare,
  PlugZap,
  ShoppingBag,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { Badge, Button } from '@crm/design-system';
import { useDashboardHref } from '../dashboard-links';

// Launch the already-built guided onboarding. "Connect" jumps straight into the
// wizard's first step (business + number); "See how it works" opens the setup
// overview. The wizard runs through to Ready → Dashboard.
const CONNECT_TO = '/setup/connect?stage=number&step=basics';
const SETUP_HOME = '/setup';

interface SetupStep {
  label: string;
  hint: string;
  done: boolean;
}

interface Feature {
  icon: LucideIcon;
  title: string;
  blurb: string;
  to: string;
}

const features: Feature[] = [
  { icon: MessageSquare, title: 'Shared team inbox', blurb: 'Every WhatsApp chat in one place, with clear ownership and fast replies.', to: '/inbox' },
  { icon: Megaphone, title: 'Bulk campaigns', blurb: 'Send targeted broadcasts and re-engage leads and customers.', to: '/campaigns' },
  { icon: Bot, title: 'Automated replies', blurb: 'Answer common questions instantly, with human handover when needed.', to: '/automation' },
  { icon: ShoppingBag, title: 'Catalogue & orders', blurb: 'Share products, take orders and collect payments on WhatsApp.', to: '/catalogue-orders' },
  { icon: Users, title: 'Contacts & leads', blurb: 'One clean, searchable customer database with segments and consent.', to: '/contacts' },
  { icon: Sparkles, title: 'AI agents', blurb: 'Let an AI assistant draft replies and surface what needs attention.', to: '/ai-agents' },
];

/**
 * Dashboard zero state — shown when the user is logged in but has not yet
 * connected a WhatsApp number. It replaces the operational dashboard with a
 * focused "get connected" landing: a single primary action, the setup steps,
 * and a preview of what unlocks once a number is connected.
 */
export default function DashboardZeroState({ firstName }: { firstName: string }) {
  const navigate = useNavigate();
  const dashHref = useDashboardHref();

  const steps: SetupStep[] = [
    { label: 'Connect a WhatsApp number', hint: 'Link your WhatsApp Business number to go live.', done: false },
    { label: 'Verify your business with Meta', hint: 'Unlock higher messaging limits and the green tick.', done: false },
    { label: 'Add your team', hint: 'Invite agents and set who can see what.', done: false },
    { label: 'Create your first template', hint: 'Save an approved message you can reuse.', done: false },
    { label: 'Send a test message', hint: 'Make sure everything works end to end.', done: false },
  ];

  return (
    <div className="crm-zero">
      <PageHeader
        title="Get started"
        actions={
          <Button variant="primary" iconLeft={<PlugZap />} onClick={() => navigate(dashHref(CONNECT_TO))}>
            Connect your number
          </Button>
        }
      />

      {/* Hero */}
      <section className="crm-zero__hero">
        <span className="crm-zero__tile" aria-hidden="true">TT</span>
        <div className="crm-zero__hero-text">
          <Badge tone="warning">Not connected</Badge>
          <h2 className="crm-zero__headline">Welcome to TalkTrack, {firstName}</h2>
          <p className="crm-zero__sub">
            Connect a WhatsApp Business number to start receiving customer messages, running
            campaigns and automating replies — all from one place.
          </p>
          <div className="crm-zero__hero-actions">
            <Button variant="primary" size="lg" iconLeft={<PlugZap />} onClick={() => navigate(dashHref(CONNECT_TO))}>
              Connect your number
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate(dashHref(SETUP_HOME))}>
              See how it works
            </Button>
          </div>
          <span className="crm-zero__eta">
            <Clock aria-hidden="true" /> Takes about 5 minutes
          </span>
        </div>
      </section>

      {/* Setup steps */}
      <section className="crm-zero__steps">
        <h3 className="crm-zero__section-title">A few steps to go live</h3>
        <ol className="crm-zero__step-list">
          {steps.map((step, index) => (
            <li key={step.label} className={`crm-zero__step${index === 0 ? ' crm-zero__step--active' : ''}`}>
              <span className="crm-zero__step-icon" aria-hidden="true">
                {step.done ? <CheckCircle2 /> : index === 0 ? <span className="crm-zero__step-num">1</span> : <Circle />}
              </span>
              <span className="crm-zero__step-body">
                <span className="crm-zero__step-label">{step.label}</span>
                <span className="crm-zero__step-hint">{step.hint}</span>
              </span>
              {index === 0 ? (
                <Button variant="primary" size="sm" iconRight={<ArrowRight />} onClick={() => navigate(dashHref(CONNECT_TO))}>
                  Start
                </Button>
              ) : (
                <span className="crm-zero__step-locked">Locked</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Feature preview */}
      <section className="crm-zero__features">
        <h3 className="crm-zero__section-title">What you’ll be able to do</h3>
        <div className="crm-zero__feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.title} to={dashHref(feature.to)} className="crm-zero__feature">
                <span className="crm-zero__feature-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="crm-zero__feature-title">
                  {feature.title}
                  <ArrowUpRight className="crm-zero__feature-arrow" aria-hidden="true" />
                </span>
                <span className="crm-zero__feature-blurb">{feature.blurb}</span>
              </Link>
            );
          })}
        </div>
        <div className="crm-zero__unlock">
          <span>Connect your number to unlock these.</span>
          <Button variant="primary" iconLeft={<PlugZap />} onClick={() => navigate(dashHref(CONNECT_TO))}>
            Connect your number
          </Button>
        </div>
      </section>
    </div>
  );
}
