'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { AlertTriangle, Check, Info, MessageCircle, Phone, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/lib/ui/Button';
import './onboarding.css';

type Path = 'coexistence' | 'new' | 'existing';

/**
 * The question is framed by outcome, not by Meta's vocabulary. An SME owner
 * does not know what "coexistence" or "Cloud API" mean; they know whether
 * WhatsApp is on their phone today, and they care whether their chats survive.
 */
const PATHS: {
  id: Path;
  title: string;
  subtitle: string;
  tip: string;
  icon: typeof Phone;
  recommended?: boolean;
}[] = [
  {
    id: 'coexistence',
    title: 'I use WhatsApp Business on my phone',
    subtitle: 'Keep using it, and add TalkTrack alongside',
    tip: 'Coexistence: the number keeps working in the WhatsApp Business app and in TalkTrack at the same time, and WhatsApp can bring across your recent conversations.',
    icon: RefreshCw,
    recommended: true,
  },
  {
    id: 'existing',
    title: 'This number is with another WhatsApp provider',
    subtitle: 'Move it to TalkTrack',
    tip: 'The number is already on the WhatsApp Cloud API through another provider or your own account. TalkTrack takes over the connection.',
    icon: MessageCircle,
  },
  {
    id: 'new',
    title: 'This is a new number',
    subtitle: 'Set up WhatsApp for the first time',
    tip: 'Registers a number that has never been used on WhatsApp Business. Nothing to import.',
    icon: Phone,
  },
];

/** What each path actually does to the customer's existing chats. */
const PATH_DETAIL: Record<Path, { keeps: string[]; loses: string[] }> = {
  coexistence: {
    keeps: [
      'Keep the same number',
      'Keep using WhatsApp Business on your phone',
      'Bring up to 6 months of recent one-to-one chats',
      'Bring your WhatsApp contacts',
      'Messages you send from your phone also appear in TalkTrack',
      'Your team can reply from TalkTrack',
    ],
    loses: [
      'Group chats, broadcast lists and labels do not come across',
      'Images and files older than about 2 weeks arrive as a note, without the original file',
    ],
  },
  existing: {
    keeps: [
      'Keep the same number',
      'Customers can keep messaging you throughout',
      'TalkTrack becomes your team inbox',
    ],
    loses: [
      'Conversation history held by your previous provider does not transfer automatically',
      'Ask us about importing it separately if you need it',
    ],
  },
  new: {
    keeps: [
      'A fresh WhatsApp Business number set up for your team',
      'TalkTrack is your inbox from the first message',
    ],
    loses: [
      'If this number is currently in the WhatsApp Business app, that app will stop working for it and those chats will NOT be imported',
      'To keep the app and your chats, choose the first option instead',
    ],
  },
};

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (cb: (res: unknown) => void, opts: Record<string, unknown>) => void;
    };
  }
}

interface Props {
  appId: string;
  configId: string;
  graphVersion: string;
  coexistenceFeature: string;
  /** Resume: pre-select the strategy the client chose in a prior attempt. */
  initialStrategy?: string;
}

