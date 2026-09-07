import {
  ArrowRight, BadgeCheck, Bot, Boxes, Building2, CalendarHeart, Check, CheckCheck,
  Contact, Filter, IndianRupee, Layers, Lock,
  MessagesSquare, Megaphone, PhoneCall, Repeat, Route, ShieldCheck, ShoppingBag, Sparkles,
  Users, Workflow, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { HeroShader } from './HeroShader';
import { LandingNav } from './LandingNav';
import { JourneyLoop } from './JourneyLoop';
import { HeroScene } from './HeroScene';
import './landing.css';

const modules: { icon: LucideIcon; title: string; blurb: string }[] = [
  { icon: BadgeCheck, title: 'Onboarding', blurb: 'Guided Embedded Signup — keep your number (coexistence), migrate, or start new. Up to 25 numbers across branches.' },
  { icon: Contact, title: 'Contacts & Customer 360', blurb: 'Import from registers, business cards, Tally, Excel & Google. Deduplicate, enrich, and see one lifetime timeline.' },
  { icon: MessagesSquare, title: 'Shared Inbox', blurb: 'Every number’s chats in one place — ownership, collision-prevention, notes, quick replies and 24-hour window guidance.' },
  { icon: PhoneCall, title: 'Calling', blurb: 'Central call desk, prioritised queues, B2B “Kundli” intel, field visits, recordings, transcripts and outcomes.' },
  { icon: Megaphone, title: 'Templates & Campaigns', blurb: 'Guided template builder with Meta approval, then segmented broadcasts, a festival calendar and recipient-level results.' },
  { icon: Workflow, title: 'Flow & Automation', blurb: 'Visual builder — triggers, conditions, delays, human handover — and capture replies straight into CRM fields.' },
  { icon: ShoppingBag, title: 'Catalogue & Orders', blurb: 'Share catalogue on WhatsApp, build carts, collect payments, track orders and recover abandoned ones.' },
  { icon: Users, title: 'Team & Access', blurb: 'Roles, routing, workload balancing, shifts, Marketing→Sales handover, and full audit history.' },
  { icon: Sparkles, title: 'AI Assistance', blurb: 'Summaries, reply help, intent detection, extracted data and suggested tasks — always with human approval.' },
];

const newJourney = ['Data / Imported', 'Reached', 'Connected', 'Engaged', 'Enquiry', 'Activated'];
const existingJourney = ['Campaign / Contact', 'Response', 'WhatsApp Enquiry', 'Follow-up', 'Order / Repeat', 'Retention'];

const inboxPoints: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: Route, t: 'No missed, no double replies', d: 'Assignment, routing and active-handling indicators stop two agents answering the same customer.' },
  { icon: CheckCheck, t: '24-hour window, handled', d: 'See the service-window status and get nudged to approved templates when free-form replies aren’t allowed.' },
  { icon: Contact, t: 'Customer 360 beside every chat', d: 'Details, tags, owner, lead status, orders and history — update them without leaving the conversation.' },
];

const india: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: IndianRupee, t: 'GST & KYC ready', d: 'Capture GSTIN, legal name and billing/shipping on conversion — progressive profiling, not upfront forms.' },
  { icon: Boxes, t: 'Tally & business software', d: 'Import customer masters and sales history from Tally, TallyPrime and other software via direct or structured Excel/CSV.' },
  { icon: CalendarHeart, t: 'Festivals & events calendar', d: 'Plan campaigns and calls around festivals, launches and offers with a shared calendar.' },
  { icon: Building2, t: 'B2B & B2C, multi-branch', d: 'Flexible business units — offices, stores, branches, departments — with per-branch numbers and teams.' },
];

const secure: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: ShieldCheck, t: 'Official Meta Cloud API', d: 'No scraping, no employee-phone hacks — only authorised WhatsApp Business Platform APIs.' },
  { icon: Lock, t: 'Tenant isolation & audit', d: 'One isolated tenant per business, encrypted credentials, role-based access and a full audit trail.' },
  { icon: Bot, t: 'Human-in-the-loop AI', d: 'AI drafts, suggests and extracts — a person approves before anything is sent, saved or committed.' },
];

