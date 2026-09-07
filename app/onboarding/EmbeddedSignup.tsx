'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Check, MessageCircle, Phone, RefreshCw } from 'lucide-react';
import { Button } from '@/lib/ui/Button';
import './onboarding.css';

type Path = 'coexistence' | 'new' | 'existing';

const PATHS: { id: Path; title: string; blurb: string; icon: typeof Phone }[] = [
  {
    id: 'coexistence',
    title: 'Keep my WhatsApp Business app',
    blurb: 'Coexistence — your number keeps working in the app and on TalkTrack. Recent chats sync in.',
    icon: RefreshCw,
  },
  {
    id: 'existing',
    title: 'Connect an existing WhatsApp Business Account',
    blurb: 'You already have a WABA / Cloud API number — link it to TalkTrack.',
    icon: MessageCircle,
  },
  {
    id: 'new',
    title: 'Set up a new number',
    blurb: 'Register a fresh number on the WhatsApp Cloud API through TalkTrack.',
    icon: Phone,
  },
];

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
}

export function EmbeddedSignup({ appId, configId, graphVersion, coexistenceFeature }: Props) {
  const [path, setPath] = useState<Path>('coexistence');
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const sdkReady = useRef(false);
  const session = useRef<{ wabaId?: string; phoneNumberId?: string }>({});

  // Capture the WABA / phone-number id the Embedded Signup popup posts back.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!/facebook\.com$/.test(new URL(event.origin).hostname)) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'WA_EMBEDDED_SIGNUP' && data?.data) {
          session.current = { wabaId: data.data.waba_id, phoneNumberId: data.data.phone_number_id };
        }
      } catch {
        /* not our message */
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function initSdk() {
    if (sdkReady.current || !window.FB) return;
    window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: graphVersion });
    sdkReady.current = true;
  }

  function launch() {
    if (!window.FB) {
      setStatus('WhatsApp onboarding is still loading — try again in a moment.');
      return;
    }
    initSdk();
    setBusy(true);
    setStatus('Opening WhatsApp onboarding…');

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
          body: JSON.stringify({ code, path, ...session.current }),
        })
          .then(async (r) => {
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Connection failed.');
          })
          .then(() => {
            setStatus('Connected! Redirecting…');
            window.location.href = '/dashboard';
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
              onClick={() => setPath(p.id)}
              aria-pressed={active}
            >
              <span className="tt-onb__path-icon"><Icon /></span>
              <span className="tt-onb__path-text">
                <span className="tt-onb__path-title">{p.title}</span>
                <span className="tt-onb__path-blurb">{p.blurb}</span>
              </span>
              {active ? <Check className="tt-onb__path-check" /> : null}
            </button>
          );
        })}
      </div>

      <Button variant="primary" size="lg" fullWidth disabled={busy} onClick={launch}>
        {busy ? 'Connecting…' : 'Connect WhatsApp'}
      </Button>

      {status ? <p className="tt-onb__status">{status}</p> : null}
    </div>
  );
}
