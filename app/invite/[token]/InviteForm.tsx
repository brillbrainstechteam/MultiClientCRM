'use client';

import { useState } from 'react';

const INK = '#2a2318';
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 11, border: '1px solid #e3d8c3', background: '#fff', color: INK, fontSize: 15, fontFamily: 'inherit', outline: 'none' };

export function InviteForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setErr('Passwords do not match.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/auth/invite/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? 'Could not set your password.'); return; }
      setDone(true);
    } catch { setErr('Something went wrong. Please try again.'); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 40 }}>✓</div>
        <p style={{ color: '#2a2318', fontWeight: 600 }}>Your account is ready.</p>
        <a href="/login" style={{ display: 'inline-block', marginTop: 8, padding: '12px 18px', borderRadius: 11, background: INK, color: '#f6e7c4', fontWeight: 700, textDecoration: 'none' }}>Go to sign in</a>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" style={inputStyle} autoComplete="new-password" />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" style={inputStyle} autoComplete="new-password" />
      {err ? <p style={{ color: '#c0392b', fontSize: 13.5, margin: 0 }}>{err}</p> : null}
      <button type="button" onClick={submit} disabled={busy} style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: 0, background: INK, color: '#f6e7c4', fontSize: 15, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Setting…' : 'Set password & activate'}</button>
    </div>
  );
}
