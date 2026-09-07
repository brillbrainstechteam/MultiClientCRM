import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSession } from '@crm/app/app-session';
import { Button, Checkbox, Input, Select } from '@crm/design-system';
import { AuthShell } from './AuthShell';

const businessTypes = [
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'private-limited', label: 'Private Limited' },
  { value: 'llp', label: 'LLP' },
  { value: 'other', label: 'Other' },
];

/**
 * Public signup screen. Collects account-level business details (name, type,
 * phone, email, optional GST/CIN). CIN is hidden for proprietorships (not
 * applicable in India). After signup the user lands on the not-connected
 * dashboard to connect their WhatsApp number. Mock auth only.
 */
export default function SignupScreen() {
  const navigate = useNavigate();
  const { setConnected, reset } = useAppSession();
  const [businessType, setBusinessType] = useState('proprietorship');
  const [agree, setAgree] = useState(false);

  const showCin = businessType !== 'proprietorship';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // A brand-new account starts on a fresh trial with no connected number →
    // land on the Dashboard zero state and go through onboarding to connect.
    reset();
    setConnected(false);
    navigate('/dashboard');
  };

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

      <form onSubmit={submit}>
        <div className="crm-authform__fields">
          <Input label="Business name" required placeholder="e.g. Northline Retail" />

          <Select
            label="Business type"
            required
            options={businessTypes}
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          />

          <div className="crm-authform__row2">
            <Input label="Business phone number" required leadingAddon="+91" placeholder="98110 20001" inputMode="tel" />
            <Input label="Business email" type="email" required placeholder="you@yourbusiness.com" />
          </div>

          <div className="crm-authform__row2">
            <Input label="GST number" hint="Optional" placeholder="22AAAAA0000A1Z5" />
            {showCin ? (
              <Input label="CIN" hint="Optional — company registration number" placeholder="U74999DL2020PTC000000" />
            ) : (
              <div className="crm-authform__cin-na">
                <span className="crm-field__label">CIN</span>
                <p className="crm-field__hint">Not applicable for a proprietorship.</p>
              </div>
            )}
          </div>

          <Input label="Password" type="password" required placeholder="Create a password" autoComplete="new-password" />
        </div>

        <label className="crm-authform__agree" style={{ display: 'flex', gap: 'var(--crm-space-2)', alignItems: 'flex-start' }}>
          <Checkbox label="agree" hideLabel checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            I agree to the <Link to="/terms" className="crm-authform__link">Terms</Link> and{' '}
            <Link to="/privacy" className="crm-authform__link">Privacy Policy</Link>.
          </span>
        </label>

        <Button type="submit" variant="primary" fullWidth disabled={!agree} className="crm-authform__submit">
          Create account
        </Button>
      </form>

      <p className="crm-authform__footer">
        Already have an account? <Link to="/login" className="crm-authform__link">Log in</Link>
      </p>
    </AuthShell>
  );
}