/**
 * Plans are priced on annual billing (the market norm — Interakt, AiSensy and
 * DoubleTick all quote annual). Monthly is ~20% higher. GST is extra, and Meta
 * conversation charges are passed through at actual with no markup, which is
 * the main commercial differentiator against the incumbents.
 */
const plans: {
  name: string; price: string; monthly: string; tagline: string;
  numbers: string; users: string; features: string[]; cta: string;
  href: string; tag?: string;
}[] = [
  {
    name: 'Starter',
    price: '₹1,299',
    monthly: '₹1,599 billed monthly',
    tagline: 'For a single shop, clinic or office moving off the WhatsApp Business app.',
    numbers: '1 WhatsApp number',
    users: '5 users',
    features: [
      'Shared inbox with ownership & collision prevention',
      'Contacts & Customer 360, import from Excel, cards, registers',
      'Guided template builder + Meta approval tracking',
      'Broadcast campaigns with recipient-level results',
      'Lead status & follow-up reminders',
      'Coexistence onboarding — keep your Business app',
    ],
    cta: 'Start free trial',
    href: '/signup',
  },
  {
    name: 'Growth',
    price: '₹2,999',
    monthly: '₹3,699 billed monthly',
    tagline: 'For teams running acquisition and repeat business at the same time.',
    numbers: '3 WhatsApp numbers',
    users: '15 users',
    features: [
      'Everything in Starter',
      'Flow & automation builder — included, not an add-on',
      'Calling desk: queues, outcomes, follow-ups, call history',
      'Two-journey lifecycle tracking (new vs existing customers)',
      'Campaign calendar, festival planning & performance analytics',
      'Role-based dashboards, routing & workload balancing',
    ],
    cta: 'Start free trial',
    href: '/signup',
    tag: 'Most popular',
  },
  {
    name: 'Business',
    price: '₹5,999',
    monthly: '₹7,399 billed monthly',
    tagline: 'For multi-branch businesses selling and collecting payment on WhatsApp.',
    numbers: '10 WhatsApp numbers',
    users: '40 users',
    features: [
      'Everything in Growth',
      'Catalogue, carts, orders & payment collection in chat',
      'AI assistance — summaries, reply drafts, intent & data extraction',
      'Tally / ERP / inventory sync and sales-history import',
      'Call recording, transcription & QA scoring',
      'Source attribution, ROI reporting, API & webhooks',
    ],
    cta: 'Start free trial',
    href: '/signup',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    monthly: 'Annual contract',
    tagline: 'For groups running many brands, branches and numbers under one roof.',
    numbers: 'Up to 25 numbers',
    users: 'Unlimited users',
    features: [
      'Everything in Business',
      'Business units for brands, branches & departments',
      'AI receptionist, bulk calling & field-visit planning',
      'SSO, granular audit trail & data-export controls',
      'Dedicated success manager and onboarding assistance',
      'Uptime SLA and priority support',
    ],
    cta: 'Talk to us',
    href: '/signup',
  },
];

const pricingNotes: string[] = [
  'WhatsApp conversation charges are billed by Meta at actual — we add zero markup.',
  'Service replies inside the 24-hour window stay free and unlimited.',
  'Extra users ₹149/user/month · extra numbers ₹499/month · AI credits from ₹999.',
  'All prices exclude 18% GST. 7-day free trial, no credit card.',
];

const steps: { n: string; icon: LucideIcon; t: string; d: string }[] = [
  { n: '01', icon: Zap, t: 'Connect your number', d: 'Log in with Embedded Signup and choose coexistence, migration or a new number — no technical setup.' },
  { n: '02', icon: Contact, t: 'Bring in your customers', d: 'Import from anywhere, auto-deduplicate, and build one clean Customer 360 database.' },
  { n: '03', icon: Megaphone, t: 'Engage & automate', d: 'Reply from a shared inbox, run campaigns, and let flows qualify and follow up for you.' },
  { n: '04', icon: Repeat, t: 'Sell & retain', d: 'Share catalogue, take orders and payments, then grow repeat business with lifecycle tracking.' },
];

