'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/lib/ui/AuthShell';
import { Button } from '@/lib/ui/Button';
import { Input } from '@/lib/ui/Input';
import '../auth-forms.css';

/**
 * Two-step mobile OTP flow, shared by login (intent "login") and signup
 * (intent "signup"). The verify endpoint returns a `redirect` — dashboard for
 * an existing member, or /signup/details for a new signup.
 */
export function OtpFlow({ intent }: { intent: 'login' | 'signup' }) {
  const [step, setStep] = useState<'mobile' | 'code'>('mobile');
  const [mobile, setMobile] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile, intent }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? 'Could not send the code.'); return; }
      setVerificationId(d.verificationId); setStep('code');
    } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verificationId, code, mobile, intent }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? 'That code is incorrect.'); return; }
      window.location.href = d.redirect ?? '/crm/dashboard';
    } finally { setBusy(false); }
  };

  return (
    <AuthShell>
      <div className="crm-authform__brand-mobile">
        <span className="crm-auth__logo">TT</span>
        <span className="crm-auth__wordmark">TalkTrack</span>
      </div>

      <div className="crm-authform__header">
        <h1 className="crm-authform__title">{step === 'mobile' ? (intent === 'signup' ? 'Sign up with mobile' : 'Sign in with OTP') : 'Enter the code'}</h1>
        <p className="crm-authform__sub">
          {step === 'mobile' ? 'We’ll text a one-time code to your mobile number.' : `Enter the 6-digit code sent to ${mobile}.`}
        </p>
      </div>

      {step === 'mobile' ? (
        <form onSubmit={(e) => { e.preventDefault(); sendCode(); }}>
          <div className="crm-authform__fields">
            <Input label="Mobile number" name="mobile" type="tel" required autoComplete="tel" placeholder="98100 11234" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          {error ? <p className="crm-authform__error">{error}</p> : null}
          <Button type="submit" variant="primary" fullWidth disabled={busy} className="crm-authform__submit">{busy ? 'Sending…' : 'Send code'}</Button>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <div className="crm-authform__fields">
            <Input label="One-time code" name="code" type="text" inputMode="numeric" required autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          {error ? <p className="crm-authform__error">{error}</p> : null}
          <Button type="submit" variant="primary" fullWidth disabled={busy} className="crm-authform__submit">{busy ? 'Verifying…' : intent === 'signup' ? 'Verify & continue' : 'Verify & sign in'}</Button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button type="button" onClick={() => { setStep('mobile'); setCode(''); setError(null); }} className="crm-authform__link" style={{ border: 0, background: 'none', cursor: 'pointer' }}>Change number</button>
            <button type="button" onClick={sendCode} disabled={busy} className="crm-authform__link" style={{ border: 0, background: 'none', cursor: 'pointer' }}>Resend code</button>
          </div>
        </form>
      )}

      <p className="crm-authform__footer">
        {intent === 'signup'
          ? <>Already have an account? <Link href="/login" className="crm-authform__link">Log in</Link></>
          : <>Prefer a password? <Link href="/login" className="crm-authform__link">Sign in another way</Link></>}
      </p>
    </AuthShell>
  );
}
