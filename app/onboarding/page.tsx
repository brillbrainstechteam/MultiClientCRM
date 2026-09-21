import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { isMetaConfigured, metaConfig } from '@/lib/meta/config';
import { AuthShell } from '@/lib/ui/AuthShell';
import { EmbeddedSignup } from './EmbeddedSignup';
import { ManualConnect } from './ManualConnect';
import { PinPrompt } from './PinPrompt';
import { OnboardingProgress } from './OnboardingProgress';
import './onboarding.css';

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ connect?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const { connect } = await searchParams;

  const onboarding = await prisma.onboardingSession.findUnique({ where: { tenantId: user.tenantId } });

  // A number that connected but still needs the client's 2-step PIN to register.
  const pendingPin = connect === 'pin'
    ? await prisma.whatsAppAccount.findFirst({
        where: { tenantId: user.tenantId, statusReason: 'registration_pending_pin' },
        orderBy: { connectedAt: 'desc' },
      })
    : null;

  const connected = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });

  // Access revoked on Facebook's side: say so plainly rather than showing a
  // bare connect screen that looks like nothing was ever set up.
  const needsReconnect = connected
    ? null
    : await prisma.whatsAppAccount.findFirst({
        where: { tenantId: user.tenantId, status: 'reconnect_required' },
        orderBy: { connectedAt: 'desc' },
      });

  return (
    <AuthShell>
      <div className="crm-authform__brand-mobile">
        <span className="crm-auth__logo">TT</span>
        <span className="crm-auth__wordmark">TalkTrack</span>
      </div>

      <div className="crm-authform__header">
        <h1 className="crm-authform__title">{connected ? 'Connect another number' : 'Connect WhatsApp'}</h1>
        <p className="crm-authform__sub">Choose how you want to link your number.</p>
      </div>

      {pendingPin?.phoneNumberId ? (
        <PinPrompt phoneNumberId={pendingPin.phoneNumberId} displayPhone={pendingPin.displayPhone} />
      ) : null}

      {!isMetaConfigured() ? (
        <div className="tt-onb">
          <div className="tt-onb__notice">
            <strong>Meta app not configured yet.</strong> Set <code>NEXT_PUBLIC_META_APP_ID</code> and{' '}
            <code>NEXT_PUBLIC_META_CONFIG_ID</code> in <code>.env</code> (see the README checklist) to
            enable Embedded Signup, then reload this page.
          </div>
          <Link href="/crm/dashboard" className="crm-authform__link" style={{ textAlign: 'center' }}>
            Skip for now →
          </Link>
        </div>
      ) : (
        <>
          {connected ? (
            <div
              className="tt-onb__notice"
              style={{ borderColor: 'var(--crm-green-border)', background: 'var(--crm-green-tint)', color: 'var(--crm-green-dark)', marginBottom: 18 }}
            >
              <strong>Connected.</strong> {connected.displayPhone ?? 'Your WhatsApp number'} is linked
              {connected.verifiedName ? ` as “${connected.verifiedName}”` : ''}.{' '}
              <Link href="/crm/dashboard" className="crm-authform__link">Go to dashboard →</Link>
              {' · '}Connect another number below.
            </div>
          ) : null}

          {needsReconnect ? (
            <div className="tt-onb__notice" style={{ marginBottom: 18 }}>
              {/* Raw Graph errors stay in statusReason for /diagnostics/whatsapp —
                  a client should never be shown Meta's token internals. */}
              <strong>Reconnect needed.</strong>{' '}
              The connection to {needsReconnect.displayPhone ?? 'your WhatsApp number'} was removed or has
              expired. Connect again below — your conversations and contacts are safe.
            </div>
          ) : null}

          {/*
            Embedded Signup is always available here (not hidden once a number is
            connected), so additional numbers can be added and the Facebook Login
            for Business flow stays reachable for demos and Meta App Review.
          */}
          {!connected && onboarding ? (
            <OnboardingProgress
              session={{
                status: onboarding.status,
                strategy: onboarding.strategy,
                lastStep: onboarding.lastStep,
                errorMessage: onboarding.errorMessage,
              }}
            />
          ) : null}

          <EmbeddedSignup
            appId={metaConfig.appId}
            configId={metaConfig.configId}
            graphVersion={metaConfig.graphVersion}
            coexistenceFeature={metaConfig.coexistenceFeature}
            initialStrategy={onboarding?.strategy ?? undefined}
          />
          <ManualConnect />
        </>
      )}
    </AuthShell>
  );
}
