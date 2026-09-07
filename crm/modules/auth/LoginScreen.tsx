import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSession } from '@crm/app/app-session';
import { Button, Input } from '@crm/design-system';
import { AuthShell } from './AuthShell';

/**
 * Public login screen. Mock auth only — a valid-looking submit navigates to the
 * dashboard. Real authentication is a backend concern.
 */
export default function LoginScreen() {
  const navigate = useNavigate();
  const { reset, setConnected, setPlan, addWallet } = useAppSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Returning user = an established, connected, paying workspace.
    reset();
    setConnected(true);
    setPlan('growth');
    addWallet(1240);
    navigate('/dashboard');
  };

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

      <form onSubmit={submit}>
        <div className="crm-authform__fields">
          <Input
            label="Business email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            autoComplete="email"
          />
          <div>
            <div className="crm-authform__label-row">
              <span />
              <Link to="/forgot-password" className="crm-authform__link">
                Forgot password?
              </Link>
            </div>
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        <Button type="submit" variant="primary" fullWidth className="crm-authform__submit">
          Log in
        </Button>
      </form>

      <p className="crm-authform__footer">
        New to TalkTrack? <Link to="/signup" className="crm-authform__link">Create an account</Link>
      </p>
    </AuthShell>
  );
}
