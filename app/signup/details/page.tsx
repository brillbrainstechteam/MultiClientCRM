import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { PENDING_COOKIE, decodePending } from '@/lib/auth/pending-signup';
import { DetailsForm } from './DetailsForm';

/**
 * Business Details — step 2 of signup for Google/OTP. The verified identity is
 * read from the pending cookie; the owner fills in the business profile here.
 */
export default async function SignupDetailsPage() {
  const store = await cookies();
  const pending = decodePending(store.get(PENDING_COOKIE)?.value);
  if (!pending) redirect('/signup');

  const prefillPhone = pending.provider === 'otp' && pending.phone ? pending.phone.replace(/\D/g, '').slice(-10) : '';
  return (
    <DetailsForm
      provider={pending.provider}
      email={pending.provider === 'google' ? pending.email ?? '' : ''}
      phone={prefillPhone}
    />
  );
}
