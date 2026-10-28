import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { InviteForm } from './InviteForm';

export const metadata: Metadata = { title: 'Set your password', robots: { index: false, follow: false } };

/**
 * Public team-invite acceptance page. The member sets their own password here;
 * no admin-shared password needed.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const u = await prisma.user.findUnique({ where: { inviteToken: token }, select: { name: true, email: true, status: true, inviteExpiresAt: true } });
  const valid = u && u.status === 'invited' && (!u.inviteExpiresAt || u.inviteExpiresAt.getTime() >= Date.now());

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#faf7f2', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <div style={{ width: 'min(420px,100%)', background: '#fffdf9', border: '1px solid #ece2cf', borderRadius: 18, padding: '28px 24px' }}>
        <h1 style={{ margin: '0 0 4px', fontFamily: 'var(--font-fraunces), serif', fontSize: 24, color: '#2a2318' }}>TalkTrack</h1>
        {valid ? (
          <>
            <p style={{ color: '#6b6150', fontSize: 14.5, margin: '0 0 18px' }}>Welcome{u?.name ? `, ${u.name}` : ''} — set a password to activate your account ({u?.email}).</p>
            <InviteForm token={token} />
          </>
        ) : (
          <p style={{ color: '#c0392b', fontSize: 14.5, marginTop: 12 }}>This invite link is invalid or has expired. Ask your administrator to send a new one.</p>
        )}
      </div>
    </main>
  );
}
