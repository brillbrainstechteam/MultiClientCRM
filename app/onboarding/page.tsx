import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { isMetaConfigured, metaConfig } from '@/lib/meta/config';
import { AuthShell } from '@/lib/ui/AuthShell';
import { EmbeddedSignup } from './EmbeddedSignup';
import './onboarding.css';

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const connected = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });

  return (
    <AuthShell>
      <div className="crm-authform__brand-mobile">
        <span className="crm-auth__logo">TT</span>
        <span className="crm-auth__wordmark">TalkTrack</span>
      </div>

      <div className="crm-authform__header">
        <h1 className="crm-authform__title">Connect WhatsApp</h1>
        <p className="crm-authform__sub">
          Welcome, {user.tenant.businessName}. Link your WhatsApp Business number to start messaging.
        </p>
      </div>

      {connected ? (
        <div className="tt-onb">
          <div className="tt-onb__notice" style={{ borderColor: 'var(--crm-green-border)', background: 'var(--crm-green-tint)', color: 'var(--crm-green-dark)' }}>
            <strong>Connected.</strong> {connected.displayPhone ?? 'Your WhatsApp number'} is linked
            {connected.verifiedName ? ` as “${connected.verifiedName}”` : ''}.
          </div>
          <Link href="/dashboard" className="crm-authform__link" style={{ textAlign: 'center' }}>
            Go to dashboard →
          </Link>
        </div>
      ) : isMetaConfigured() ? (
        <EmbeddedSignup
          appId={metaConfig.appId}
          configId={metaConfig.configId}
          graphVersion={metaConfig.graphVersion}
          coexistenceFeature={metaConfig.coexistenceFeature}
        />
      ) : (
        <div className="tt-onb">
          <div className="tt-onb__notice">
            <strong>Meta app not configured yet.</strong> Set <code>NEXT_PUBLIC_META_APP_ID</code> and{' '}
            <code>NEXT_PUBLIC_META_CONFIG_ID</code> in <code>.env</code> (see the README checklist) to
            enable Embedded Signup, then reload this page.
          </div>
          <Link href="/dashboard" className="crm-authform__link" style={{ textAlign: 'center' }}>
            Skip for now →
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
