'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/lib/ui/AuthShell';
import { Button } from '@/lib/ui/Button';
import { Input } from '@/lib/ui/Input';
import { loginAction, type LoginState } from './actions';
import '../auth-forms.css';

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

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

      <p className="crm-authform__footer">
        New to TalkTrack? <Link href="/signup" className="crm-authform__link">Create an account</Link>
      </p>
    </AuthShell>
  );
}
