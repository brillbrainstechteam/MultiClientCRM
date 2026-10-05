import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BadgeCheck, Check, Copy, ExternalLink, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@crm/design-system';
import './KundliPanel.css';

/**
 * Pre-call brief ("Kundli").
 *
 * Identity leads, because a rep must know whether this is even the right shop
 * before reading anything else — a confident-looking brief about the wrong
 * "Krishna Jewellers" is worse than none. Research runs in two stages so an
 * uncertain match costs one search instead of five.
 */

interface Identity {
  confidence: 'high' | 'medium' | 'low' | 'conflict';
  reason: string;
  verifyBeforeCalling: string[];
  possibleMatches: { name: string; area?: string; clue?: string; url?: string }[];
}

interface Kundli {
  identity?: Identity;
  companyOverview?: string;
  industry?: string;
  businessType?: string;
  customerTypeServed?: string;
  brandLevel?: string;
  ownerDecisionMaker?: string;
  establishedYear?: string;
  teamStrength?: string;
  googleRating?: string;
  storePresence?: { totalCities: number | null; totalStores: number | null; byCity: { city: string; stores: number | null }[] };
  onlinePresence?: { website?: string; socials?: string[] };
  socialProfiles?: { platform: string; url?: string; followers?: string }[];
  productsServices?: string[];
  designStyle?: string;
  occasionFocus?: string;
  customerSegment?: string;
  visibleProductFocus?: string;
  differentiation?: string[];
  likelyNeeds?: string[];
  talkingPoints?: string[];
  pitchAngle?: { bestProduct: string; whyItFits: string; mainBenefit: string; bestTiming: string };
  suggestedScript?: { opening: string; discoveryQuestions: string[]; valuePitch: string; objectionHandling: string[] };
  hinglishScript?: { opening: string; valuePitch: string };
  whatNotToSay?: string[];
  bestTimeOrChannel?: string;
  importantFestivals?: string[];
  awards?: string[];
  recentSignals?: string[];
  risksNotes?: string[];
  sources?: string[];
  generatedWith?: string;
  identityOnly?: boolean;
  language?: 'english' | 'hinglish';
  storePresenceVerified?: boolean;
}

const UNKNOWN = 'Not Found';
const known = (v?: string) => Boolean(v && v !== UNKNOWN && v !== 'Needs Manual Verification');

const CONFIDENCE: Record<Identity['confidence'], { label: string; tone: string; icon: typeof BadgeCheck }> = {
  high: { label: 'Identity confirmed', tone: 'good', icon: BadgeCheck },
  medium: { label: 'Probably the right business', tone: 'warn', icon: AlertTriangle },
  low: { label: 'Not confirmed — verify on the call', tone: 'bad', icon: ShieldAlert },
  conflict: { label: 'Several businesses match this name', tone: 'bad', icon: ShieldAlert },
};

type Lang = 'english' | 'hinglish';