/** Fire-and-forget onboarding-progress write (powers the progress bar + resume). */
function postProgress(body: Record<string, unknown>) {
  fetch('/api/crm/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

export function EmbeddedSignup({ appId, configId, graphVersion, coexistenceFeature, initialStrategy }: Props) {
  const isPath = (v?: string): v is Path => v === 'coexistence' || v === 'new' || v === 'existing';
  const [path, setPath] = useState<Path>(isPath(initialStrategy) ? initialStrategy : 'coexistence');
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const sdkReady = useRef(false);
  const session = useRef<{ wabaId?: string; phoneNumberId?: string; event?: string; currentStep?: string }>({});

  const choose = (id: Path) => { setPath(id); postProgress({ status: 'strategy_selected', strategy: id }); };

  // Capture the WABA / phone-number id + session event the popup posts back.
  // event = FINISH | FINISH_ONLY_WABA (coexistence) | CANCEL{current_step} | ERROR.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!/facebook\.com$/.test(new URL(event.origin).hostname)) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          session.current = {
            wabaId: data.data?.waba_id,
            phoneNumberId: data.data?.phone_number_id,
            event: data.event,
            currentStep: data.data?.current_step,
          };
          if (data.event === 'CANCEL') postProgress({ status: 'cancelled', lastStep: data.data?.current_step ?? null });
          else if (data.event === 'ERROR') postProgress({ status: 'error', errorMessage: data.data?.error_message ?? 'Embedded Signup error' });
        }
      } catch {
        /* not our message */
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Surface a failure handed back by the redirect callback.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('connect') === 'error') {
      setStatus(`Could not connect: ${q.get('reason') ?? 'Unknown error.'}`);
    }
  }, []);

  function initSdk() {
    if (sdkReady.current || !window.FB) return;
    window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
    sdkReady.current = true;
  }

  // Server-side redirect flow: we own the redirect_uri end-to-end, so the code
  // exchange can never hit a redirect_uri mismatch (the JS-SDK popup bound codes
  // to Facebook's dynamic xd_arbiter URL, which is unreproducible server-side).
  function launch() {
    setBusy(true);
    setStatus('Opening WhatsApp onboarding…');
    window.location.href = `/api/auth/meta/start?path=${encodeURIComponent(path)}`;
  }

  function launchViaSdk() {
    if (!window.FB) {
      setStatus('WhatsApp onboarding is still loading — try again in a moment.');
      return;
    }
    initSdk();
    setBusy(true);
    setStatus('Opening WhatsApp onboarding…');
    postProgress({ status: 'meta_launched', strategy: path });

    const extras: Record<string, unknown> = { setup: {}, sessionInfoVersion: '3' };
    if (path === 'coexistence' && coexistenceFeature) extras.featureType = coexistenceFeature;

    window.FB.login(
      (res: unknown) => {
        const code = (res as { authResponse?: { code?: string } })?.authResponse?.code;
        if (!code) {
          setBusy(false);
          setStatus('Onboarding was cancelled.');
          return;
        }
        setStatus('Finalising connection…');
        fetch('/api/auth/meta/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, strategy: path, ...session.current }),
        })
          .then(async (r) => {
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j.error ?? 'Connection failed.');
            return j as { pinRequired?: boolean };
          })
          .then((j) => {
            if (j.pinRequired) { window.location.href = '/onboarding?connect=pin'; return; }
            setStatus('Connected! Redirecting…');
            // Coexistence goes to the import screen so the owner watches their
            // chats arrive instead of meeting an inbox that looks empty.
            window.location.href = path === 'coexistence' ? '/onboarding/importing' : '/crm/dashboard';
          })
          .catch((err: Error) => {
            setBusy(false);
            setStatus(`Could not connect: ${err.message}`);
          });
      },
      { config_id: configId, response_type: 'code', override_default_response_type: true, extras },
    );
  }

  return (
    <div className="tt-onb">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={initSdk}
      />

      <div className="tt-onb__paths">
        {PATHS.map((p) => {
          const Icon = p.icon;
          const active = path === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className={`tt-onb__path${active ? ' tt-onb__path--active' : ''}`}
              onClick={() => choose(p.id)}
              aria-pressed={active}
            >
              <span className="tt-onb__path-icon"><Icon /></span>
              <span className="tt-onb__path-text">
                <span className="tt-onb__path-title">
                  {p.title}
                  {p.recommended ? <span className="tt-onb__rec">Recommended</span> : null}
                </span>
                <span className="tt-onb__path-sub">{p.subtitle}</span>
              </span>
              <span className="tt-onb__path-info" title={p.tip} aria-label={p.tip} role="img">
                <Info />
              </span>
              {active ? <Check className="tt-onb__path-check" /> : null}
            </button>
          );
        })}
      </div>

      {/* What this choice does to their existing chats, before they commit. */}
      <div className="tt-onb__detail">
        <h2 className="tt-onb__detail-title">
          {path === 'coexistence' ? 'Keep your WhatsApp. Add TalkTrack.'
            : path === 'existing' ? 'Move your number to TalkTrack'
              : 'Set up a new WhatsApp number'}
        </h2>
        <ul className="tt-onb__list">
          {PATH_DETAIL[path].keeps.map((line) => (
            <li key={line} className="tt-onb__li tt-onb__li--yes"><Check aria-hidden="true" />{line}</li>
          ))}
          {PATH_DETAIL[path].loses.map((line) => (
            <li key={line} className="tt-onb__li tt-onb__li--no"><X aria-hidden="true" />{line}</li>
          ))}
        </ul>

        {/* The single instruction that decides whether history arrives at all.
            Meta asks this inside its own popup, where it is easy to dismiss —
            and the choice cannot be undone without offboarding entirely. */}
        {path === 'coexistence' ? (
          <p className="tt-onb__callout">
            <ShieldCheck aria-hidden="true" />
            <span>
              <strong>When WhatsApp asks whether to share your chat history, choose
              &ldquo;Share chats&rdquo;.</strong> That is what lets TalkTrack bring your recent
              customer conversations into the team inbox. It can only be done during this
              setup — not afterwards.
            </span>
          </p>
        ) : null}

        {path === 'new' ? (
          <p className="tt-onb__callout tt-onb__callout--warn">
            <AlertTriangle aria-hidden="true" />
            <span>
              Only choose this if the number is <strong>not</strong> in use in the WhatsApp
              Business app. Registering a number that is in the app removes it from the app
              and its existing chats cannot be recovered into TalkTrack.
            </span>
          </p>
        ) : null}
      </div>

      <Button variant="primary" size="lg" fullWidth disabled={busy} onClick={launch}>
        {busy ? 'Connecting…' : path === 'coexistence' ? 'Connect WhatsApp' : 'Continue'}
      </Button>

      <button type="button" className="tt-onb__alt" disabled={busy} onClick={launchViaSdk}>
        Having trouble? Try the popup method
      </button>

      {status ? <p className="tt-onb__status">{status}</p> : null}
    </div>
  );
}
