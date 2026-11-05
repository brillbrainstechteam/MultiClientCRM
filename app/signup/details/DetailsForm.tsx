'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/lib/ui/AuthShell';
import { Button } from '@/lib/ui/Button';
import { Checkbox } from '@/lib/ui/Checkbox';
import { Input } from '@/lib/ui/Input';
import { Select } from '@/lib/ui/Select';
import { completeSignupAction, type DetailsState } from './actions';
import '../../auth-forms.css';

const businessTypes = [
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'private-limited', label: 'Private Limited' },
  { value: 'llp', label: 'LLP' },
  { value: 'other', label: 'Other' },
];
const businessModels = [
  { value: 'b2b', label: 'B2B — sell to businesses' },
  { value: 'b2c', label: 'B2C — sell to consumers' },
  { value: 'both', label: 'Both B2B & B2C' },
];

const initial: DetailsState = {};

export function DetailsForm({ provider, email, phone }: { provider: 'google' | 'otp'; email: string; phone: string }) {
  const [state, formAction, pending] = useActionState(completeSignupAction, initial);
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

      <div className="crm-authform__header">
        <h1 className="crm-authform__title">Tell us about your business</h1>
        <p className="crm-authform__sub">
          {provider === 'google' ? `Signed in as ${email}. ` : `Mobile ${phone} verified. `}
          A few details and you’re in.
        </p>
      </div>

      <form action={formAction}>
        <div className="crm-authform__fields">
          <Input label="Business name" name="businessName" required placeholder="e.g. Northline Retail" />

          <div className="crm-authform__row2">
            <Select label="Business type" name="businessType" required options={businessTypes} value={businessType} onChange={(e) => setBusinessType(e.target.value)} />
            <Select label="Business model" name="businessModel" required hint="Who you mostly sell to" options={businessModels} value={businessModel} onChange={(e) => setBusinessModel(e.target.value)} />
          </div>

          <div className="crm-authform__row2">
            <Input label="Business phone number" name="businessPhone" required leadingAddon="+91" placeholder="98110 20001" inputMode="tel" defaultValue={phone} />
            {provider === 'google' ? (
              <Input label="Business email" name="email" type="email" defaultValue={email} readOnly hint="From your Google account" />
            ) : (
              <Input label="Business email" name="email" type="email" required placeholder="you@yourbusiness.com" />
            )}
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
    </AuthShell>
  );
}