export function KundliPanel({ contactId }: { contactId: string }) {
  const [kundli, setKundli] = useState<Kundli | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState<'identity' | 'full' | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [lang, setLang] = useState<Lang>('english');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/crm/contacts/${contactId}/kundli`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) { setKundli(d.kundli ?? null); setGeneratedAt(d.generatedAt ?? null); if (d.kundli?.language) setLang(d.kundli.language); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [contactId]);

  // `force` (Refresh) bypasses the cache and pays for a fresh model call; every
  // other call is cache-first on the server, so re-opening a brief is free. The
  // chosen language is sent so the model writes that script as the primary one.
  const run = useCallback(async (mode: 'identity' | 'full', force = false) => {
    setBusy(mode); setError('');
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/kundli`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, refresh: force, language: lang }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Could not research this contact.'); return; }
      setKundli(d.kundli ?? null); setGeneratedAt(d.generatedAt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not research this contact.');
    } finally { setBusy(null); }
  }, [contactId, lang]);

  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1600); } catch { /* ignore */ }
  };

  if (!kundli) {
    return (
      <div className="kp kp--empty">
        <Sparkles size={26} />
        <h3>No pre-call brief yet</h3>
        <p>
          We check who this business is first — one quick search. If it looks like the right shop,
          you can run the full brief.
        </p>
        <LangSwitch lang={lang} onChange={setLang} />
        {error ? <p className="kp-error">{error}</p> : null}
        <Button variant="primary" iconLeft={<Search />} disabled={busy !== null} onClick={() => void run('identity')}>
          {busy === 'identity' ? 'Checking…' : 'Check who this is'}
        </Button>
      </div>
    );
  }

  const id = kundli.identity;
  const conf = CONFIDENCE[id?.confidence ?? 'low'];
  const ConfIcon = conf.icon;
  const sure = id?.confidence === 'high' || id?.confidence === 'medium';
  const script = kundli.suggestedScript;

  return (
    <div className="kp">
      {/* Verification first — nothing below matters if this is the wrong shop. */}
      <section className={`kp-verify kp-verify--${conf.tone}`}>
        <div className="kp-verify__head">
          <ConfIcon size={18} />
          <strong>{conf.label}</strong>
        </div>
        {id?.reason ? <p>{id.reason}</p> : null}
        {id?.verifyBeforeCalling?.length ? (
          <>
            <span className="kp-label">Confirm on the call</span>
            <ul>{id.verifyBeforeCalling.map((v) => <li key={v}>{v}</li>)}</ul>
          </>
        ) : null}
        {id?.possibleMatches?.length ? (
          <>
            <span className="kp-label">Could also be</span>
            <ul>
              {id.possibleMatches.map((m) => (
                <li key={m.name}>
                  <strong>{m.name}</strong>{m.area ? ` · ${m.area}` : ''}{m.clue ? ` — ${m.clue}` : ''}
                  {m.url ? <> · <a href={m.url} target="_blank" rel="noopener noreferrer">source</a></> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {error ? <p className="kp-error">{error}</p> : null}

      {kundli.identityOnly ? (
        <div className="kp-next">
          <p>
            {sure
              ? 'Looks like the right business. Research the full brief when you are ready to call.'
              : 'Identity is not certain. Confirm the business first, or research anyway and treat the details with caution.'}
          </p>
          <Button variant="primary" iconLeft={<Sparkles />} disabled={busy !== null} onClick={() => void run('full')}>
            {busy === 'full' ? 'Researching…' : 'Research full brief'}
          </Button>
        </div>
      ) : null}

      {!kundli.identityOnly ? (
        <>
          <div className="kp-toolbar">
            <LangSwitch lang={lang} onChange={setLang} />
          </div>

          {kundli.companyOverview ? <p className="kp-overview">{kundli.companyOverview}</p> : null}

          <div className="kp-chips">
            <Chip label="Type" value={kundli.businessType} />
            <Chip label="Sells to" value={kundli.customerTypeServed} />
            <Chip label="Level" value={kundli.brandLevel} />
            <Chip label="Stores" value={kundli.storePresence?.totalStores != null ? String(kundli.storePresence.totalStores) : undefined} />
            <Chip label="Cities" value={kundli.storePresence?.totalCities != null ? String(kundli.storePresence.totalCities) : undefined} />
            <Chip label="Rating" value={kundli.googleRating} />
            <Chip label="Since" value={kundli.establishedYear} />
            <Chip label="Team" value={kundli.teamStrength} />
            <Chip label="Decision maker" value={kundli.ownerDecisionMaker} />
          </div>

          {kundli.storePresence?.byCity?.length ? (
            <Section title={`Store presence${kundli.storePresenceVerified ? '' : ''}`}>
              {kundli.storePresenceVerified ? <span className="kp-verified"><BadgeCheck size={12} /> Verified · Google</span> : null}
              <p className="kp-presence-sum">
                {kundli.storePresence.totalStores != null ? `${kundli.storePresence.totalStores} store${kundli.storePresence.totalStores === 1 ? '' : 's'}` : ''}
                {kundli.storePresence.totalCities != null ? ` across ${kundli.storePresence.totalCities} cit${kundli.storePresence.totalCities === 1 ? 'y' : 'ies'}` : ''}
              </p>
              <ul className="kp-bullets">
                {kundli.storePresence.byCity.map((c) => (
                  <li key={c.city}>{c.city}{c.stores != null ? ` — ${c.stores} store${c.stores === 1 ? '' : 's'}` : ''}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="What they sell">
            <div className="kp-grid">
              <Meta label="Main products" value={kundli.productsServices?.join(', ')} />
              <Meta label="Design style" value={kundli.designStyle} />
              <Meta label="Occasion focus" value={kundli.occasionFocus} />
              <Meta label="Customer segment" value={kundli.customerSegment} />
              <Meta label="Visible focus" value={kundli.visibleProductFocus} />
            </div>
          </Section>

          {kundli.differentiation?.length ? (
            <Section title="Strengths">
              <ul className="kp-bullets">{kundli.differentiation.map((d) => <li key={d}>{d}</li>)}</ul>
            </Section>
          ) : null}

          {kundli.pitchAngle && known(kundli.pitchAngle.bestProduct) ? (
            <Section title="Best pitch angle">
              <div className="kp-pitch">
                <Meta label="Pitch" value={kundli.pitchAngle.bestProduct} />
                <Meta label="Why it fits" value={kundli.pitchAngle.whyItFits} />
                <Meta label="Main benefit" value={kundli.pitchAngle.mainBenefit} />
                <Meta label="Best timing" value={kundli.pitchAngle.bestTiming} />
              </div>
            </Section>
          ) : null}

          {(() => {
            const opening = lang === 'hinglish' ? (kundli.hinglishScript?.opening || script?.opening) : (script?.opening || kundli.hinglishScript?.opening);
            const pitch = lang === 'hinglish' ? (kundli.hinglishScript?.valuePitch || script?.valuePitch) : (script?.valuePitch || kundli.hinglishScript?.valuePitch);
            if (!opening) return null;
            return (
              <Section title={`Say this · ${lang === 'hinglish' ? 'Hinglish' : 'English'}`}>
                <blockquote className="kp-say">
                  {opening}
                  <button className="kp-copy" onClick={() => void copy('opening', opening)}>
                    {copied === 'opening' ? <Check size={13} /> : <Copy size={13} />} {copied === 'opening' ? 'Copied' : 'Copy'}
                  </button>
                </blockquote>
                {pitch ? (
                  <blockquote className="kp-say kp-say--alt">
                    {pitch}
                    <button className="kp-copy" onClick={() => void copy('pitch', pitch)}>
                      {copied === 'pitch' ? <Check size={13} /> : <Copy size={13} />} {copied === 'pitch' ? 'Copied' : 'Copy'}
                    </button>
                  </blockquote>
                ) : null}
              </Section>
            );
          })()}

          {script?.discoveryQuestions?.length ? (
            <Section title="Ask these">
              <ol className="kp-questions">{script.discoveryQuestions.map((q) => <li key={q}>{q}</li>)}</ol>
            </Section>
          ) : null}

          {kundli.talkingPoints?.length ? (
            <Section title="Talking points">
              <ul className="kp-bullets">{kundli.talkingPoints.map((t) => <li key={t}>{t}</li>)}</ul>
            </Section>
          ) : null}

          {kundli.whatNotToSay?.length ? (
            <Section title="Do not say">
              <ul className="kp-bullets kp-bullets--caution">{kundli.whatNotToSay.map((w) => <li key={w}>{w}</li>)}</ul>
            </Section>
          ) : null}

          {kundli.importantFestivals?.length || kundli.recentSignals?.length ? (
            <Section title="Timing & signals">
              {kundli.importantFestivals?.length ? <Meta label="Festivals" value={kundli.importantFestivals.join(', ')} /> : null}
              {kundli.bestTimeOrChannel ? <Meta label="Best time / channel" value={kundli.bestTimeOrChannel} /> : null}
              {kundli.recentSignals?.length ? (
                <ul className="kp-bullets">{kundli.recentSignals.map((s) => <li key={s}>{s}</li>)}</ul>
              ) : null}
            </Section>
          ) : null}

          {kundli.sources?.length ? (
            <Section title="Sources">
              <ul className="kp-sources">
                {kundli.sources.map((s) => (
                  <li key={s}>
                    <a href={s} target="_blank" rel="noopener noreferrer">{hostOf(s)} <ExternalLink size={11} /></a>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      ) : null}

      <div className="kp-foot">
        <span>
          {generatedAt ? `Researched ${new Date(generatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
          {kundli.generatedWith ? ` · ${kundli.generatedWith}` : ''}
        </span>
        <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => void run(kundli.identityOnly ? 'identity' : 'full', true)} title="Run a fresh search (uses a paid lookup)">
          {busy ? 'Working…' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="kp-lang" role="group" aria-label="Call language">
      <span className="kp-lang__label">Call language</span>
      <div className="kp-lang__seg">
        <button className={lang === 'english' ? 'on' : ''} onClick={() => onChange('english')}>English</button>
        <button className={lang === 'hinglish' ? 'on' : ''} onClick={() => onChange('hinglish')}>Hinglish</button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="kp-section"><h3>{title}</h3>{children}</section>;
}

function Chip({ label, value }: { label: string; value?: string }) {
  if (!known(value)) return null;
  return <span className="kp-chip"><em>{label}</em>{value}</span>;
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div className="kp-meta">
      <span className="kp-label">{label}</span>
      <span className={known(value) ? '' : 'kp-unknown'}>{known(value) ? value : UNKNOWN}</span>
    </div>
  );
}
