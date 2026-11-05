'use client';

import { useActionState, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { AuthShell } from '@/lib/ui/AuthShell';
import { Button } from '@/lib/ui/Button';
import { Checkbox } from '@/lib/ui/Checkbox';
import { Input } from '@/lib/ui/Input';
import { Select } from '@/lib/ui/Select';
import { signupAction, type SignupState } from './actions';
import '../auth-forms.css';

const businessTypes = [
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'private-limited', label: 'Private Limited' },
  { value: 'llp', label: 'LLP' },
  { value: 'other', label: 'Other' },
];

// Who the business sells to — distinct from the legal "Business type" above.
// Drives default contact type (B2B/B2C) and business-unit structure.
const businessModels = [
  { value: 'b2b', label: 'B2B — sell to businesses' },
  { value: 'b2c', label: 'B2C — sell to consumers' },
  { value: 'both', label: 'Both B2B & B2C' },
];

const initial: SignupState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initial);
  const [businessType, setBusinessType] = useState('proprietorship');
  const [businessModel, setBusinessModel] = useState('b2b');
  const [agree, setAgree] = useState(false);

  const showCin = businessType !== 'proprietorship';

  return (
    <AuthShell>
      <div className="crm-authform__brand-mobile">
        <span className="crm-auth__logo">TT</span>
        <span className="crm-auth__wordmark">TalkTrack</span>
      </div>

      <span className="crm-authform__trial">
        <Sparkles aria-hidden="true" style={{ width: 14, height: 14 }} /> 7-day free trial · no card required
      </span>

      <div className="crm-authform__header">
        <h1 className="crm-authform__title">Create your account</h1>
        <p className="crm-authform__sub">Tell us about your business to get started.</p>
      </div>

      <form action={formAction}>
        <div className="crm-authform__fields">
          <Input label="Business name" name="businessName" required placeholder="e.g. Northline Retail" />

          <div className="crm-authform__row2">
            <Select
              label="Business type"
              name="businessType"
              required
              options={businessTypes}
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            />
            <Select
              label="Business model"
              name="businessModel"
              required
              hint="Who you mostly sell to"
              options={businessModels}
              value={businessModel}
              onChange={(e) => setBusinessModel(e.target.value)}
            />
          </div>

          <div className="crm-authform__row2">
            <Input label="Business phone number" name="businessPhone" required leadingAddon="+91" placeholder="98110 20001" inputMode="tel" />
            <Input label="Business email" name="email" type="email" required placeholder="you@yourbusiness.com" />
          </div>

          <div className="crm-authform__row2">
            <Input label="GST number" name="gst" hint="Optional" placeholder="22AAAAA0000A1Z5" />
            {showCin ? (
              <Input label="CIN" name="cin" hint="Optional — company registration number" placeholder="U74999DL2020PTC000000" />
            ) : (
              <div className="crm-authform__cin-na">
                <span className="crm-field__label">CIN</span>
                <p className="crm-field__hint">Not applicable for a proprietorship.</p>
              </div>
            )}
          </div>

          <Input label="Password" name="password" type="password" required placeholder="Create a password" autoComplete="new-password" />
        </div>

        <label className="crm-authform__agree">
          <Checkbox label="agree" hideLabel checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            I agree to the <Link href="/terms" className="crm-authform__link">Terms</Link> and{' '}
            <Link href="/privacy" className="crm-authform__link">Privacy Policy</Link>.
          </span>
        </label>

        {state.error ? <p className="crm-authform__error">{state.error}</p> : null}

        <Button type="submit" variant="primary" fullWidth disabled={!agree || pending} className="crm-authform__submit">
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--crm-border-subtle, #e5e0d5)' }} />
        <span style={{ fontSize: 12, color: 'var(--crm-text-muted, #94a3b8)' }}>or sign up with</span>
        <span style={{ flex: 1, height: 1, background: 'var(--crm-border-subtle, #e5e0d5)' }} />
      </div>

      <a
        href="/api/auth/google/signin?mode=signup"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', boxSizing: 'border-box', padding: '11px 16px', borderRadius: 10, border: '1px solid #dadce0', background: '#fff', color: '#3c4043', fontSize: 14.5, fontWeight: 600, textDecoration: 'none' }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Continue with Google
      </a>

      <p className="crm-authform__footer" style={{ marginTop: 14 }}>
        <Link href="/signup/otp" className="crm-authform__link">Sign up with your mobile number (OTP)</Link>
      </p>

      <p className="crm-authform__footer">
        Already have an account? <Link href="/login" className="crm-authform__link">Log in</Link>
      </p>
    </AuthShell>
  );
}
