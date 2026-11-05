'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/lib/ui/AuthShell';
import { Button } from '@/lib/ui/Button';
import { Input } from '@/lib/ui/Input';
import { loginAction, type LoginState } from './actions';
import '../auth-forms.css';

const initial: LoginState = {};

const GOOGLE_ERRORS: Record<string, string> = {
  no_account: 'No TalkTrack account found for that Google email. Ask your administrator to add you.',
  google_state: 'Your sign-in session expired. Please try again.',
  google_failed: 'Could not sign in with Google. Please try again.',
  google_email: 'Your Google email could not be verified. Use your email and password instead.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_unconfigured: 'Google sign-in is not set up yet.',
};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  // Read the ?error= from Google sign-in on the client (avoids a Suspense boundary).
  const [googleError, setGoogleError] = useState<string | undefined>(undefined);
  useEffect(() => {
    setGoogleError(GOOGLE_ERRORS[new URLSearchParams(window.location.search).get('error') ?? '']);
  }, []);

  return (
    <AuthShell>
      <div className="crm-authform__brand-mobile">
        <span className="crm-auth__logo">TT</span>
        <span className="crm-auth__wordmark">TalkTrack</span>
      </div>

      <div className="crm-authform__header">
        <h1 className="crm-authform__title">Welcome back</h1>
        <p className="crm-authform__sub">Log in to your TalkTrack workspace.</p>
      </div>

      <form action={formAction}>
        <div className="crm-authform__fields">
          <Input
            label="Email or mobile number"
            name="identifier"
            type="text"
            required
            placeholder="you@yourbusiness.com or 98100 11234"
            autoComplete="username"
            hint="Team members can sign in with whichever the owner set up for them."
          />
          <div>
            <div className="crm-authform__label-row">
              <span />
              <Link href="/forgot-password" className="crm-authform__link">
                Forgot password?
              </Link>
            </div>
            <Input
              label="Password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        {state.error ? <p className="crm-authform__error">{state.error}</p> : null}

        <Button type="submit" variant="primary" fullWidth disabled={pending} className="crm-authform__submit">
          {pending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      {googleError ? <p className="crm-authform__error" style={{ marginTop: 14 }}>{googleError}</p> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--crm-border-subtle, #e5e0d5)' }} />
        <span style={{ fontSize: 12, color: 'var(--crm-text-muted, #94a3b8)' }}>or</span>
        <span style={{ flex: 1, height: 1, background: 'var(--crm-border-subtle, #e5e0d5)' }} />
      </div>

      <a
        href="/api/auth/google/signin"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', boxSizing: 'border-box', padding: '11px 16px', borderRadius: 10, border: '1px solid #dadce0', background: '#fff', color: '#3c4043', fontSize: 14.5, fontWeight: 600, textDecoration: 'none' }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Sign in with Google
      </a>

      <p className="crm-authform__footer">
        New to TalkTrack? <Link href="/signup" className="crm-authform__link">Create an account</Link>
      </p>
    </AuthShell>
  );
}
