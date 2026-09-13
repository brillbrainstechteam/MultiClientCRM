'use client';

import { useState } from 'react';

/**
 * Fallback connect path for when Embedded Signup is unavailable (provider not
 * yet cleared to onboard customers, portfolio mid-verification, or a client who
 * prefers issuing their own System User token).
 */
export function ManualConnect() {
  const [token, setToken] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus('Checking the token with Meta…');
    try {
      const res = await fetch('/api/crm/whatsapp/manual-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), wabaId: wabaId.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? 'Could not connect.');
        setBusy(false);
        return;
      }
      setStatus(
        `Connected ${data.displayPhone} (${data.verifiedName}).` +
          (data.subscribeWarning ? ' Webhook subscription needs a retry — open the diagnostics page.' : '') +
          ' Redirecting…',
      );
      window.location.href = '/crm/dashboard';
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not connect.');
      setBusy(false);
    }
  }

  return (
    <details className="tt-onb__manual">
      <summary>Connect manually with an access token</summary>
      <p className="tt-onb__manual-help">
        Use this when the Meta onboarding dialog will not complete. Generate a System User token with{' '}
        <code>whatsapp_business_management</code> and <code>whatsapp_business_messaging</code> in Business
        Settings → Users → System users, then paste it here.
      </p>
      <form onSubmit={submit} className="tt-onb__manual-form">
        <label>
          System User access token
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="EAAG…"
            autoComplete="off"
            required
          />
        </label>
        <label>
          WhatsApp Business Account ID <span>(optional — read from the token when blank)</span>
          <input
            type="text"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            placeholder="2230148694199764"
            autoComplete="off"
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Connecting…' : 'Connect with token'}
        </button>
      </form>
      {status ? <p className="tt-onb__status">{status}</p> : null}
    </details>
  );
}
