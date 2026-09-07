import Link from 'next/link';
import { redirect } from 'next/navigation';
import { destroySession, getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId: user.tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });

  async function logout() {
    'use server';
    await destroySession();
    redirect('/');
  }

  return (
    <main style={{ maxWidth: 720, margin: '64px auto', padding: '0 24px' }}>
      <p style={{ color: 'var(--crm-text-muted)', fontSize: 13, marginBottom: 4 }}>{user.tenant.businessName}</p>
      <h1 style={{ color: 'var(--crm-text-title)', fontSize: 28, marginBottom: 20 }}>Dashboard</h1>

      {account ? (
        <div style={card('var(--crm-green-border)', 'var(--crm-green-tint)')}>
          <div>
            <strong style={{ color: 'var(--crm-text-title)' }}>WhatsApp connected</strong>
            <p style={{ color: 'var(--crm-text-secondary)', margin: '4px 0 0' }}>
              {account.displayPhone ?? 'Your number'} is linked. Open the inbox to start messaging.
            </p>
          </div>
          <Link href="/inbox" style={btn(true)}>Open inbox</Link>
        </div>
      ) : (
        <div style={card('var(--crm-gold-border)', 'var(--crm-gold-tint)')}>
          <div>
            <strong style={{ color: 'var(--crm-text-title)' }}>Connect your WhatsApp number</strong>
            <p style={{ color: 'var(--crm-text-secondary)', margin: '4px 0 0' }}>
              Link your number to start receiving and replying to messages — keep your WhatsApp
              Business app, connect an existing account, or set up a new number.
            </p>
          </div>
          <Link href="/onboarding" style={btn(true)}>Connect WhatsApp</Link>
        </div>
      )}

      <p style={{ margin: '20px 0 4px', display: 'flex', gap: 16 }}>
        <Link href="/inbox" style={{ color: 'var(--crm-text-brand)', fontWeight: 600 }}>Inbox</Link>
        <Link href="/contacts" style={{ color: 'var(--crm-text-brand)', fontWeight: 600 }}>Contacts</Link>
        <Link href="/account" style={{ color: 'var(--crm-text-brand)', fontWeight: 600 }}>Account</Link>
      </p>
      <p style={{ color: 'var(--crm-text-muted)', fontSize: 13, margin: '8px 0 24px' }}>
        Signed in as {user.email}. The full CRM dashboard is ported in a later stage.
      </p>

      <form action={logout}>
        <button type="submit" style={btn(false)}>Log out</button>
      </form>
    </main>
  );
}

function card(border: string, bg: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    padding: '18px 20px',
    border: `1px solid ${border}`,
    background: bg,
    borderRadius: 12,
  };
}
function btn(primary: boolean): React.CSSProperties {
  return {
    padding: '10px 18px',
    borderRadius: 8,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    border: primary ? '1px solid var(--crm-green)' : '1px solid var(--crm-border-strong)',
    background: primary ? 'var(--crm-green)' : 'var(--crm-card)',
    color: primary ? '#fff' : 'var(--crm-text-primary)',
    cursor: 'pointer',
    textDecoration: 'none',
  };
}
