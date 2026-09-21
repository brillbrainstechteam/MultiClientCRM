import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Check, CircleDashed, Contact, Gauge, Layers, Megaphone,
  MessageSquare, PhoneCall, Plus, Radio, RotateCcw, ShieldCheck, ShoppingBag, Signal, Sparkles,
  TrendingUp, Users, Zap,
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
const STRATEGY_LABEL: Record<string, string> = { existing: 'existing WhatsApp Business account', new: 'a new number', coexistence: 'coexistence' };
const JOURNEY = [
  { icon: Radio, t: 'Connect', d: 'Link your WhatsApp number' },
  { icon: Contact, t: 'Import', d: 'Bring in your customers' },
  { icon: MessageSquare, t: 'Engage', d: 'Reply, campaign, automate' },
  { icon: ShoppingBag, t: 'Sell', d: 'Catalogue, orders, repeat' },
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
        : <Launchpad data={data} />}
    </div>
  );
}

/* ---------------- Not-connected + In-progress (the launchpad) ---------------- */
function Launchpad({ data }: { data: DashData }) {
  const inProgress = data.state === 'in_progress';
  const s = data.onboarding;
  const activeStep = inProgress ? 1 : 0;

  return (
    <>
      <section className={`dh-hero${inProgress ? ' dh-hero--progress' : ''}`}>
        <div className="dh-hero__glow" aria-hidden="true" />
        <div className="dh-hero__in">
          <span className="dh-hero__eyebrow">
            {inProgress ? <><CircleDashed size={14} /> Connection in progress</> : <><Sparkles size={14} /> Welcome to TalkTrack</>}
          </span>
          <h1 className="dh-hero__title">
            {inProgress ? 'You’re almost connected.' : 'Let’s get your WhatsApp working.'}
          </h1>
          <p className="dh-hero__sub">
            {inProgress
              ? <>You started connecting via <strong>{STRATEGY_LABEL[s?.strategy ?? ''] ?? 'WhatsApp'}</strong>{s?.lastStep ? <> · last step: {s.lastStep.replace(/_/g, ' ')}</> : ''}. Pick up where you left off — nothing is lost.</>
              : <>Connect your WhatsApp Business number to unlock the shared inbox, contacts, campaigns, catalogue and everything else. It takes a few minutes.</>}
          </p>
          <div className="dh-hero__cta">
            <button className="dh-btn dh-btn--gold" onClick={goOnboard}>
              {inProgress ? <><RotateCcw size={17} /> Resume connecting</> : <><Zap size={17} /> Connect your WhatsApp number</>}
              <ArrowRight size={16} />
            </button>
            {inProgress && s?.status === 'error' && s.errorMessage
              ? <span className="dh-hero__err">{s.errorMessage}</span> : null}
          </div>

          <ol className="dh-journey">
            {JOURNEY.map((j, i) => {
              const Icon = j.icon;
              const state = i < activeStep ? 'done' : i === activeStep ? 'current' : 'todo';
              return (
                <li key={j.t} className={`dh-journey__step dh-journey__step--${state}`}>
                  <span className="dh-journey__dot">{state === 'done' ? <Check size={13} /> : <Icon size={15} />}</span>
                  <span className="dh-journey__t">{j.t}</span>
                  <span className="dh-journey__d">{j.d}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="dh-setup">
        <h2 className="dh-h2">Your setup checklist</h2>
        <div className="dh-setup__grid">
          <SetupItem done={data.setup.numberConnected} primary title="Connect your WhatsApp number"
            desc="Keep your Business app (coexistence), migrate, or start a new number." onClick={goOnboard} cta={inProgress ? 'Resume' : 'Connect'} />
          <SetupItem done={data.setup.hasContacts} locked={!data.setup.numberConnected} title="Import your customers"
            desc="From Excel, Google Contacts, business cards and more." />
          <SetupItem done={false} locked={!data.setup.numberConnected} title="Create a message template"
            desc="Get an approved template so you can re-engage anytime." />
          <SetupItem done={data.setup.hasTeam} optional title="Invite your team"
            desc="Add agents and managers to your shared inbox." />
        </div>
      </section>

      <section className="dh-preview">
        <h2 className="dh-h2">What lights up once you’re connected</h2>
        <div className="dh-grid">
          {PREVIEW_TILES.map((t) => {
            const Icon = t.icon;
            return (
              <article key={t.label} className="dh-tile dh-tile--locked">
                <span className="dh-tile__ic"><Icon size={18} /></span>
                <span className="dh-tile__val">—</span>
                <span className="dh-tile__label">{t.label}</span>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

const PREVIEW_TILES = [
  { icon: MessageSquare, label: 'Conversations' },
  { icon: Contact, label: 'Contacts & leads' },
  { icon: Megaphone, label: 'Campaigns' },
  { icon: ShoppingBag, label: 'Orders' },
  { icon: PhoneCall, label: 'Calls' },
];

function SetupItem({ done, locked, primary, optional, title, desc, onClick, cta }: {
  done: boolean; locked?: boolean; primary?: boolean; optional?: boolean; title: string; desc: string; onClick?: () => void; cta?: string;
}) {
  return (
    <div className={`dh-setup__item${done ? ' dh-setup__item--done' : ''}${locked ? ' dh-setup__item--locked' : ''}`}>
      <span className="dh-setup__check">{done ? <Check size={15} /> : <CircleDashed size={15} />}</span>
      <div className="dh-setup__body">
        <strong>{title}{optional ? <em> · optional</em> : ''}</strong>
        <p>{desc}</p>
      </div>
      {!done && !locked && onClick ? <button className={`dh-btn dh-btn--sm ${primary ? 'dh-btn--gold' : 'dh-btn--ghost'}`} onClick={onClick}>{cta ?? 'Start'}</button> : null}
      {locked ? <span className="dh-setup__lock">Locked</span> : null}
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
