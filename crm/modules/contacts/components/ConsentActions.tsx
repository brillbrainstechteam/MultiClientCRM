import { useCallback, useEffect, useState } from 'react';
import { Copy, Check, ShieldCheck, ShieldX, ExternalLink } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@crm/design-system';
import './ConsentActions.css';

/**
 * Collect and record WhatsApp consent for one contact.
 *
 * Two routes exist, and they are deliberately different. A reply that arrives
 * on WhatsApp is captured by the webhook with no help from this screen. What
 * this screen handles is consent given somewhere the system cannot see — on a
 * call, at the counter, on a form — and for that it insists on the channel and
 * the wording, because an opt-in with no record of what was agreed cannot be
 * defended to a complaint or an audit.
 *
 * Both routes go through /api/crm/consent/record, so the decision and its
 * evidence are always written together.
 */

const optInMessage = (name: string) =>
  `Hello ${name || 'there'}, this is our jewellery team on WhatsApp.\n\n`
  + `May we send you new design catalogues, stock updates and festive collections here `
  + `— around 2-4 messages a month?\n\n`
  + `Reply YES to receive them, or STOP to opt out at any time.`;

const CHANNELS = [
  { value: 'call', label: 'On a call' },
  { value: 'in_store', label: 'At the counter / showroom' },
  { value: 'web_form', label: 'Website or form' },
  { value: 'manual', label: 'Other (noted by the team)' },
];

interface LedgerEvent {
  id: string; event: string; channel: string; source: string | null;
  wording: string | null; at: string; actor: string;
}

const EVENT_LABEL: Record<string, string> = {
  requested: 'Request sent', opted_in: 'Opted in', opted_out: 'Opted out', reset: 'Reset',
};

export function ConsentActions({
  contactId, contactName, consent,
}: { contactId: string; contactName: string; consent: string }) {
  const [state, setState] = useState(consent);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  const [capture, setCapture] = useState<'in' | 'out' | null>(null);
  const [channel, setChannel] = useState('call');
  const [wording, setWording] = useState('');
  const [source, setSource] = useState('');
  const [reason, setReason] = useState('');
  const [events, setEvents] = useState<LedgerEvent[]>([]);

  const msg = optInMessage(contactName);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — the text is on screen anyway */ }
  };

  const loadLedger = useCallback(() => {
    fetch(`/api/crm/consent/record?contactId=${encodeURIComponent(contactId)}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { events?: LedgerEvent[]; consent?: string }) => {
        setEvents(d.events ?? []);
        if (d.consent) setState(d.consent);
      })
      .catch(() => { /* the ledger is supporting detail, never blocking */ });
  }, [contactId]);

  useEffect(() => { loadLedger(); }, [loadLedger]);

  const submit = async () => {
    if (!capture) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/crm/consent/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          contactIds: [contactId],
          decision: capture,
          channel: capture === 'in' ? channel : 'manual',
          wording,
          source,
          reason,
        }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok || d.error) { setErr(d.error ?? 'Could not record consent.'); return; }
      setState(capture === 'in' ? 'opted-in' : 'opted-out');
      setCapture(null); setWording(''); setSource(''); setReason('');
      loadLedger();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not record consent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ca">
      <div className="ca-head">
        <span className="ca-label">Consent</span>
        <span className={`ca-badge ca-badge--${state === 'opted-in' ? 'in' : state === 'opted-out' ? 'out' : 'pending'}`}>
          {state === 'opted-in' ? 'Opted in' : state === 'opted-out' ? 'Opted out' : 'Pending'}
        </span>
      </div>

      <blockquote className="ca-msg">
        {msg}
        <button className="ca-copy" onClick={() => void copy()}>
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </blockquote>
      <p className="ca-hint">
        Send this by hand while the 24-hour window is open. To ask contacts who are
        not in an open conversation, use the approved template from{' '}
        <a className="ca-link" href="/crm/contacts/consent">
          Contacts &amp; Leads → Consent <ExternalLink size={11} />
        </a>
        — a reply there is captured automatically.
      </p>

      {capture === null ? (
        <div className="ca-actions">
          <Button
            variant="primary"
            size="sm"
            iconLeft={<ShieldCheck />}
            disabled={busy || state === 'opted-in'}
            onClick={() => { setCapture('in'); setErr(''); }}
          >
            Record opt-in
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<ShieldX />}
            disabled={busy || state === 'opted-out'}
            onClick={() => { setCapture('out'); setErr(''); }}
          >
            Record opt-out
          </Button>
        </div>
      ) : (
        <div className="ca-form">
          {capture === 'in' ? (
            <>
              <Select
                label="How it was collected"
                size="sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                options={CHANNELS}
              />
              <Textarea
                label="What they agreed to"
                value={wording}
                onChange={(e) => setWording(e.target.value)}
                rows={3}
                required
                placeholder="Asked on the call whether we may send new design catalogues and stock updates on WhatsApp, around 2-4 a month. He agreed."
                hint="Stored as the proof behind this opt-in."
              />
            </>
          ) : (
            <Input
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Asked to be removed during the call"
            />
          )}
          <Input
            label="Who collected it (optional)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Meera — showroom visit"
          />
          <div className="ca-actions">
            <Button variant="primary" size="sm" onClick={() => void submit()} disabled={busy}>
              {busy ? 'Saving…' : capture === 'in' ? 'Save opt-in' : 'Save opt-out'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCapture(null)} disabled={busy}>Cancel</Button>
          </div>
        </div>
      )}

      {err ? <p className="ca-err">{err}</p> : null}

      {events.length > 0 ? (
        <ol className="ca-ledger">
          {events.map((e) => (
            <li key={e.id} className="ca-ledger-item">
              <span className="ca-ledger-event">{EVENT_LABEL[e.event] ?? e.event}</span>
              <span className="ca-ledger-meta">
                {new Date(e.at).toLocaleString('en-IN')} · {e.channel.replace(/_/g, ' ')} · {e.actor}
              </span>
              {e.wording ? <span className="ca-ledger-wording">{e.wording}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
