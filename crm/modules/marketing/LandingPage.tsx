import {
  ArrowRight,
  Bot,
  Megaphone,
  MessageSquare,
  PlugZap,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button } from '@crm/design-system';

const features: { icon: LucideIcon; title: string; blurb: string }[] = [
  { icon: MessageSquare, title: 'Shared team inbox', blurb: 'Every WhatsApp chat in one place, with clear ownership and fast replies.' },
  { icon: Megaphone, title: 'Bulk campaigns', blurb: 'Send targeted broadcasts and re-engage leads and customers.' },
  { icon: Bot, title: 'Automated replies', blurb: 'Answer common questions instantly, with human handover when needed.' },
  { icon: ShoppingBag, title: 'Catalogue & orders', blurb: 'Share products, take orders and collect payments — all on WhatsApp.' },
  { icon: Users, title: 'Contacts & leads', blurb: 'One clean, searchable customer database with segments and consent.' },
  { icon: Sparkles, title: 'AI agents', blurb: 'Let an AI assistant draft replies and surface what needs attention.' },
];

const steps: { icon: LucideIcon; title: string; blurb: string }[] = [
  { icon: UserPlus, title: 'Create your account', blurb: 'Add your business details and sign up in minutes.' },
  { icon: PlugZap, title: 'Connect your WhatsApp number', blurb: 'Link your WhatsApp Business number through guided setup.' },
  { icon: MessageSquare, title: 'Start messaging & selling', blurb: 'Reply, run campaigns, automate and take orders from one place.' },
];

/**
 * Public marketing landing page (the site root). Explains what TalkTrack does
 * and routes new visitors to Sign up and returning users to Log in. Renders
 * outside AppShell — no authenticated chrome.
 */
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="crm-land">
      {/* Nav */}
      <header className="crm-land__nav">
        <div className="crm-land__nav-inner">
          <Link to="/" className="crm-land__brand">
            <span className="crm-land__logo">TT</span>
            <span className="crm-land__wordmark">TalkTrack</span>
          </Link>
          <nav className="crm-land__nav-actions">
            <a href="#features" className="crm-land__nav-link">Features</a>
            <a href="#how" className="crm-land__nav-link">How it works</a>
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Log in
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
              Get started free
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="crm-land__hero">
        <Badge tone="success" icon={<ShieldCheck />}>Official WhatsApp Business API</Badge>
        <h1 className="crm-land__title">Run your sales and support on WhatsApp</h1>
        <p className="crm-land__subtitle">
          TalkTrack is the WhatsApp CRM for growing Indian businesses — a shared inbox, campaigns,
          automations, catalogue and orders, all in one place.
        </p>
        <div className="crm-land__hero-actions">
          <Button variant="primary" size="lg" iconRight={<ArrowRight />} onClick={() => navigate('/signup')}>
            Get started free
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
            Log in
          </Button>
        </div>
        <span className="crm-land__hero-note">7-day free trial · no credit card required</span>
      </section>

      {/* Features */}
      <section id="features" className="crm-land__section">
        <h2 className="crm-land__section-title">Everything you need to run on WhatsApp</h2>
        <div className="crm-land__feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="crm-land__feature">
                <span className="crm-land__feature-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="crm-land__feature-title">{feature.title}</span>
                <span className="crm-land__feature-blurb">{feature.blurb}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="crm-land__section crm-land__section--muted">
        <h2 className="crm-land__section-title">Live in three steps</h2>
        <div className="crm-land__steps">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="crm-land__step">
                <span className="crm-land__step-num">{index + 1}</span>
                <span className="crm-land__step-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="crm-land__step-title">{step.title}</span>
                <span className="crm-land__step-blurb">{step.blurb}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA band */}
      <section className="crm-land__cta">
        <h2 className="crm-land__cta-title">Ready to get started?</h2>
        <p className="crm-land__cta-sub">Set up your workspace and connect your number in minutes.</p>
        <Button variant="primary" size="lg" iconRight={<ArrowRight />} onClick={() => navigate('/signup')}>
          Get started free
        </Button>
      </section>

      {/* Footer */}
      <footer className="crm-land__footer">
        <div className="crm-land__footer-brand">
          <span className="crm-land__logo">TT</span>
          <span className="crm-land__wordmark">TalkTrack</span>
        </div>
        <div className="crm-land__footer-endorse">
          <span className="crm-land__footer-label">An initiative by</span>
          <span className="crm-land__footer-name">BrillBrains Consultants</span>
        </div>
      </footer>
    </div>
  );
}
