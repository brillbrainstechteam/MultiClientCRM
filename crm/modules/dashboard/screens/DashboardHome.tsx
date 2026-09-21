import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BarChart3, Check, CircleDashed, Contact, FileText, Gauge, Layers,
  LifeBuoy, Megaphone, MessageCircle, MessageSquare, PhoneCall, Play, Plus, Send,
  ShieldCheck, ShoppingBag, Signal, Tag, TrendingUp, Upload, UserPlus, Users, X,
} from 'lucide-react';
import '../DashboardHome.css';

type State = 'not_connected' | 'in_progress' | 'connected';
interface NumberHealth {
  id: string; name: string; phone: string; department: string | null;
  status: string; quality: 'high' | 'medium' | 'low' | 'unrated';
  tier: string | null; tierLabel: string | null; tierIndex: number;
  tierRungs: { key: string; label: string }[];
}
interface DashData {
  businessName: string; businessModel: string; state: State;
  numbers: number; attention: number; numbersList: NumberHealth[];
  contacts: number; prospects: number; customers: number;
  conversations: number; openConversations: number; messagesToday: number; teamCount: number;
  onboarding: { status: string; strategy: string | null; lastStep: string | null; errorMessage: string | null } | null;
  setup: { numberConnected: boolean; hasContacts: boolean; hasTeam: boolean };
}

const goOnboard = () => { window.location.href = '/onboarding'; };
const SUPPORT_EMAIL = 'support@brillbrainsconsultants.com';
const STRATEGY_LABEL: Record<string, string> = { existing: 'existing WhatsApp Business account', new: 'a new number', coexistence: 'coexistence' };

const EXPLORE = [
  { tone: 'green', icon: MessageSquare, title: 'Manage conversations', desc: 'Reply, assign and track customer chats.', to: '/inbox' },
  { tone: 'blue', icon: Send, title: 'Run campaigns', desc: 'Send offers, updates and reminders at scale.', to: '/campaigns' },
  { tone: 'purple', icon: Tag, title: 'Share your catalogue', desc: 'Show products, take orders and grow sales.', to: '/catalogue-orders/inventory' },
  { tone: 'peach', icon: BarChart3, title: 'Track performance', desc: 'See what’s working with simple analytics.', to: '/reports' },
];

export default function DashboardHome() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/crm/dashboard', { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => { setData(d.error ? null : d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="dh"><p className="dh__muted">Loading your workspace…</p></div>;
  if (!data) return <div className="dh"><p className="dh__muted">Couldn’t load the dashboard. Please refresh.</p></div>;

  return (
    <div className="dh">
      {data.state === 'connected'
        ? <Connected data={data} nav={navigate} />
        : <Launchpad data={data} nav={navigate} />}
    </div>
  );
}

