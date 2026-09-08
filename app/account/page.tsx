import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { AuthShell } from '@/lib/ui/AuthShell';
import { ChangePasswordForm } from './ChangePasswordForm';
import '../auth-forms.css';

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <AuthShell>
      <div className="crm-authform__brand-mobile">
        <span className="crm-auth__logo">TT</span>
        <span className="crm-auth__wordmark">TalkTrack</span>
      </div>

      <div className="crm-authform__header">
        <h1 className="crm-authform__title">Account settings</h1>
        <p className="crm-authform__sub">
          Signed in as {user.email}. Change your password below.
        </p>
      </div>

      <ChangePasswordForm />

      <p className="crm-authform__footer">
        <Link href="/crm/dashboard" className="crm-authform__link">← Back to dashboard</Link>
      </p>
    </AuthShell>
  );
}
