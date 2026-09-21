'use client';

import { useState } from 'react';
import { Button } from '@/lib/ui/Button';

/**
 * Shown when a connected number already has two-step verification enabled and
 * Meta needs the client's own 6-digit PIN to finish Cloud API registration.
 */
export function PinPrompt({ phoneNumberId, displayPhone }: { phoneNumberId: string; displayPhone: string | null }) {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setStatus('');
    const res = await fetch('/api/crm/whatsapp/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumberId, pin }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setStatus('Number activated! Redirecting…'); window.location.href = '/crm/dashboard'; }
    else setStatus(j.error ?? 'Could not activate the number.');
  }

  return (
    <div className="tt-onb__notice" style={{ marginBottom: 18 }}>
      <strong>One more step — enter your 2-step verification PIN.</strong>
      <p style={{ margin: '6px 0 12px' }}>
        {displayPhone ?? 'Your number'} already has WhatsApp two-step verification enabled. Enter its
        6-digit PIN so we can finish activating it for sending. (If you don’t know it, reset two-step
        verification in the WhatsApp Business app, then try again.)
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          placeholder="6-digit PIN"
          style={{ padding: '9px 12px', border: '1px solid var(--crm-border-strong,#cbd5e1)', borderRadius: 8, font: 'inherit', width: 140, letterSpacing: '0.2em' }}
        />
        <Button variant="primary" disabled={busy || pin.length !== 6} onClick={submit}>
          {busy ? 'Activating…' : 'Activate number'}
        </Button>
      </div>
      {status ? <p style={{ marginTop: 10 }}>{status}</p> : null}
    </div>
  );
}