export default function LandingPage() {
  return (
    <div className="land">
      {/* ===== Nav ===== */}
      <LandingNav />

      {/* ===== Hero ===== */}
      <section className="land__hero">
        <HeroShader />
        <div className="land__hero-veil" />
        <div className="land__hero-in">
          <div className="land__hero-copy land__rise">
            <span className="land__eyebrow"><CheckCheck size={15} /> Official WhatsApp Business Platform</span>
            <h1 className="land__title">Turn every WhatsApp chat into a <span className="land__title-hl">customer</span>.</h1>
            <p className="land__sub">
              TalkTrack is the WhatsApp CRM for growing Indian businesses — acquire new customers and grow
              existing ones from one shared inbox, with contacts, calling, campaigns, catalogue, orders,
              automation and AI working together.
            </p>
            <div className="land__cta-row">
              <Link href="/signup" className="land__btn land__btn--gold land__btn--lg">
                Get started free <ArrowRight size={18} />
              </Link>
              <a href="#modules" className="land__btn land__btn--ghost land__btn--lg">Explore the platform</a>
            </div>
            <ul className="land__trust">
              <li><CheckCheck size={14} /> Keep your WhatsApp Business app</li>
              <li><CheckCheck size={14} /> B2B &amp; B2C</li>
              <li><CheckCheck size={14} /> GST &amp; Tally-ready</li>
            </ul>
          </div>

          <div className="land__hero-art land__rise land__rise--2" aria-hidden="true">
            <div className="land__hero-stage"><HeroScene /></div>
            <div className="land__mock">
              <div className="land__mock-bar">
                <span className="land__mock-dot" /><span className="land__mock-dot" /><span className="land__mock-dot" />
                <span className="land__mock-title">Shah Textiles · Delhi</span>
              </div>
              <div className="land__mock-body">
                <div className="land__bubble land__bubble--in">Do you have the festive cotton sets in bulk?</div>
                <div className="land__bubble land__bubble--out">Yes! 200 in stock — sharing the catalogue now 📎<span className="land__ticks"><CheckCheck size={13} /></span></div>
                <div className="land__order">
                  <span className="land__order-label">Order confirmed</span>
                  <span className="land__order-amt">₹2,40,000</span>
                  <span className="land__ticks land__ticks--gold"><CheckCheck size={14} /></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="land__badges">
          <span><ShieldCheck size={15} /> Meta Cloud API</span>
          <span><Building2 size={15} /> Multi-branch · up to 25 numbers</span>
          <span><IndianRupee size={15} /> GST &amp; Tally-ready</span>
          <span><Bot size={15} /> Human-approved AI</span>
        </div>
      </section>

      {/* ===== Pillars ===== */}
      <section className="land__pillars">
        <div className="land__band-in">
          <span className="land__kicker"><Sparkles size={14} /> One platform, four jobs</span>
          <h2 className="land__h2">Everything from first hello to repeat order</h2>
          <div className="land__pillar-grid">
            {[
              { icon: Filter, t: 'Acquire', d: 'Find, import and qualify new prospects across sources.' },
              { icon: MessagesSquare, t: 'Engage', d: 'Reply fast, run campaigns and automate the routine.' },
              { icon: ShoppingBag, t: 'Sell', d: 'Share catalogue, take orders and collect payments in chat.' },
              { icon: Repeat, t: 'Retain', d: 'Track lifecycle, reactivate dormant customers, grow repeat business.' },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <article key={p.t} className="land__pillar">
                  <span className="land__pillar-ic"><Icon size={20} /></span>
                  <h3>{p.t}</h3><p>{p.d}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Modules ===== */}
      <section id="modules" className="land__band">
        <div className="land__band-in">
          <span className="land__kicker"><Layers size={14} /> The complete platform</span>
          <h2 className="land__h2">Nine modules. One customer record.</h2>
          <div className="land__grid land__grid--modules">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <article key={m.title} className="land__card">
                  <span className="land__card-ic"><Icon size={20} /></span>
                  <h3>{m.title}</h3>
                  <p>{m.blurb}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Lifecycle (signature) ===== */}
      <section id="lifecycle" className="land__life">
        <div className="land__life-in">
          <div className="land__life-copy">
            <span className="land__kicker"><Repeat size={14} /> New &amp; existing, tracked separately</span>
            <h2 className="land__h2">Two journeys, one customer record</h2>
            <p className="land__lead">Acquisition and repeat business are tracked as two separate journeys —
              so your existing customers never get pushed back through the lead pipeline.</p>
            <div className="land__journey">
              <div className="land__journey-row">
                <span className="land__journey-tag land__journey-tag--new">New customer</span>
                <div className="land__flow">
                  {newJourney.map((s, i) => (
                    <span key={s} className="land__flow-step">{s}{i < newJourney.length - 1 && <i>›</i>}</span>
                  ))}
                </div>
              </div>
              <div className="land__journey-row">
                <span className="land__journey-tag land__journey-tag--exist">Existing customer</span>
                <div className="land__flow">
                  {existingJourney.map((s, i) => (
                    <span key={s} className="land__flow-step">{s}{i < existingJourney.length - 1 && <i>›</i>}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="land__life-art">
            <JourneyLoop />
          </div>
        </div>
      </section>

      {/* ===== Inbox deep-dive ===== */}
      <section className="land__feature">
        <div className="land__feature-in">
          <div className="land__feature-media" aria-hidden="true">
            <div className="land__chat">
              <div className="land__chat-head">
                <span className="land__chat-av">RA</span>
                <div><strong>Ravi Agarwal</strong><small>+91 98765 43210 · Wholesale</small></div>
                <span className="land__chat-win">23h left</span>
              </div>
              <div className="land__chat-body">
                <div className="land__cb land__cb--in">Need the new bridal collection catalogue</div>
                <div className="land__cb land__cb--note">Note · Vivek: high-value, sent Q3 quote ₹4.2L</div>
                <div className="land__cb land__cb--out">Sharing it now — 3 new sets added this week ✨</div>
                <div className="land__cb land__cb--in">Perfect. Reserve 2 of the kundan sets.</div>
              </div>
              <div className="land__chat-foot"><span>⚡ Quick reply</span><span>📎 Catalogue</span><span>🤝 Assign</span></div>
            </div>
          </div>
          <div className="land__feature-copy">
            <span className="land__kicker"><MessagesSquare size={14} /> Shared team inbox</span>
            <h2 className="land__h2">Every conversation, owned and answered</h2>
            <ul className="land__ul">
              {inboxPoints.map((p) => {
                const Icon = p.icon;
                return (
                  <li key={p.t}><span className="land__ul-ic"><Icon size={18} /></span>
                    <div><strong>{p.t}</strong><p>{p.d}</p></div></li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== For India ===== */}
      <section id="india" className="land__band land__band--tint">
        <div className="land__band-in">
          <span className="land__kicker"><IndianRupee size={14} /> Made for Indian business</span>
          <h2 className="land__h2">Built for how India actually sells</h2>
          <div className="land__grid land__grid--2x2">
            {india.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.t} className="land__card land__card--row">
                  <span className="land__card-ic"><Icon size={20} /></span>
                  <div><h3>{f.t}</h3><p>{f.d}</p></div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Onboarding options ===== */}
      <section className="land__band">
        <div className="land__band-in">
          <span className="land__kicker"><BadgeCheck size={14} /> Connect your way</span>
          <h2 className="land__h2">Three ways to bring your number on board</h2>
          <div className="land__opts">
            {[
              { t: 'Keep your Business app', d: 'Coexistence — your number keeps working in the WhatsApp Business app and in TalkTrack together.', tag: 'Recommended' },
              { t: 'Migrate fully to CRM', d: 'Move an existing WhatsApp Business number entirely onto the Cloud API and run everything from TalkTrack.', tag: '' },
              { t: 'Start a new number', d: 'Register a fresh number for a pilot, branch, brand or department — with a clean transition plan.', tag: '' },
            ].map((o) => (
              <article key={o.t} className={`land__opt${o.tag ? ' land__opt--hl' : ''}`}>
                {o.tag && <span className="land__opt-tag">{o.tag}</span>}
                <h3>{o.t}</h3><p>{o.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Secure / official ===== */}
      <section className="land__secure">
        <div className="land__band-in">
          <span className="land__kicker"><ShieldCheck size={14} /> Official &amp; secure by design</span>
          <h2 className="land__h2">Safe for your customers and your account</h2>
          <div className="land__grid">
            {secure.map((s) => {
              const Icon = s.icon;
              return (
                <article key={s.t} className="land__card land__card--dark">
                  <span className="land__card-ic land__card-ic--gold"><Icon size={20} /></span>
                  <h3>{s.t}</h3><p>{s.d}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="land__band">
        <div className="land__band-in">
          <span className="land__kicker"><Route size={14} /> Live in an afternoon</span>
          <h2 className="land__h2">From sign-up to selling in four steps</h2>
          <ol className="land__steps">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.n} className="land__step">
                  <span className="land__step-n">{s.n}</span>
                  <span className="land__step-ic"><Icon size={22} /></span>
                  <h3>{s.t}</h3><p>{s.d}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section id="pricing" className="land__band land__band--tint">
        <div className="land__band-in">
          <span className="land__kicker"><IndianRupee size={14} /> Simple, honest pricing</span>
          <h2 className="land__h2">Pay for the platform, not for surprises</h2>
          <p className="land__lead land__lead--dark">
            Automation, analytics and calling are included in the plan — not sold back to you as
            add-ons. Meta&rsquo;s conversation charges are passed through at cost.
          </p>

          <div className="land__plans">
            {plans.map((p) => (
              <article key={p.name} className={`land__plan${p.tag ? ' land__plan--hl' : ''}`}>
                {p.tag && <span className="land__plan-tag">{p.tag}</span>}
                <h3 className="land__plan-name">{p.name}</h3>
                <p className="land__plan-tagline">{p.tagline}</p>
                <div className="land__plan-price">
                  <strong>{p.price}</strong>
                  {p.price !== 'Custom' && <span>/month</span>}
                </div>
                <p className="land__plan-billing">{p.monthly}</p>
                <div className="land__plan-limits">
                  <span><Building2 size={14} /> {p.numbers}</span>
                  <span><Users size={14} /> {p.users}</span>
                </div>
                <ul className="land__plan-feats">
                  {p.features.map((f) => (
                    <li key={f}><Check size={15} /><span>{f}</span></li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`land__btn land__btn--sm land__plan-cta${p.tag ? ' land__btn--gold' : ' land__btn--outline'}`}
                >
                  {p.cta}
                </Link>
              </article>
            ))}
          </div>

          <ul className="land__plan-notes">
            {pricingNotes.map((n) => (
              <li key={n}><CheckCheck size={14} />{n}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="land__final">
        <img src="/gen/mesh.jpg" alt="" className="land__final-bg" aria-hidden="true" />
        <div className="land__final-in">
          <h2 className="land__final-title">Your next customer is already on WhatsApp.</h2>
          <p className="land__final-sub">Connect your number and build the whole relationship — new to repeat — in one place.</p>
          <div className="land__cta-row land__cta-row--center">
            <Link href="/signup" className="land__btn land__btn--gold land__btn--lg">Get started free <ArrowRight size={18} /></Link>
            <Link href="/login" className="land__btn land__btn--glass land__btn--lg">Log in</Link>
          </div>
          <p className="land__trust-line">7-day free trial · no credit card · keep your WhatsApp Business app</p>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="land__foot">
        <div className="land__foot-in">
          <div className="land__foot-brand">
            <span className="land__logo land__logo--sm">TT</span>
            <div>
              <strong className="land__word land__word--dark">TalkTrack</strong>
              <p className="land__foot-tag">The WhatsApp CRM for growing Indian businesses.</p>
            </div>
          </div>
          <div className="land__foot-cols">
            <div><h4>Platform</h4><a href="#modules">Modules</a><a href="#lifecycle">Customer journey</a><a href="#pricing">Pricing</a><a href="#how">How it works</a></div>
            <div><h4>Get started</h4><Link href="/signup">Create account</Link><Link href="/login">Log in</Link><a href="#india">Built for India</a></div>
            <div><h4>Legal</h4><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
          </div>
        </div>
        <div className="land__foot-base">
          <span>An initiative by <strong>BrillBrains Consultants Pvt. Ltd.</strong></span>
          <span>Powered by the official WhatsApp Business Platform.</span>
        </div>
      </footer>
    </div>
  );
}