/* ---------------- Not-connected + In-progress (the launchpad) ---------------- */
function Launchpad({ data, nav }: { data: DashData; nav: (to: string) => void }) {
  const inProgress = data.state === 'in_progress';
  const s = data.onboarding;
  const [video, setVideo] = useState(false);

  const steps = [
    {
      icon: MessageCircle, title: 'Connect WhatsApp number',
      desc: 'Link your Business number to start using TalkTrack.',
      cta: inProgress ? 'Resume Setup' : 'Connect Now', onClick: goOnboard,
      done: data.setup.numberConnected, primary: true,
    },
    {
      icon: Upload, title: 'Import your customers',
      desc: 'Bring in your contacts from Excel, Google Contacts or other sources.',
      cta: 'Import Contacts', onClick: () => nav('/contacts'),
      done: data.setup.hasContacts, primary: false,
    },
    {
      icon: FileText, title: 'Create a message template',
      desc: 'Get approved templates so you can start messaging customers.',
      cta: 'Create Template', onClick: () => nav('/templates'),
      done: false, primary: false,
    },
    {
      icon: UserPlus, title: 'Invite your team',
      desc: 'Add team members and manage access.',
      cta: 'Invite Team', onClick: () => nav('/team-access'),
      done: data.setup.hasTeam, primary: false,
    },
  ];
  const completed = steps.filter((x) => x.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="lp">
      {/* ---- Hero ---- */}
      <section className="lp-hero">
        <div className="lp-hero__text">
          <span className="lp-eyebrow">
            {inProgress ? <><CircleDashed size={15} /> Connection in progress</> : <>Welcome to TalkTrack <span aria-hidden>👋</span></>}
          </span>
          <h1 className="lp-title">
            {inProgress ? <>You’re almost <span className="lp-title__hl">connected</span></> : <>Set up your <span className="lp-title__hl">WhatsApp CRM</span> in minutes</>}
          </h1>
          <p className="lp-sub">
            {inProgress
              ? <>You started connecting via <strong>{STRATEGY_LABEL[s?.strategy ?? ''] ?? 'WhatsApp'}</strong>. Pick up right where you left off — nothing is lost.</>
              : <>Connect your WhatsApp Business number and start managing your customers, campaigns and sales — all in one place.</>}
          </p>
          <div className="lp-cta">
            <button className="lp-btn lp-btn--primary" onClick={goOnboard}>
              <MessageCircle size={18} />{inProgress ? 'Resume Connecting' : 'Connect WhatsApp Number'}<ArrowRight size={16} />
            </button>
            <button className="lp-btn lp-btn--ghost" onClick={() => setVideo(true)}>
              <Play size={16} /> Watch How It Works
            </button>
          </div>
          {inProgress && s?.status === 'error' && s.errorMessage ? <p className="lp-err">{s.errorMessage}</p> : null}
          <ul className="lp-trust">
            {['No coding needed', 'Official WhatsApp API', 'Secure & reliable', 'Get started in 2 minutes'].map((t) => (
              <li key={t}><Check size={15} /> {t}</li>
            ))}
          </ul>
        </div>
        <HeroArt />
      </section>

      {/* ---- Setup checklist ---- */}
      <section className="lp-card">
        <div className="lp-card__head">
          <div>
            <h2 className="lp-h2">Your setup checklist</h2>
            <p className="lp-muted">Follow these simple steps to get started. You’re just a few clicks away!</p>
          </div>
          <div className="lp-progress">
            <span className="lp-progress__label">{completed} / {steps.length} completed</span>
            <div className="lp-progress__track"><i style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
        <ol className="lp-steps">
          {steps.map((st, i) => {
            const Icon = st.icon;
            const active = i === completed && !st.done; // first not-done step is the focus
            return (
              <li key={st.title} className={`lp-step${st.done ? ' lp-step--done' : ''}${active ? ' lp-step--active' : ''}`}>
                <span className="lp-step__badge">{st.done ? <Check size={16} /> : <Icon size={18} />}<em>{i + 1}</em></span>
                <strong className="lp-step__title">{st.title}</strong>
                <p className="lp-step__desc">{st.desc}</p>
                {st.done
                  ? <span className="lp-step__done"><Check size={14} /> Done</span>
                  : <button className={`lp-sbtn${st.primary ? ' lp-sbtn--primary' : ''}`} onClick={st.onClick}>{st.cta} <ArrowRight size={14} /></button>}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---- Explore ---- */}
      <section>
        <h2 className="lp-h2">Explore what you can do with TalkTrack</h2>
        <p className="lp-muted lp-muted--mb">Once connected, you’ll unlock the full power of WhatsApp for your business.</p>
        <div className="lp-explore">
          {EXPLORE.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.title} className={`lp-xt lp-xt--${t.tone}`} onClick={() => nav(t.to)}>
                <span className="lp-xt__ic"><Icon size={20} /></span>
                <strong className="lp-xt__title">{t.title}</strong>
                <p className="lp-xt__desc">{t.desc}</p>
                <span className="lp-xt__go"><ArrowRight size={16} /></span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- Help ---- */}
      <section className="lp-help">
        <div className="lp-help__l">
          <span className="lp-help__ic"><Play size={20} /></span>
          <div>
            <strong>Need help getting started?</strong>
            <p>Watch our 5-minute setup guide or speak to our team.</p>
          </div>
        </div>
        <div className="lp-help__actions">
          <button className="lp-btn lp-btn--ghost lp-btn--sm" onClick={() => setVideo(true)}><Play size={15} /> Watch Setup Video</button>
          <a className="lp-btn lp-btn--ghost lp-btn--sm" href={`mailto:${SUPPORT_EMAIL}?subject=TalkTrack%20setup%20help`}><LifeBuoy size={15} /> Contact Support</a>
        </div>
      </section>

      {video ? (
        <div className="lp-modal" role="dialog" aria-modal="true" onClick={() => setVideo(false)}>
          <div className="lp-modal__box" onClick={(e) => e.stopPropagation()}>
            <button className="lp-modal__x" aria-label="Close" onClick={() => setVideo(false)}><X size={18} /></button>
            <div className="lp-modal__video">
              <Play size={40} />
              <p>Setup walkthrough</p>
              <span>A short guide to connecting your number and sending your first message.</span>
            </div>
            <div className="lp-modal__foot">
              <button className="lp-btn lp-btn--primary" onClick={goOnboard}><MessageCircle size={17} /> Connect your number <ArrowRight size={15} /></button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* Friendly inline hero illustration (evokes the marketing art without raster assets). */
function HeroArt() {
  return (
    <div className="lp-hero__art" aria-hidden="true">
      <svg viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="168" cy="232" rx="120" ry="16" fill="#e8f4ee" />
        {/* phone */}
        <rect x="96" y="34" width="112" height="188" rx="20" fill="#0f5f47" />
        <rect x="104" y="42" width="96" height="172" rx="14" fill="#f4fbf7" />
        {/* chat bubbles */}
        <rect x="116" y="62" width="58" height="20" rx="10" fill="#d8efe4" />
        <rect x="132" y="90" width="56" height="20" rx="10" fill="#25a37a" />
        <rect x="116" y="118" width="46" height="20" rx="10" fill="#d8efe4" />
        {/* whatsapp mark */}
        <circle cx="176" cy="182" r="22" fill="#25D366" />
        <path d="M176 170a12 12 0 0 0-10.3 18.1L164 196l8.2-1.6A12 12 0 1 0 176 170Z" fill="#fff" />
        <path d="M170.5 175.5c.4-.9 1.6-.9 2 0l1 2.3c.2.5 0 1-.4 1.3l-1 .7c.9 1.7 2 2.8 3.7 3.7l.7-1c.3-.4.8-.6 1.3-.4l2.3 1c.9.4.9 1.6 0 2-1.9 1.5-4.3.9-6.6-.7-1.6-1.2-3-2.6-4.2-4.2-1.6-2.3-2.2-4.7-.5-6.7Z" fill="#25D366" />
        {/* growth arrow */}
        <path d="M232 150l18-30 14 16 20-40" stroke="#c9a227" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M284 96l-2 18-16-8Z" fill="#c9a227" />
        {/* sparkles */}
        <path d="M60 70l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#2ba58f" opacity=".8" />
        <circle cx="250" cy="60" r="5" fill="#e2c15a" />
        <circle cx="52" cy="150" r="4" fill="#25a37a" opacity=".7" />
        {/* badge blob */}
        <path d="M244 176c26-6 52 6 54 26s-20 34-46 34-44-14-42-32 8-22 34-28Z" fill="#d7f0e4" />
        <text x="271" y="205" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f5f47">All on</text>
        <text x="271" y="219" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f5f47">WhatsApp</text>
      </svg>
    </div>
  );
}

/* ---------------------------- Connected dashboard ---------------------------- */
const QUALITY_META: Record<string, { label: string; tone: string }> = {
  high: { label: 'High', tone: 'ok' },
  medium: { label: 'Medium', tone: 'warn' },
  low: { label: 'Low', tone: 'bad' },
  unrated: { label: 'Not rated yet', tone: 'idle' },
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Connected({ data, nav }: { data: DashData; nav: (to: string) => void }) {
  const kpis = [
    { icon: MessageSquare, label: 'Open conversations', val: data.openConversations, sub: `${data.messagesToday} message${data.messagesToday !== 1 ? 's' : ''} in today`, to: '/inbox' },
    { icon: Contact, label: 'Contacts & leads', val: data.contacts, sub: `${data.prospects} prospect${data.prospects !== 1 ? 's' : ''}`, to: '/contacts' },
    { icon: ShoppingBag, label: 'Customers', val: data.customers, sub: 'won from chat', to: '/contacts' },
    { icon: Users, label: 'Team', val: data.teamCount, sub: data.teamCount === 1 ? 'just you' : 'members', to: '/team-access' },
  ];
  const actions = [
    { icon: MessageSquare, label: 'Open inbox', to: '/inbox' },
    { icon: Plus, label: 'Add contact', to: '/contacts' },
    { icon: Layers, label: 'Templates', to: '/templates' },
    { icon: Megaphone, label: 'New campaign', to: '/campaigns' },
    { icon: PhoneCall, label: 'Manage numbers', to: '/settings/whatsapp' },
  ];

  return (
    <>
      {/* compact greeting bar — no giant hero */}
      <header className="dh-top">
        <div className="dh-top__l">
          <span className="dh-top__badge"><span className="dh-live__pulse" />Live</span>
          <h1 className="dh-top__title">{greeting()}</h1>
          <p className="dh-top__sub">Here’s what’s happening across {data.businessName} today.</p>
        </div>
        <button className="dh-btn dh-btn--gold" onClick={() => nav('/inbox')}><MessageSquare size={17} /> Open inbox <ArrowRight size={16} /></button>
      </header>

      {data.attention > 0 ? (
        <button className="dh-attention__item dh-attention__item--warn" onClick={() => nav('/settings/whatsapp')}>
          <ShieldCheck size={18} /><span><strong>{data.attention} number{data.attention !== 1 ? 's' : ''} need{data.attention === 1 ? 's' : ''} attention</strong> — quality dropped or reconnection required.</span><ArrowRight size={15} />
        </button>
      ) : null}

      {/* WhatsApp account overview — the meaningful part (quality + limit ladder) */}
      <section>
        <div className="dh-sec-head">
          <h2 className="dh-h2">WhatsApp account overview</h2>
          <button className="dh-link" onClick={() => nav('/settings/whatsapp')}>Manage numbers <ArrowUpRight size={14} /></button>
        </div>
        <div className={`dh-num-grid${data.numbersList.length === 1 ? ' dh-num-grid--single' : ''}`}>
          {data.numbersList.map((n) => {
            const q = QUALITY_META[n.quality] ?? QUALITY_META.unrated;
            return (
              <article key={n.id} className="dh-num" onClick={() => nav(`/settings/whatsapp/numbers/${n.id}`)}>
                <div className="dh-num__head">
                  <span className="dh-num__ava"><MessageSquare size={16} /></span>
                  <div className="dh-num__id">
                    <strong>{n.name}</strong>
                    <span>{n.phone}{n.department ? ` · ${n.department}` : ''}</span>
                  </div>
                  <span className={`dh-num__status dh-num__status--${n.status === 'active' ? 'ok' : 'warn'}`}>
                    <span className="dh-dot" />{n.status === 'active' ? 'Active' : 'Reconnect'}
                  </span>
                </div>
                <div className="dh-num__metrics">
                  <div className="dh-num__metric">
                    <span className="dh-num__mlabel"><Gauge size={13} /> Account quality</span>
                    <span className={`dh-num__quality dh-num__quality--${q.tone}`}><Signal size={14} />{q.label}</span>
                  </div>
                  <div className="dh-num__metric">
                    <span className="dh-num__mlabel"><TrendingUp size={13} /> Messaging limit</span>
                    {n.tierIndex >= 0 ? (
                      <div className="dh-ladder">
                        {n.tierRungs.map((r, i) => (
                          <span key={r.key} className={`dh-ladder__rung${i === n.tierIndex ? ' dh-ladder__rung--current' : ''}${i < n.tierIndex ? ' dh-ladder__rung--passed' : ''}`}>
                            {r.label}{i === n.tierIndex ? <em>Current</em> : null}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="dh-num__quality dh-num__quality--idle">Pending Meta sync</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Snapshot KPIs */}
      <section>
        <div className="dh-sec-head"><h2 className="dh-h2">Today at a glance</h2></div>
        <div className="dh-grid dh-grid--4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <button key={k.label} className="dh-tile dh-tile--live" onClick={() => nav(k.to)}>
                <span className="dh-tile__ic"><Icon size={18} /></span>
                <span className="dh-tile__val">{k.val}</span>
                <span className="dh-tile__label">{k.label}</span>
                <span className="dh-tile__sub">{k.sub}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <div className="dh-sec-head"><h2 className="dh-h2">Quick actions</h2></div>
        <div className="dh-actions">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.label} className="dh-action" onClick={() => nav(a.to)}>
                <span className="dh-action__ic"><Icon size={18} /></span>{a.label}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
