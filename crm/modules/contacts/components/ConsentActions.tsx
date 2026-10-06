import { useState } from 'react';
import { Copy, Check, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@crm/design-system';
import { updateContact } from '@crm/app/crm-data';
import './ConsentActions.css';

/**
 * Collect WhatsApp consent: a ready opt-in message the rep sends (human-sent,
 * never auto), and one-tap recording of the reply. The same message is in the
 * template library as "Consent — Opt-in request" for Meta approval.
 */
const optInMessage = (name: string) =>
  `Hello ${name || 'there'}, greetings from our jewellery team 💎\n\n` +
  `We'd love to keep you updated on our latest collections, new designs and festive offers on WhatsApp.\n\n` +
  `Reply *YES* to receive updates, or *STOP* to opt out anytime. Thank you!`;

export function ConsentActions({ contactId, contactName, consent }: { contactId: string; contactName: string; consent: string }) {
  const [state, setState] = useState(consent);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  const msg = optInMessage(contactName);
  const copy = async () => { try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ } };

  const mark = async (next: 'opted-in' | 'opted-out') => {
    setBusy(true); setErr('');
    try {
      await updateContact(contactId, { consent: next, ...(next === 'opted-in' ? { consentOptInSource: 'WhatsApp opt-in' } : {}) });
      setState(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update consent.');
    } finally { setBusy(false); }
  };

  return (
    <div className="ca">
      <div className="ca-head">
        <span className="ca-label">Request opt-in</span>
        <span className={`ca-badge ca-badge--${state === 'opted-in' ? 'in' : state === 'opted-out' ? 'out' : 'pending'}`}>
          {state === 'opted-in' ? 'Opted in' : state === 'opted-out' ? 'Opted out' : 'Pending'}
        </span>
      </div>
      <blockquote className="ca-msg">
        {msg}
        <button className="ca-copy" onClick={() => void copy()}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}</button>
      </blockquote>
      <p className="ca-hint">Send this on WhatsApp (also in Templates → “Consent — Opt-in request”). When the customer replies, record it:</p>
      <div className="ca-actions">
        <Button variant="primary" iconLeft={<ShieldCheck size={15} />} disabled={busy || state === 'opted-in'} onClick={() => void mark('opted-in')}>Mark opted-in</Button>
        <Button variant="secondary" iconLeft={<ShieldX size={15} />} disabled={busy || state === 'opted-out'} onClick={() => void mark('opted-out')}>Mark opted-out</Button>
      </div>
      {err ? <p className="ca-err">{err}</p> : null}
    </div>
  );
}
